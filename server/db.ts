import Database from 'better-sqlite3';
import path from 'path';

// Setup database using better-sqlite3
const dbPath = path.join(process.cwd(), 'crm.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Initial Schema Setup
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      hashed_password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'field_rep',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hcps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      specialty TEXT,
      hospital TEXT,
      location TEXT,
      contact_email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      hcp_id INTEGER,
      interaction_type TEXT NOT NULL,
      interaction_date TEXT NOT NULL,
      interaction_time TEXT NOT NULL,
      attendees TEXT, -- JSON string
      topics_discussed TEXT,
      materials_shared TEXT, -- JSON string
      samples_distributed TEXT DEFAULT '[]', -- JSON string
      sentiment TEXT CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
      outcomes TEXT,
      follow_up_actions TEXT, -- JSON string
      raw_chat_transcript TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hcp_id) REFERENCES hcps(id) ON DELETE SET NULL
  );
`);

// Seed some data if it doesn't exist
const countHCPs: any = db.prepare('SELECT COUNT(*) as count FROM hcps').get();
if (countHCPs.count === 0) {
  const insertHCP = db.prepare(`
    INSERT INTO hcps (name, specialty, hospital, location, contact_email, phone)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const seedData = [
    ["Dr. Sarah Smith", "Cardiologist", "City General", "Mumbai", "sarah.smith@example.com", "123-456-7890"],
    ["Dr. Rahul Sharma", "Endocrinologist", "Apollo Center", "Delhi", "rahul.sharma@example.com", "098-765-4321"],
    ["Dr. Emily Chen", "Neurologist", "Global Health", "Bangalore", "emily.chen@example.com", "555-010-2020"]
  ];

  db.transaction(() => {
    seedData.forEach(hcp => insertHCP.run(...hcp));
  })();
}

// Seed a dummy user
const countUsers: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (countUsers.count === 0) {
  db.prepare(`
    INSERT INTO users (email, hashed_password, full_name)
    VALUES (?, ?, ?)
  `).run("demo@example.com", "dummy_hash", "Demo Field Rep");
}

export default db;
