import os
import json
import re
from datetime import datetime
from typing import Annotated, Any
from typing_extensions import TypedDict
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from langchain_core.messages import BaseMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from sqlalchemy import text
from db import engine, get_hcp_id

# ------------------------------------
# LLM INITIALISATION — gemma2-9b-it (primary) / Gemini (fallback)
# ------------------------------------
llm = None
try:
    if os.getenv("GROQ_API_KEY"):
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.3-70b-versatile",
            temperature=0,
        )
        print("Using ChatGroq — llama-3.3-70b-versatile")
    elif os.getenv("GEMINI_API_KEY"):
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            google_api_key=os.getenv("GEMINI_API_KEY"),
            model="gemini-2.5-pro",
            temperature=0,
        )
        print("Using Gemini 2.5 Pro as fallback")
    else:
        raise ValueError("No API key found. Set GROQ_API_KEY or GEMINI_API_KEY.")
except Exception as e:
    print(f"Failed to initialise LLM: {e}")
    llm = None


# ------------------------------------
# TOOLS (5)
# ------------------------------------

@tool
def log_interaction(
    hcp_name: str,
    topics_discussed: str,
    interaction_type: str = "Meeting",
    interaction_date: str = "",
    interaction_time: str = "12:00",
    attendees: list = [],
    materials_shared: list = [],
    samples_distributed: list = [],
    sentiment: str = "Positive",
) -> str:
    """Capture and save a new HCP interaction to the database."""
    try:
        from db import DATABASE_URL
        is_pg = DATABASE_URL.startswith("postgres")
        hcp_id = get_hcp_id(hcp_name)
        print(f"[LOG_INTERACTION] hcp_name={hcp_name}, hcp_id={hcp_id}, date={interaction_date}, time={interaction_time}")
        
        sql = """
            INSERT INTO interactions
            (user_id, hcp_id, interaction_type, interaction_date, interaction_time,
             attendees, topics_discussed, materials_shared, samples_distributed, sentiment)
            VALUES (1, :hcp_id, :itype, :idate, :itime,
                    :attendees, :topics, :materials, :samples, :sentiment)
        """
        if is_pg:
            sql += " RETURNING id"
        
        params = {
            "hcp_id": hcp_id,
            "itype": interaction_type,
            "idate": interaction_date,
            "itime": interaction_time,
            "attendees": json.dumps(attendees),
            "topics": topics_discussed,
            "materials": json.dumps(materials_shared),
            "samples": json.dumps(samples_distributed),
            "sentiment": sentiment,
        }
        
        with engine.connect() as conn:
            result = conn.execute(text(sql), params)
            if is_pg:
                new_id = result.fetchone()[0]
            else:
                new_id = result.lastrowid
            conn.commit()
        print(f"[LOG_INTERACTION] SUCCESS — interaction_id={new_id}")
        return json.dumps({"success": True, "interaction_id": new_id, "message": f"Interaction {new_id} logged successfully."})
    except Exception as e:
        print(f"[LOG_INTERACTION] ERROR: {e}")
        return json.dumps({"success": False, "error": str(e)})


@tool
def edit_interaction(id: int, updates: dict) -> str:
    """Modify a previously logged HCP interaction record by its ID. ALWAYS ensure time is formatted in 24-hour HH:MM format."""
    try:
        db_updates = updates.copy()
        # Map frontend/AI aliases to exact database schema columns
        aliases = {
            "hcp_name": "hcp_id",
            "date": "interaction_date",
            "time": "interaction_time",
            "type": "interaction_type",
            "materials": "materials_shared",
            "samples": "samples_distributed",
            "topics": "topics_discussed",
            "follow_up": "follow_up_actions",
            "followup": "follow_up_actions",
        }
        
        for alias, real_key in aliases.items():
            if alias in db_updates:
                val = db_updates.pop(alias)
                if alias == "hcp_name":
                    val = get_hcp_id(val)
                db_updates[real_key] = val
                
        if not db_updates:
            return json.dumps({"success": False, "error": "No valid fields provided to update."})
        set_clauses = ", ".join([f"{k} = :{k}" for k in db_updates.keys()])
        params = {
            k: (json.dumps(v) if isinstance(v, (list, dict)) else v)
            for k, v in db_updates.items()
        }
        params["id"] = id
        with engine.connect() as conn:
            conn.execute(
                text(f"UPDATE interactions SET {set_clauses}, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
                params,
            )
            conn.commit()
        return json.dumps({"success": True, "record_id": id, "message": "Interaction updated successfully."})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})


