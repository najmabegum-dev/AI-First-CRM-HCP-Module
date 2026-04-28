import { StateGraph, Annotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import db from "./db.js";

// We will try Groq first, fallback to Gemini
let llm: any = null;
try {
  if (process.env.GROQ_API_KEY) {
    const { ChatGroq } = await import("@langchain/groq");
    llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });
    console.log("Using ChatGroq LLM");
  } else if (process.env.GEMINI_API_KEY) {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-pro",
      temperature: 0,
    });
    console.log("Using ChatGoogleGenAI LLM as fallback");
  } else {
    throw new Error("No API key available. Please configure GROQ_API_KEY or GEMINI_API_KEY.");
  }
} catch (error) {
  // Graceful fallback to avoid crash if module is absent or key missing
  llm = {
    withStructuredOutput: (schema: any, config?: any) => ({
      invoke: async () => ({ sentiment: "Positive", score: 0.9, reasoning: "Fallback mock", actions: ["Review demo"] }),
    }),
    bindTools: () => ({
      invoke: async (msgs: any[]) => new AIMessage({ content: "Simulation mode active. Configure GROQ_API_KEY." })
    })
  };
  console.error("Failed to initialize LLM", error);
}


// ------------------------------------
// STATE DEFINITION
// ------------------------------------
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  user_input: Annotation<string>(),
  intent: Annotation<string>(),
  extracted_entities: Annotation<any>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  validated: Annotation<boolean>(),
  db_record: Annotation<any>(),
  response: Annotation<string>(),
  form_updates: Annotation<any>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

export type AgentState = typeof StateAnnotation.State;

// ------------------------------------
// TOOLS
// ------------------------------------

const getHcpId = (name: string) => {
    const res: any = db.prepare('SELECT id FROM hcps WHERE name LIKE ?').get(`%${name}%`);
    return res ? res.id : null;
};

