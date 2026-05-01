import { Database } from "bun:sqlite";

export interface CaseInput {
  symbol: string;
  date?: string | null;
  timeframe?: string;
  label: string;
  sub_label?: string | null;
  confidence?: string | null;
  notes?: string | null;
  price_close?: number | null;
  sma_10?: number | null;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  sma_200_slope?: number | null;
  price_vs_200_pct?: number | null;
  volume_avg_20?: number | null;
  volume_contraction_pct?: number | null;
  base_depth_pct?: number | null;
  base_candles?: number | null;
  trp_pct?: number | null;
  adt_cr?: number | null;
  nifty500_stage?: number | null;
  sector?: string | null;
  market?: string;
  outcome?: string | null;
  outcome_pct?: number | null;
  outcome_duration_days?: number | null;
  outcome_notes?: string | null;
  image_path?: string | null;
  data_json?: string | null;
  source?: string;
  image_quality?: string;
  needs_fresh_screenshot?: number;
}

export interface CaseRecord extends CaseInput {
  id: number;
  created_at: string;
  updated_at: string | null;
}

export function addCase(db: Database, input: CaseInput): CaseRecord {
  const stmt = db.prepare(`
    INSERT INTO cases (
      symbol, date, timeframe, label, sub_label, confidence, notes,
      price_close, sma_10, sma_20, sma_50, sma_200, sma_200_slope,
      price_vs_200_pct, volume_avg_20, volume_contraction_pct,
      base_depth_pct, base_candles, trp_pct, adt_cr,
      nifty500_stage, sector, market,
      outcome, outcome_pct, outcome_duration_days, outcome_notes,
      image_path, data_json, source, image_quality, needs_fresh_screenshot
    ) VALUES (
      $symbol, $date, $timeframe, $label, $sub_label, $confidence, $notes,
      $price_close, $sma_10, $sma_20, $sma_50, $sma_200, $sma_200_slope,
      $price_vs_200_pct, $volume_avg_20, $volume_contraction_pct,
      $base_depth_pct, $base_candles, $trp_pct, $adt_cr,
      $nifty500_stage, $sector, $market,
      $outcome, $outcome_pct, $outcome_duration_days, $outcome_notes,
      $image_path, $data_json, $source, $image_quality, $needs_fresh_screenshot
    )
  `);

  stmt.run({
    $symbol: input.symbol,
    $date: input.date ?? null,
    $timeframe: input.timeframe ?? "weekly",
    $label: input.label,
    $sub_label: input.sub_label ?? null,
    $confidence: input.confidence ?? null,
    $notes: input.notes ?? null,
    $price_close: input.price_close ?? null,
    $sma_10: input.sma_10 ?? null,
    $sma_20: input.sma_20 ?? null,
    $sma_50: input.sma_50 ?? null,
    $sma_200: input.sma_200 ?? null,
    $sma_200_slope: input.sma_200_slope ?? null,
    $price_vs_200_pct: input.price_vs_200_pct ?? null,
    $volume_avg_20: input.volume_avg_20 ?? null,
    $volume_contraction_pct: input.volume_contraction_pct ?? null,
    $base_depth_pct: input.base_depth_pct ?? null,
    $base_candles: input.base_candles ?? null,
    $trp_pct: input.trp_pct ?? null,
    $adt_cr: input.adt_cr ?? null,
    $nifty500_stage: input.nifty500_stage ?? null,
    $sector: input.sector ?? null,
    $market: input.market ?? "NSE",
    $outcome: input.outcome ?? null,
    $outcome_pct: input.outcome_pct ?? null,
    $outcome_duration_days: input.outcome_duration_days ?? null,
    $outcome_notes: input.outcome_notes ?? null,
    $image_path: input.image_path ?? null,
    $data_json: input.data_json ?? null,
    $source: input.source ?? "manual",
    $image_quality: input.image_quality ?? "good",
    $needs_fresh_screenshot: input.needs_fresh_screenshot ?? 0,
  });

  const id = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
  return getCase(db, id.id)!;
}

export function getCase(db: Database, id: number): CaseRecord | null {
  return db.query("SELECT * FROM cases WHERE id = $id").get({ $id: id }) as CaseRecord | null;
}

export function listCases(db: Database, filters?: {
  label?: string;
  symbol?: string;
  outcome?: string;
  limit?: number;
}): CaseRecord[] {
  let sql = "SELECT * FROM cases WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (filters?.label) {
    sql += " AND label = $label";
    params.$label = filters.label;
  }
  if (filters?.symbol) {
    sql += " AND symbol = $symbol";
    params.$symbol = filters.symbol;
  }
  if (filters?.outcome) {
    sql += " AND outcome = $outcome";
    params.$outcome = filters.outcome;
  }

  sql += " ORDER BY id ASC";

  if (filters?.limit) {
    sql += " LIMIT $limit";
    params.$limit = filters.limit;
  }

  return db.query(sql).all(params) as CaseRecord[];
}

export function updateOutcome(db: Database, id: number, outcome: {
  outcome: string;
  outcome_pct?: number | null;
  outcome_duration_days?: number | null;
  outcome_notes?: string | null;
}): CaseRecord | null {
  db.prepare(`
    UPDATE cases SET
      outcome = $outcome,
      outcome_pct = $outcome_pct,
      outcome_duration_days = $outcome_duration_days,
      outcome_notes = $outcome_notes,
      updated_at = datetime('now')
    WHERE id = $id
  `).run({
    $id: id,
    $outcome: outcome.outcome,
    $outcome_pct: outcome.outcome_pct ?? null,
    $outcome_duration_days: outcome.outcome_duration_days ?? null,
    $outcome_notes: outcome.outcome_notes ?? null,
  });

  return getCase(db, id);
}

export function findSimilar(db: Database, criteria: {
  label?: string;
  trp_pct_range?: [number, number];
  base_candles_range?: [number, number];
  market?: string;
}): CaseRecord[] {
  let sql = "SELECT * FROM cases WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (criteria.label) {
    sql += " AND label = $label";
    params.$label = criteria.label;
  }
  if (criteria.market) {
    sql += " AND market = $market";
    params.$market = criteria.market;
  }
  if (criteria.trp_pct_range) {
    sql += " AND trp_pct >= $trp_min AND trp_pct <= $trp_max";
    params.$trp_min = criteria.trp_pct_range[0];
    params.$trp_max = criteria.trp_pct_range[1];
  }
  if (criteria.base_candles_range) {
    sql += " AND base_candles >= $bc_min AND base_candles <= $bc_max";
    params.$bc_min = criteria.base_candles_range[0];
    params.$bc_max = criteria.base_candles_range[1];
  }

  sql += " ORDER BY id ASC";

  return db.query(sql).all(params) as CaseRecord[];
}
