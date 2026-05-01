import { Database } from "bun:sqlite";

export function initDatabase(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      date TEXT,
      timeframe TEXT NOT NULL DEFAULT 'weekly',

      -- Classification
      label TEXT NOT NULL,
      sub_label TEXT,
      confidence TEXT,
      notes TEXT,

      -- Data snapshot
      price_close REAL,
      sma_10 REAL,
      sma_20 REAL,
      sma_50 REAL,
      sma_200 REAL,
      sma_200_slope REAL,
      price_vs_200_pct REAL,
      volume_avg_20 REAL,
      volume_contraction_pct REAL,
      base_depth_pct REAL,
      base_candles INTEGER,
      trp_pct REAL,
      adt_cr REAL,

      -- Context
      nifty500_stage INTEGER,
      sector TEXT,
      market TEXT DEFAULT 'NSE',

      -- Outcome
      outcome TEXT,
      outcome_pct REAL,
      outcome_duration_days INTEGER,
      outcome_notes TEXT,

      -- Files
      image_path TEXT,
      data_json TEXT,

      -- Source tracking
      source TEXT DEFAULT 'manual',
      image_quality TEXT DEFAULT 'good',
      needs_fresh_screenshot INTEGER DEFAULT 0,

      -- Metadata
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cases_symbol ON cases(symbol);
    CREATE INDEX IF NOT EXISTS idx_cases_label ON cases(label);
    CREATE INDEX IF NOT EXISTS idx_cases_outcome ON cases(outcome);
  `);

  return db;
}
