import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# SQLite by default — swap to PostgreSQL by setting DATABASE_URL in .env
# e.g. DATABASE_URL=postgresql://user:password@localhost/crmdb
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///../crm.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def init_db():
    """Create tables and seed initial data."""
    is_pg = DATABASE_URL.startswith("postgres")
    auto_inc = "SERIAL PRIMARY KEY" if is_pg else "INTEGER PRIMARY KEY AUTOINCREMENT"
    dt_type = "TIMESTAMP" if is_pg else "DATETIME"
    
    with engine.connect() as conn:
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS users (
                id {auto_inc},
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'field_rep',
                created_at {dt_type} DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS hcps (
                id {auto_inc},
                name TEXT NOT NULL,
                specialty TEXT,
                hospital TEXT,
                location TEXT,
                contact_email TEXT,
                phone TEXT,
                created_at {dt_type} DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS interactions (
                id {auto_inc},
                user_id INTEGER,
                hcp_id INTEGER,
                interaction_type TEXT NOT NULL,
                interaction_date TEXT NOT NULL,
                interaction_time TEXT NOT NULL,
                attendees TEXT,
                topics_discussed TEXT,
                materials_shared TEXT,
                samples_distributed TEXT DEFAULT '[]',
                sentiment TEXT,
                outcomes TEXT,
                follow_up_actions TEXT,
                raw_chat_transcript TEXT,
                created_at {dt_type} DEFAULT CURRENT_TIMESTAMP,
                updated_at {dt_type} DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

        # Seed HCPs
        count = conn.execute(text("SELECT COUNT(*) FROM hcps")).scalar()
        if count == 0:
            seed = [
                ("Dr. Sarah Smith",  "Cardiologist",    "City General",  "Mumbai",    "sarah.smith@example.com",  "123-456-7890"),
                ("Dr. Rahul Sharma", "Endocrinologist", "Apollo Center", "Delhi",     "rahul.sharma@example.com", "098-765-4321"),
                ("Dr. Emily Chen",   "Neurologist",     "Global Health", "Bangalore", "emily.chen@example.com",   "555-010-2020"),
            ]
            for s in seed:
                conn.execute(text(
                    "INSERT INTO hcps (name, specialty, hospital, location, contact_email, phone) "
                    "VALUES (:name, :specialty, :hospital, :location, :email, :phone)"
                ), {"name": s[0], "specialty": s[1], "hospital": s[2],
                    "location": s[3], "email": s[4], "phone": s[5]})
            conn.commit()

        # Seed user
        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count == 0:
            conn.execute(text(
                "INSERT INTO users (email, hashed_password, full_name) "
                "VALUES ('demo@example.com', 'dummy_hash', 'Demo Field Rep')"
            ))
            conn.commit()


def get_hcp_id(name: str):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id FROM hcps WHERE name LIKE :name"),
            {"name": f"%{name}%"}
        ).fetchone()
        return row[0] if row else None
