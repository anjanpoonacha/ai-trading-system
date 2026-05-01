import { test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { initDatabase } from "../src/store/schema";
import { addCase, getCase, listCases, updateOutcome, findSimilar } from "../src/store/cases";

let db: Database;
const TEST_DB = ":memory:";

beforeAll(() => {
  db = initDatabase(TEST_DB);
});

afterAll(() => {
  db.close();
});

test("initDatabase creates cases table", () => {
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='cases'").all();
  expect(tables).toHaveLength(1);
});

test("addCase inserts and returns a case", () => {
  const result = addCase(db, {
    symbol: "TESTSTOCK",
    label: "good_base",
    sub_label: "stage_2_breakout",
    confidence: "strong",
    notes: "Test case",
    timeframe: "weekly",
    trp_pct: 4.5,
    base_candles: 45,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 30,
    source: "test",
  });

  expect(result.id).toBeGreaterThan(0);
  expect(result.symbol).toBe("TESTSTOCK");
  expect(result.label).toBe("good_base");
  expect(result.trp_pct).toBe(4.5);
  expect(result.created_at).toBeTruthy();
});

test("getCase retrieves by id", () => {
  const added = addCase(db, {
    symbol: "GETTEST",
    label: "avoid",
    notes: "For getCase test",
  });

  const retrieved = getCase(db, added.id);
  expect(retrieved).not.toBeNull();
  expect(retrieved!.symbol).toBe("GETTEST");
  expect(retrieved!.label).toBe("avoid");
});

test("getCase returns null for non-existent id", () => {
  const result = getCase(db, 99999);
  expect(result).toBeNull();
});

test("listCases returns all cases", () => {
  const all = listCases(db);
  expect(all.length).toBeGreaterThanOrEqual(2);
});

test("listCases filters by label", () => {
  const avoided = listCases(db, { label: "avoid" });
  expect(avoided.length).toBeGreaterThanOrEqual(1);
  for (const c of avoided) {
    expect(c.label).toBe("avoid");
  }
});

test("listCases filters by symbol", () => {
  const results = listCases(db, { symbol: "TESTSTOCK" });
  expect(results).toHaveLength(1);
  expect(results[0]!.symbol).toBe("TESTSTOCK");
});

test("listCases respects limit", () => {
  const results = listCases(db, { limit: 1 });
  expect(results).toHaveLength(1);
});

test("updateOutcome modifies outcome fields", () => {
  const added = addCase(db, {
    symbol: "OUTCOMETEST",
    label: "good_base",
  });

  const updated = updateOutcome(db, added.id, {
    outcome: "failed",
    outcome_pct: -5,
    outcome_duration_days: 10,
    outcome_notes: "Hit stop loss",
  });

  expect(updated).not.toBeNull();
  expect(updated!.outcome).toBe("failed");
  expect(updated!.outcome_pct).toBe(-5);
  expect(updated!.outcome_duration_days).toBe(10);
  expect(updated!.updated_at).toBeTruthy();
});

test("findSimilar filters by label and TRP range", () => {
  addCase(db, { symbol: "SIM1", label: "good_base", trp_pct: 3.0 });
  addCase(db, { symbol: "SIM2", label: "good_base", trp_pct: 5.0 });
  addCase(db, { symbol: "SIM3", label: "good_base", trp_pct: 8.0 });

  const results = findSimilar(db, {
    label: "good_base",
    trp_pct_range: [2.5, 5.5],
  });

  expect(results.length).toBeGreaterThanOrEqual(2);
  for (const r of results) {
    if (r.trp_pct !== null) {
      expect(r.trp_pct).toBeGreaterThanOrEqual(2.5);
      expect(r.trp_pct).toBeLessThanOrEqual(5.5);
    }
  }
});

test("findSimilar filters by base_candles range", () => {
  addCase(db, { symbol: "BC1", label: "good_base", base_candles: 30 });
  addCase(db, { symbol: "BC2", label: "good_base", base_candles: 100 });

  const results = findSimilar(db, {
    label: "good_base",
    base_candles_range: [25, 50],
  });

  const bcFiltered = results.filter(r => r.symbol === "BC1" || r.symbol === "BC2");
  expect(bcFiltered.every(r => r.base_candles! <= 50)).toBe(true);
});
