import os
import json
from typing import Optional, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from langchain_core.messages import HumanMessage

from db import engine, init_db
from agent import agent_app

app = FastAPI(title="AI-First CRM — HCP Module", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialised")


# ------------------------------------
# AUTH
# ------------------------------------

class LoginBody(BaseModel):
    email: str
    password: str = ""


@app.post("/api/auth/login")
def login(body: LoginBody):
    return {
        "token": "mock_jwt_token_123",
        "user": {"id": 1, "email": body.email, "role": "field_rep"},
    }


# ------------------------------------
# HCPs
# ------------------------------------

@app.get("/api/hcps")
def get_hcps(q: Optional[str] = Query(None)):
    with engine.connect() as conn:
        if q:
            rows = conn.execute(
                text("SELECT * FROM hcps WHERE name LIKE :q OR specialty LIKE :q"),
                {"q": f"%{q}%"},
            ).fetchall()
        else:
            rows = conn.execute(text("SELECT * FROM hcps")).fetchall()
    return [dict(r._mapping) for r in rows]


# ------------------------------------
# INTERACTIONS
# ------------------------------------

@app.get("/api/interactions")
def get_interactions():
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT * FROM interactions ORDER BY created_at DESC")
        ).fetchall()
    return [dict(r._mapping) for r in rows]


class InteractionBody(BaseModel):
    hcp_id: Optional[int] = None
    interaction_type: str = "Meeting"
    date: str = ""
    time: str = ""
    attendees: list = []
    topics_discussed: str = ""
    materials_shared: list = []
    samples_distributed: list = []
    sentiment: str = "Positive"
    outcomes: str = ""
    follow_up_actions: list = []


@app.post("/api/interactions")
def create_interaction(body: InteractionBody):
    now = datetime.now()
    if not body.date:
        body.date = now.strftime("%Y-%m-%d")
    if not body.time:
        body.time = now.strftime("%H:%M")

    with engine.connect() as conn:
        result = conn.execute(text("""
            INSERT INTO interactions
            (user_id, hcp_id, interaction_type, interaction_date, interaction_time,
             attendees, topics_discussed, materials_shared, samples_distributed,
             sentiment, outcomes, follow_up_actions)
            VALUES (1, :hcp_id, :itype, :idate, :itime,
                    :attendees, :topics, :materials, :samples,
                    :sentiment, :outcomes, :followup)
        """), {
            "hcp_id":    body.hcp_id,
            "itype":     body.interaction_type,
            "idate":     body.date,
            "itime":     body.time,
            "attendees": json.dumps(body.attendees),
            "topics":    body.topics_discussed,
            "materials": json.dumps(body.materials_shared),
            "samples":   json.dumps(body.samples_distributed),
            "sentiment": body.sentiment,
            "outcomes":  body.outcomes,
            "followup":  json.dumps(body.follow_up_actions),
        })
        conn.commit()
        new_id = result.lastrowid
    return {"id": new_id, **body.model_dump()}


# ------------------------------------
# AGENT
# ------------------------------------

class AgentBody(BaseModel):
    message: str
    current_form_data: dict = {}
    conversation_history: list = []


@app.post("/api/agent/process")
async def agent_process(body: AgentBody):
    try:
        final_state = agent_app.invoke({
            "messages":          [HumanMessage(content=body.message)],
            "user_input":        body.message,
            "extracted_entities": {},
            "form_updates":      {},
            "response":          "",
        }, config={"configurable": {"thread_id": "default_user_session"}})
        return {
            "success":              True,
            "intent":               "log_interaction",
            "extracted_entities":   final_state.get("extracted_entities", {}),
            "form_updates":         final_state.get("form_updates", {}),
            "follow_up_suggestions": final_state.get("form_updates", {}).get("follow_up_actions", []),
            "confirmation_message": final_state.get("response", "Done."),
            "response_message":     final_state.get("response", "I processed your request."),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------
# VOICE
# ------------------------------------

@app.post("/api/voice/summarize")
def voice_summarize():
    return {"summary": "Pretend voice summary: Dr. Smith was interested in the new drug efficacy."}