// Tool 1: log_interaction
export const logInteractionTool = tool(
  async ({ hcp_name, interaction_type, interaction_date, interaction_time, attendees, topics_discussed, materials_shared, samples_distributed, sentiment }) => {
    try {
      const hcp_id = getHcpId(hcp_name);
      
      const st = db.prepare(`
        INSERT INTO interactions (user_id, hcp_id, interaction_type, interaction_date, interaction_time, attendees, topics_discussed, materials_shared, samples_distributed, sentiment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = st.run(
        1, // mock user_id
        hcp_id,
        interaction_type || "Meeting",
        interaction_date,
        interaction_time || "12:00 PM",
        JSON.stringify(attendees || []),
        topics_discussed,
        JSON.stringify(materials_shared || []),
        JSON.stringify(samples_distributed || []),
        sentiment || "Positive"
      );
      
      return JSON.stringify({ success: true, record_id: result.lastInsertRowid, message: "Interaction logged successfully." });
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e.message });
    }
  },
  {
    name: "log_interaction",
    description: "Capture and save a new interaction to the database.",
    schema: z.object({
      hcp_name: z.string().describe("Name of the HCP (doctor) met."),
      topics_discussed: z.string().describe("Summary of topics discussed."),
      interaction_type: z.string().optional().describe("Type of meeting, eg., Meeting, Call."),
      interaction_date: z.string().optional().describe("Date of meeting format YYYY-MM-DD."),
      interaction_time: z.string().optional().describe("Time of meeting format HH:MM AM/PM."),
      attendees: z.array(z.string()).optional(),
      materials_shared: z.array(z.string()).optional(),
      samples_distributed: z.array(z.string()).optional(),
      sentiment: z.string().describe("Can be Positive, Neutral, or Negative").optional(),
    }),
  }
);

// Tool 2: edit_interaction
export const editInteractionTool = tool(
  async ({ id, updates }) => {
    try {
      let querySets = [];
      let params = [];
      for (const [k, v] of Object.entries(updates)) {
        querySets.push(`${k} = ?`);
        params.push(typeof v === 'object' ? JSON.stringify(v) : v);
      }
      if (querySets.length === 0) return JSON.stringify({ success: false, error: "No fields to update" });
      
      params.push(id);
      db.prepare(`UPDATE interactions SET ${querySets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
      
      return JSON.stringify({ success: true, record_id: id, message: "Interaction updated successfully." });
    } catch (e: any) {
      return JSON.stringify({ success: false, error: e.message });
    }
  },
  {
    name: "edit_interaction",
    description: "Allow modification of previously logged interaction data.",
    schema: z.object({
      id: z.number().describe("The ID of the interaction record."),
      updates: z.any().describe("Object containing key-value pairs of fields to update."),
    }),
  }
);

// Tool 3: analyze_sentiment
export const analyzeSentimentTool = tool(
  async ({ text }) => {
    const sentimentLlm = llm.withStructuredOutput(
      z.object({
        sentiment: z.string().describe("Must be exactly Positive, Neutral, or Negative"),
        score: z.number().describe("Confidence score 0.0 to 1.0"),
        reasoning: z.string()
      }),
      { name: "sentiment_output" }
    );
    const res = await sentimentLlm.invoke(`Analyze the sentiment of this interaction summary from the HCP's perspective: ${text}`);
    return JSON.stringify(res);
  },
  {
    name: "analyze_sentiment",
    description: "Determine the HCP's attitude from the conversation text.",
    schema: z.object({
      text: z.string().describe("The text or summary of the interaction."),
    }),
  }
);

// Tool 4: suggest_followup
export const suggestFollowupTool = tool(
  async ({ topics, materials, sentiment }) => {
    const followupLlm = llm.withStructuredOutput(
      z.object({
        actions: z.array(z.string()).describe("List of suggested follow-up actions.")
      }),
      { name: "followup_output" }
    );
    const res = await followupLlm.invoke(`Suggest 2-3 specific, actionable follow-up actions for a sales rep based on: Topics: ${topics}, Materials: ${materials}, Sentiment: ${sentiment}`);
    return JSON.stringify(res);
  },
  {
    name: "suggest_followup",
    description: "Recommend next actions based on the interaction content.",
    schema: z.object({
      topics: z.string(),
      materials: z.string().optional(),
      sentiment: z.string().optional(),
    }),
  }
);

// Tool 5: search_hcp
export const searchHcpTool = tool(
  async ({ query }) => {
    const rows = db.prepare('SELECT * FROM hcps WHERE name LIKE ? OR specialty LIKE ? OR hospital LIKE ? OR location LIKE ? LIMIT 5')
                   .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    return JSON.stringify(rows);
  },
  {
    name: "search_hcp",
    description: "Find healthcare professionals in the database.",
    schema: z.object({
      query: z.string().describe("Search query for name, specialty, or location."),
    }),
  }
);

const tools = [logInteractionTool, editInteractionTool, analyzeSentimentTool, suggestFollowupTool, searchHcpTool];

// ------------------------------------
// NODE FUNCTIONS
// ------------------------------------

async function extractEntities(state: AgentState) {
  const llmWithTools = llm.bindTools(tools);
  const sysMsg = new SystemMessage("You are an AI assistant designed to extract structure and help a sales representative log HCP interactions. Use the appropriate tool when necessary such as log_interaction, suggest_followup, etc. If the user asks to log an interaction, extract the details and call the log_interaction tool.");
  
  const response = await llmWithTools.invoke([sysMsg, ...state.messages]);

  
  let formUpdates = {};
  let extractedEntities = {};
  if (response.tool_calls && response.tool_calls.length > 0) {
      // Simulate form updates with the params intended for log_interaction
      const logCall = response.tool_calls.find((c: any) => c.name === "log_interaction");
      if (logCall) {
          formUpdates = {
              hcp_name: logCall.args.hcp_name,
              interaction_type: logCall.args.interaction_type || "Meeting",
              date: logCall.args.interaction_date || new Date().toISOString().split('T')[0],
              time: logCall.args.interaction_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
              topics_discussed: logCall.args.topics_discussed || "",
              sentiment: logCall.args.sentiment || "Positive",
              materials_shared: logCall.args.materials_shared || []
          };
          extractedEntities = logCall.args;
      }
  }

  return { messages: [response], form_updates: formUpdates, extracted_entities: extractedEntities };
}

async function executeTools(state: AgentState) {
  const message = state.messages[state.messages.length - 1];
  const results = [];
  
  if ((message as AIMessage).tool_calls?.length) {
    for (const toolCall of (message as AIMessage).tool_calls!) {

      const selectedTool = tools.find((t) => t.name === toolCall.name);
      if (selectedTool) {
        const resultMessage = await (selectedTool as any).invoke(toolCall);
        results.push(resultMessage);
      }
    }
  }
  
  return { messages: results };
}

async function generateResponse(state: AgentState) {
    if (state.form_updates && Object.keys(state.form_updates).length > 0) {
        return { response: "✅ **Interaction logged successfully!** The details (HCP Name, Date, Sentiment, and Materials) have been automatically populated based on your summary. Would you like me to suggest a specific follow-up action, such as scheduling a meeting?" };
    }
    
    // Default reply if no specific form updates
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && lastMessage._getType() === "ai") {
        return { response: lastMessage.content || "I've processed your request." };
    }
    
    return { response: "I'm not sure how to help with that." };
}

// ------------------------------------
// GRAPH CONSTRUCTION
// ------------------------------------

function shouldContinue(state: AgentState) {
  const lastMessage = state.messages[state.messages.length - 1];
  if ((lastMessage as AIMessage).tool_calls?.length) {
    return "execute_tools";
  }
  return "generate_response";
}


const workflow = new StateGraph(StateAnnotation)
  .addNode("extract_entities", extractEntities)
  .addNode("execute_tools", executeTools)
  .addNode("generate_response", generateResponse)
  
  .addEdge("__start__", "extract_entities")
  .addConditionalEdges("extract_entities", shouldContinue, {
      execute_tools: "execute_tools",
      generate_response: "generate_response"
  })
  .addEdge("execute_tools", "generate_response") // For simplicity, loop back or end. Let's just go to response after tools.
  .addEdge("generate_response", "__end__");

export const agentApp = workflow.compile();

export default agentApp;
