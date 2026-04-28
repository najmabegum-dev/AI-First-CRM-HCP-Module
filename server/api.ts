import { Router } from "express";
import db from "./db.js";
import agentApp from "./agent.js";
import { HumanMessage } from "@langchain/core/messages";

const router = Router();


// /api/auth/login
router.post("/auth/login", (req, res) => {
    // mock jwt
    res.json({ token: "mock_jwt_token_123", user: { id: 1, email: req.body.email, role: "field_rep" } });
});

// /api/hcps
router.get("/hcps", (req, res) => {
    const q = req.query.q as string;
    let query = 'SELECT * FROM hcps';
    let params: any[] = [];
    if (q) {
        query += ' WHERE name LIKE ? OR specialty LIKE ?';
        params = [`%${q}%`, `%${q}%`];
    }
    const hcps = db.prepare(query).all(...params);
    res.json(hcps);
});

// /api/interactions
router.get("/interactions", (req, res) => {
    const interactions = db.prepare('SELECT * FROM interactions ORDER BY created_at DESC').all();
    res.json(interactions);
});

router.post("/interactions", (req, res) => {
    // Implement direct insert logic if manually submitted
    const data = req.body;
    try {
        const stmt = db.prepare(`
            INSERT INTO interactions (user_id, hcp_id, interaction_type, interaction_date, interaction_time, attendees, topics_discussed, materials_shared, samples_distributed, sentiment, outcomes, follow_up_actions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
            1, // mock user_id
            data.hcp_id,
            data.interaction_type || "Meeting",
            data.date,
            data.time,
            JSON.stringify(data.attendees || []),
            data.topics_discussed,
            JSON.stringify(data.materials_shared || []),
            JSON.stringify(data.samples_distributed || []),
            data.sentiment || "Positive",
            data.outcomes || "",
            JSON.stringify(data.follow_up_actions || [])
        );
        res.json({ id: result.lastInsertRowid, ...data });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// /api/agent/process
router.post("/agent/process", async (req, res) => {
    try {
        const { message, current_form_data, conversation_history } = req.body;
        
        let messagesContext = [];
        if (conversation_history && conversation_history.length > 0) {
            // Reconstruct minimal history if desired
        }
        
        // Ensure user message is passed
        const finalState = await agentApp.invoke({
            messages: [new HumanMessage(message)],
            user_input: message
        });


        res.json({
            success: true,
            intent: finalState.intent || "log_interaction",
            extracted_entities: finalState.extracted_entities || {},
            form_updates: finalState.form_updates || {},
            follow_up_suggestions: finalState.form_updates?.follow_up_actions || [],
            confirmation_message: finalState.response || "Done.",
            response_message: finalState.response || "I processed your request."
        });
    } catch (e: any) {
        console.error("Agent process error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

router.post("/voice/summarize", (req, res) => {
   // In a real app, this would process audio and return text using Whisper API
   res.json({ summary: "Pretend voice summary: Dr. Smith was interested in the new drug efficacy." });
});

export default router;