@tool
def analyze_sentiment(text_input: str) -> str:
    """Determine the HCP's sentiment (Positive/Neutral/Negative) from interaction text."""
    try:
        if llm is None:
            return json.dumps({"sentiment": "Positive", "score": 0.9, "reasoning": "Fallback mock"})
        prompt = (
            "Analyze the sentiment from the HCP's perspective. "
            "Reply ONLY with valid JSON in this exact format: "
            '{"sentiment": "Positive", "score": 0.9, "reasoning": "brief reason"}. '
            f"Text: {text_input}"
        )
        response = llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return match.group(0)
        return json.dumps({"sentiment": "Positive", "score": 0.8, "reasoning": content[:120]})
    except Exception as e:
        return json.dumps({"sentiment": "Positive", "score": 0.8, "reasoning": f"Error: {str(e)}"})


@tool
def suggest_followup(topics: str, materials: str = "", sentiment: str = "Positive") -> str:
    """Recommend 2–3 specific follow-up actions based on the HCP interaction."""
    try:
        if llm is None:
            return json.dumps({"actions": ["Schedule follow-up meeting", "Send product brochure", "Check in next week"]})
        prompt = (
            "Suggest 2-3 specific, actionable follow-up actions for a pharma sales rep. "
            'Reply ONLY with valid JSON: {"actions": ["action1", "action2", "action3"]}. '
            f"Topics: {topics}, Materials: {materials}, Sentiment: {sentiment}"
        )
        response = llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return match.group(0)
        return json.dumps({"actions": ["Schedule follow-up meeting", "Send materials", "Review outcomes"]})
    except Exception as e:
        return json.dumps({"actions": ["Schedule follow-up", "Send materials", "Check in"], "error": str(e)})


