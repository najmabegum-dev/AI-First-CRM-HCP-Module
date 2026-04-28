# 🧬 AI-First CRM: Healthcare Professional (HCP) Module

[![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-FF9900?style=for-the-badge&logo=langchain)](https://python.langchain.com/docs/langgraph/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

A next-generation, AI-first Customer Relationship Management (CRM) system designed specifically for life science experts and pharmaceutical field representatives. 

This module revolutionizes how field reps log interactions with Healthcare Professionals (HCPs). Instead of manually navigating complex forms, reps can utilize a **conversational chat interface** powered by an autonomous LangGraph AI agent. The AI dynamically extracts clinical entities, maps them to the structured CRM schema, and automatically updates the database and UI in real-time.

---

## ✨ Key Features

- **Dual-Input Architecture:** Seamlessly switch between a traditional structured form and an intelligent conversational chat interface. Both inputs are perfectly synchronized via Redux state management.
- **Autonomous Entity Extraction:** The AI extracts critical life-science data points from natural language (HCP Name, Date, Topics Discussed, Samples Distributed, Materials Shared, and Sentiment).
- **Intelligent Alias Mapping:** The AI understands conversational shorthand (e.g., "materials") and maps them strictly to backend database columns (e.g., `materials_shared`).
- **Conversational Memory:** Built with LangGraph's `MemorySaver`, allowing the agent to maintain context across a multi-turn conversation. (e.g., *"Wait, the doctor was Dr. Ren, not Dr. Smith"* automatically updates the prior database record).

## 🧠 LangGraph Agent Tools

The AI agent is equipped with five distinct determinist tools tailored for life-science sales activities:

1. **`log_interaction`**: Ingests raw interaction summaries, strictly validates extracted entities, dynamically resolves HCP names to database IDs, and inserts the record into PostgreSQL.
2. **`edit_interaction`**: Modifies existing records based on conversational corrections, utilizing reverse-alias mapping to ensure the React UI instantly reflects database column changes.
3. **`analyze_sentiment`**: Evaluates the qualitative tone (Positive, Neutral, Negative) of the clinical discussion based on the doctor's reception to efficacy data.
4. **`suggest_followup`**: An advisory engine that analyzes the discussion topics to recommend actionable next steps (e.g., "Schedule a meeting to review Phase 3 data").
5. **`search_hcp`**: A directory lookup tool allowing reps to query doctors by specialty or territory directly within the chat.

---

## 🏗️ Technology Stack

**Frontend**
- React 18
- Vite
- Redux Toolkit (State management & synchronization)
- Tailwind CSS (Google Inter typography)
- Lucide React (Iconography)

**Backend**
- Python 3.12
- FastAPI & Uvicorn
- SQLAlchemy ORM

**AI & Database**
- LangGraph & LangChain Python
- Groq API (`llama-3.3-70b-versatile` optimized for rapid inference)
- Supabase (Managed PostgreSQL)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (v3.10+)
- Groq API Key
- Supabase PostgreSQL Connection String

### 1. Installation

Clone the repository and install the frontend dependencies:
```bash
npm install
```

Install the backend Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory and add your credentials:
```env
# Groq API Key for LLM Inference
GROQ_API_KEY="your_groq_api_key_here"

# Supabase PostgreSQL Connection String
# Note: Ensure you use the postgresql+psycopg2 dialect for SQLAlchemy
DATABASE_URL="postgresql+psycopg2://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres"
```

### 3. Run the Application

The project utilizes `concurrently` to start both the Vite development server and the FastAPI backend with a single command.

From the root directory, run:
```bash
npm run dev
```

- **Frontend UI**: `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:8000`
- **Interactive API Docs**: `http://localhost:8000/docs`

> **Note:** Upon the first successful boot, SQLAlchemy will automatically connect to Supabase, generate the required schemas (`users`, `hcps`, `interactions`), and seed the initial doctor data.

---

## 📁 Project Structure

```text
├── backend/
│   ├── main.py         # FastAPI routing & initialization
│   ├── agent.py        # LangGraph StateGraph, memory, and Tools
│   ├── db.py           # SQLAlchemy dialect-agnostic models & initialization
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── Chat/       # AIChatPanel (Conversational Interface)
│   │   └── Form/       # InteractionForm (Structured UI)
│   ├── store/          # Redux slices (chatSlice, interactionSlice)
│   └── App.tsx         # Dual-screen layout
├── .env                # Environment variables
├── package.json        # Frontend & concurrent scripts
└── vite.config.ts      # Vite proxy configurations
```

---
*Designed in April 2026, adhering to modern React strict-mode patterns, AI agentic workflows, and robust Python API standards.*
