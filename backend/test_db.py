"""Direct test: insert an interaction into Supabase and verify."""
from db import engine, DATABASE_URL, get_hcp_id
from sqlalchemy import text
import json

print(f"DATABASE_URL starts with: {DATABASE_URL[:30]}...")
is_pg = DATABASE_URL.startswith("postgres")
print(f"Is PostgreSQL: {is_pg}")

# Test get_hcp_id
try:
    hcp_id = get_hcp_id("Dr. Sarah Smith")
    print(f"HCP ID for Dr. Sarah Smith: {hcp_id}")
except Exception as e:
    print(f"get_hcp_id error: {e}")
    hcp_id = 1

# Test INSERT
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
    "itype": "Meeting",
    "idate": "2026-04-28",
    "itime": "09:00",
    "attendees": json.dumps([]),
    "topics": "Test topic",
    "materials": json.dumps(["brochure"]),
    "samples": json.dumps([]),
    "sentiment": "Positive",
}

try:
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        conn.commit()
        if is_pg:
            new_id = result.fetchone()[0]
        else:
            new_id = result.lastrowid
        print(f"SUCCESS! Inserted interaction with id={new_id}")
except Exception as e:
    print(f"INSERT FAILED: {e}")

# Verify
try:
    with engine.connect() as conn:
        r = conn.execute(text("SELECT count(*) FROM interactions"))
        print(f"Total interactions now: {r.fetchone()[0]}")
except Exception as e:
    print(f"SELECT FAILED: {e}")