@tool
def search_hcp(query: str) -> str:
    """Find healthcare professionals by name, specialty, hospital, or location."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT * FROM hcps "
                "WHERE name LIKE :q OR specialty LIKE :q OR hospital LIKE :q OR location LIKE :q "
                "LIMIT 5"
            ), {"q": f"%{query}%"}).fetchall()
        # Use a default converter to handle datetime/Decimal from PostgreSQL
        return json.dumps(
            [dict(r._mapping) for r in rows],
            default=str
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


tools = [log_interaction, edit_interaction, analyze_sentiment, suggest_followup, search_hcp]


# ------------------------------------
# AGENT STATE
# ------------------------------------

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_input: str
    extracted_entities: dict
    form_updates: dict
    response: str


# ------------------------------------
# GRAPH NODES
# ------------------------------------

def extract_entities(state: AgentState) -> dict:
    if llm is None:
        return {
            "messages": [AIMessage(content="AI not configured. Please set GROQ_API_KEY.")],
            "form_updates": {},
            "extracted_entities": {},
        }

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    llm_with_tools = llm.bind_tools(tools)
    system = SystemMessage(content=(
        f"You are an AI assistant helping pharma field reps. The current date and time is {current_time}. "
        "Available tools: log_interaction (save interactions), edit_interaction (modify records), "
        "analyze_sentiment (tone analysis), suggest_followup (next steps), search_hcp (find doctors). "
        "When the user describes a meeting or interaction, extract all details and call log_interaction. "
        "Format dates as YYYY-MM-DD and times as HH:MM in 24-hour format. If date or time is not mentioned, use the current date and time. "
        "If the user corrects a detail (e.g., 'it was Dr. X' or 'change sentiment to Neutral'), use edit_interaction on the most recently logged interaction ID from your tool output history. "
        "For other requests like searching doctors, analyzing sentiment, or suggesting follow-ups, call the appropriate tool."
    ))

    response = llm_with_tools.invoke([system] + state["messages"])

    form_updates: dict = {}
    extracted_entities: dict = {}

    if hasattr(response, "tool_calls") and response.tool_calls:
        log_call = next((c for c in response.tool_calls if c["name"] == "log_interaction"), None)
        edit_call = next((c for c in response.tool_calls if c["name"] == "edit_interaction"), None)
        
        if log_call:
            args = log_call["args"]
            form_updates = {
                "hcp_name":          args.get("hcp_name", ""),
                "interaction_type":  args.get("interaction_type", "Meeting"),
                "date":              args.get("interaction_date", ""),
                "time":              args.get("interaction_time", ""),
                "topics_discussed":  args.get("topics_discussed", ""),
                "sentiment":         args.get("sentiment", "Positive"),
                "materials_shared":  args.get("materials_shared", []),
                "_is_new_log":       True
            }
            extracted_entities = args
        elif edit_call:
            updates = edit_call["args"].get("updates", {})
            frontend_aliases = {
                "type": "interaction_type",
                "materials": "materials_shared",
                "samples": "samples_distributed",
                "topics": "topics_discussed",
                "follow_up": "follow_up_actions",
                "followup": "follow_up_actions",
                "interaction_time": "time",
                "interaction_date": "date",
                "hcp_id": "hcp_name", # Just in case the AI provides hcp_id instead of hcp_name
            }
            for k, v in updates.items():
                form_updates[frontend_aliases.get(k, k)] = v
            extracted_entities = updates

    return {"messages": [response], "form_updates": form_updates, "extracted_entities": extracted_entities}


def execute_tools(state: AgentState) -> dict:
    last_message = state["messages"][-1]
    results = []

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        tool_map = {t.name: t for t in tools}
        for tc in last_message.tool_calls:
            fn = tool_map.get(tc["name"])
            if fn:
                try:
                    result = fn.invoke(tc["args"])
                    results.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                except Exception as e:
                    results.append(ToolMessage(content=json.dumps({"error": str(e)}), tool_call_id=tc["id"]))

    return {"messages": results}


def generate_response(state: AgentState) -> dict:
    form_updates = state.get("form_updates", {}).copy()
    is_new = form_updates.pop("_is_new_log", False)
    has_edits = bool(form_updates)  # True if edit_interaction produced updates
    
    if is_new:
        return {
            "form_updates": form_updates,
            "response": (
                "**Interaction logged successfully!** "
                "The details (HCP Name, Date, Sentiment, and Materials) have been automatically "
                "populated based on your summary. Would you like me to suggest a specific follow-up action, "
                "such as scheduling a meeting?"
            )
        }
    
    # For edit_interaction: build response text from AI, but ALWAYS pass form_updates through
    response_text = ""
    last = state["messages"][-1]
    if isinstance(last, AIMessage):
        response_text = last.content or "I've processed your request."
    elif llm is not None:
        final_response = llm.invoke(state["messages"])
        response_text = final_response.content or "Done."
        return {"response": response_text, "form_updates": form_updates, "messages": [final_response]}
    else:
        response_text = "I'm not sure how to help with that. Try describing an HCP interaction to log it."

    result = {"response": response_text}
    if has_edits:
        result["form_updates"] = form_updates
    return result


def should_continue(state: AgentState) -> str:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "execute_tools"
    return "generate_response"


# ------------------------------------
# GRAPH CONSTRUCTION
# ------------------------------------

workflow = StateGraph(AgentState)
workflow.add_node("extract_entities", extract_entities)
workflow.add_node("execute_tools", execute_tools)
workflow.add_node("generate_response", generate_response)

workflow.set_entry_point("extract_entities")
workflow.add_conditional_edges("extract_entities", should_continue, {
    "execute_tools": "execute_tools",
    "generate_response": "generate_response",
})
workflow.add_edge("execute_tools", "generate_response")
workflow.add_edge("generate_response", END)

memory = MemorySaver()
agent_app = workflow.compile(checkpointer=memory)
