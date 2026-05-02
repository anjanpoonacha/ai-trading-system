import { Database } from "bun:sqlite";
import { initDatabase } from "../src/store/schema";
import { addCase, type CaseInput } from "../src/store/cases";
import { $ } from "bun";

const PROJECT_ROOT = import.meta.dir + "/..";
const DB_PATH = `${PROJECT_ROOT}/data/cases.db`;
const CLIPS_DIR = `${PROJECT_ROOT}/visuals/screenshots/cds-ex`;
const CASES_DIR = `${PROJECT_ROOT}/charts/cases/cds-examples`;

// Case definitions with clip mappings
const cases: Array<CaseInput & { folder: string; clip_file: string; video_id: string }> = [
  {
    folder: "001-USHAMART-entry",
    symbol: "USHAMART",
    label: "good_base",
    sub_label: "stage_2_breakout",
    confidence: "strong",
    notes: "Clean Stage 2. Breakout of ₹31.80 resistance with huge volumes. Weekly chart shows clear structure break.",
    timeframe: "weekly",
    market: "NSE",
    outcome: "worked",
    outcome_notes: "Successful Stage 2 breakout with volume confirmation",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "MBONI9t-ziQ",
    clip_file: "MBONI9t-ziQ_0000_0100.mp4",
  },
  {
    folder: "002-USHAMART-exit",
    symbol: "USHAMART",
    label: "good_base",
    sub_label: "exit_management",
    confidence: "strong",
    notes: "Exit management example. Trailing stop methodology on USHAMART position.",
    timeframe: "weekly",
    market: "NSE",
    outcome: "worked",
    outcome_notes: "Demonstrated exit via trailing stops",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "F0njKJGioZA",
    clip_file: "F0njKJGioZA_0000.mp4",
  },
  {
    folder: "003-SHYAMMETL",
    symbol: "SHYAMMETL",
    label: "good_base",
    sub_label: "stage_transition",
    confidence: "strong",
    notes: "Stage 4→1→2 breakout. Base ₹250-₹300, breakout >₹400 with volume. Earnings gap wake-up call → pullback to 20/50 DMA → trigger ~₹177.50.",
    timeframe: "weekly",
    trp_pct: 3.3,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 24,
    outcome_notes: "Exits: 17% (2R) → 20% exit | 24% move, TRP 3.3 → 40% exit | Close below 50 DMA → final 40%. Rounding top visible before final exit.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_0000.mp4",
  },
  {
    folder: "004-OLECTRA",
    symbol: "OLECTRA",
    label: "good_base",
    sub_label: "stage_1b",
    confidence: "strong",
    notes: "Stage 4 → Stage 1 (large green candle, massive volume). Daily: V-V structure ₹155-₹175, earnings gap → pullback to 20 DMA → trigger. TRP 4.3%.",
    timeframe: "weekly",
    trp_pct: 4.3,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 57,
    outcome_notes: "57% move, TRP 4.8 (great) → 40% exit | Extreme extension: 60% exit | Final 20% on low break. Rounding structure on lower timeframe = weakness.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_0430.mp4",
  },
  {
    folder: "005-PATELENG",
    symbol: "PATELENG",
    label: "good_base",
    sub_label: "shallow_short",
    confidence: "strong",
    notes: "Stage 4→1→failed 2→4→2 (large volume spike). Daily: 35-day shallow base above 20 DMA → trigger at contraction high. TRP 5.4.",
    timeframe: "weekly",
    trp_pct: 5.4,
    base_candles: 35,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 85,
    outcome_duration_days: 77,
    outcome_notes: "Three upper circuits → 20% exit | Six circuits total, 44% move → 40% exit | Break below 20 DMA after 90+ days → final 40%. Total: 85% in 77 days.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_1000.mp4",
  },
  {
    folder: "006-TATAMOTORS",
    symbol: "TATAMOTORS",
    label: "good_base",
    sub_label: "first_base_stage2",
    confidence: "moderate",
    notes: "Clean Stage 2, first base within Stage 2. Failed breakout → earnings next day → DO NOT TRADE. Post-earnings gap → pullback to 20 DMA → contraction → trigger. Small base: quick entry needed.",
    timeframe: "weekly",
    trp_pct: 2.0,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 21,
    outcome_notes: "13% (2R) → 20% exit | 15% move, TRP 2% (7x) → soft stops | 21% (great) → 40% exit | Close below 20 DMA after 90+ days → final 40%.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_1400.mp4",
  },
  {
    folder: "007-ANGELONE",
    symbol: "ANGELONE",
    label: "good_base",
    sub_label: "shallow_along_20dma",
    confidence: "strong",
    notes: "Breakout, forming base within higher breakout area. Short shallow base along 20 DMA, rounding features, PPCs, contraction, volume variation. TRP 4%.",
    timeframe: "weekly",
    trp_pct: 4.0,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 42,
    outcome_notes: "2R → 20% exit | 42% move, TRP 4% (10x, great) → 40% exit | Break below 20 DMA after 90+ days → final 40%.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_1630.mp4",
  },
  {
    folder: "008-NEULANDLAB",
    symbol: "NEULANDLAB",
    label: "good_entry",
    sub_label: "earnings_trigger",
    confidence: "strong",
    notes: "Stage 4→1→2, small base within Stage 2. 30-day shallow base along 20 DMA. Earnings at 1:55 PM triggered breakout → buy 100% ASAP. TRP 4.3%.",
    timeframe: "weekly",
    trp_pct: 4.3,
    base_candles: 30,
    market: "NSE",
    outcome: "worked",
    outcome_pct: 50,
    outcome_notes: "50% move, TRP 4.3% (11-12x, extreme) → 60-100% exit options | 34% move, TRP 4.8% (2R) → final 20%.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "aTv2pNEEN_Q",
    clip_file: "aTv2pNEEN_Q_1900.mp4",
  },
  {
    folder: "009-CDSL-base",
    symbol: "CDSL",
    label: "good_base",
    sub_label: "post_climax",
    confidence: "strong",
    notes: "After steep rally with climax, 160-day smooth base. Multiple shakeouts = exceptionally strong. Earnings turnaround wake-up call. 23 weeks of proper reset.",
    timeframe: "weekly",
    base_candles: 160,
    market: "NSE",
    outcome: "worked",
    outcome_notes: "Successful breakout after extended base building with multiple shakeouts removing weak hands.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "SKa9B0bXnHA",
    clip_file: "SKa9B0bXnHA_0000.mp4",
  },
  {
    folder: "010-BAJAJHIND",
    symbol: "BAJAJHIND",
    label: "good_entry",
    sub_label: "wbp_earnings_shock",
    confidence: "strong",
    notes: "Inverse head & shoulders on weekly, WBP on daily. Earnings shock created pullback to 20 SMA. Trigger bars formed, entry at ~12 INR.",
    timeframe: "weekly",
    market: "NSE",
    outcome: "worked",
    outcome_notes: "WBP + earnings shock entry worked. Inverse H&S weekly pattern confirmed.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "QVQitfBsvz8",
    clip_file: "QVQitfBsvz8_0030.mp4",
  },
  {
    folder: "011-AMC",
    symbol: "AMC",
    label: "good_base",
    sub_label: "post_abnormal_move",
    confidence: "strong",
    notes: "Post-1000% move ($10 → $100). Required extended consolidation before valid setup. Abnormal gains → immediate profit-taking.",
    timeframe: "weekly",
    market: "US",
    outcome: "worked",
    outcome_pct: 340,
    outcome_notes: "9.5R in 3 days, 34R in 5 days. Abnormal gains → 99% exit.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "n0uG60h5HXM",
    clip_file: "n0uG60h5HXM_0000.mp4",
  },
  {
    folder: "012-LSIL",
    symbol: "LSIL",
    label: "good_base",
    sub_label: "stage_2a",
    confidence: "strong",
    notes: "Stage 2A: base 4-5 bars after Stage 2 breakout. Wake-up call: range breakout with volume spike. Multiple trigger bars during drift down.",
    timeframe: "weekly",
    market: "NSE",
    outcome: "worked",
    outcome_notes: "First extension exit at ~11R. Second extension exit at ~20R (complete exit for swing trading).",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "Jva74FVG3M4",
    clip_file: "Jva74FVG3M4_0030.mp4",
  },
  {
    folder: "013-RVLV",
    symbol: "RVLV",
    label: "good_base",
    sub_label: "base_on_base",
    confidence: "strong",
    notes: "First base breakout at $14 failed, stock formed second base at similar level (base-on-base). MBB with volume spike, then earnings shock, then pullback provided entry. Inverse H&S within base.",
    timeframe: "weekly",
    market: "US",
    outcome: "worked",
    outcome_notes: "Base-on-base pattern confirmed. MBB + earnings shock entry worked.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "ckPZqexb4l4",
    clip_file: "ckPZqexb4l4_0030_0100.mp4",
  },
  {
    folder: "014-CDSL-climax",
    symbol: "CDSL",
    label: "avoid",
    sub_label: "buying_climax",
    confidence: "strong",
    notes: "CDSL (Central Depository). After rally from ₹480 to ₹750, massive volume spike (21.433M) at ₹750 = buying climax. Post-climax: volatile/choppy → Stage 3 distribution. Do NOT buy at climax.",
    timeframe: "weekly",
    market: "NSE",
    outcome: "avoid_confirmed",
    outcome_notes: "Buying climax confirmed. Stock became volatile/choppy, entered Stage 3 distribution.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "SKa9B0bXnHA",
    clip_file: "SKa9B0bXnHA_0230.mp4",
  },
  {
    folder: "015-AGYS-extended",
    symbol: "AGYS",
    label: "avoid",
    sub_label: "extended_entry",
    confidence: "strong",
    notes: "7 consecutive green candles from $78 to $92. Breakout at $87 = extended entry. Never buy after large upswing (6-7+ consecutive green candles).",
    timeframe: "daily",
    market: "US",
    outcome: "avoid_confirmed",
    outcome_notes: "Extended entry example — buying after 7 consecutive green candles is too late.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "esy8HetQgrk",
    clip_file: "esy8HetQgrk_2830.mp4",
  },
  {
    folder: "016-APOLLO-extended",
    symbol: "APOLLO",
    label: "avoid",
    sub_label: "extended_entry",
    confidence: "strong",
    notes: "Sharp rally from 110 to 140+ with no pullback = extended entry. Wait for downswing completion or sideways consolidation.",
    timeframe: "daily",
    market: "NSE",
    outcome: "avoid_confirmed",
    outcome_notes: "Extended entry — sharp rally with no pullback, no valid entry point.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "esy8HetQgrk",
    clip_file: "esy8HetQgrk_2900.mp4",
  },
  {
    folder: "017-PFC-extended",
    symbol: "PFC",
    label: "avoid",
    sub_label: "extended_entry",
    confidence: "strong",
    notes: "Big upswing from consolidation box (260-270) to 285+ = extended entry. Do not chase after large upswing from box.",
    timeframe: "daily",
    market: "NSE",
    outcome: "avoid_confirmed",
    outcome_notes: "Extended entry — big upswing from box breakout, too late to enter.",
    source: "course_example",
    image_quality: "course_clip",
    needs_fresh_screenshot: 1,
    video_id: "esy8HetQgrk",
    clip_file: "esy8HetQgrk_3000.mp4",
  },
];

async function extractFrame(clipFile: string, outputPath: string): Promise<boolean> {
  const clipPath = `${CLIPS_DIR}/${clipFile}`;
  const file = Bun.file(clipPath);
  if (!(await file.exists())) {
    console.log(`  ⚠ Clip not found: ${clipFile}`);
    return false;
  }

  try {
    // Get clip duration to pick best seek point
    const probe = await $`ffprobe -v error -show_entries format=duration -of csv=p=0 ${clipPath}`.text();
    const duration = parseFloat(probe.trim());
    const seekTo = Math.min(10, Math.floor(duration / 2));

    await $`ffmpeg -y -ss ${seekTo} -i ${clipPath} -frames:v 1 -q:v 2 ${outputPath}`.quiet();
    return true;
  } catch (e) {
    console.log(`  ⚠ ffmpeg failed for ${clipFile}: ${e}`);
    return false;
  }
}

async function main() {
  // Remove existing DB for clean seed
  const dbFile = Bun.file(DB_PATH);
  if (await dbFile.exists()) {
    await $`rm ${DB_PATH}`.quiet();
  }

  console.log("Initializing database...");
  const db = initDatabase(DB_PATH);

  let imagesExtracted = 0;
  let imagesFailed = 0;

  for (const caseData of cases) {
    const { folder, clip_file, video_id, ...input } = caseData;
    const caseDir = `${CASES_DIR}/${folder}`;
    await $`mkdir -p ${caseDir}`.quiet();

    // Extract frame
    const imagePath = `${caseDir}/chart.png`;
    const success = await extractFrame(clip_file, imagePath);

    if (success) {
      imagesExtracted++;
      input.image_path = `charts/cases/cds-examples/${folder}/chart.png`;
    } else {
      imagesFailed++;
      input.image_path = null;
    }

    // Insert into DB
    const record = addCase(db, input);
    console.log(`  ✓ Case #${record.id}: ${input.symbol} (${input.label}) ${success ? "📷" : "⚠️ no image"}`);

    // Write metadata.json
    const metadata = {
      symbol: input.symbol,
      date: input.date ?? null,
      timeframe: input.timeframe ?? "weekly",
      label: input.label,
      sub_label: input.sub_label ?? null,
      confidence: input.confidence ?? null,
      notes: input.notes ?? null,
      trp_pct: input.trp_pct ?? null,
      base_candles: input.base_candles ?? null,
      outcome: input.outcome ?? null,
      outcome_pct: input.outcome_pct ?? null,
      outcome_duration_days: input.outcome_duration_days ?? null,
      outcome_notes: input.outcome_notes ?? null,
      source: input.source ?? "course_example",
      image_quality: input.image_quality ?? "course_clip",
      needs_fresh_screenshot: true,
      video_id,
      clip_file,
    };

    await Bun.write(`${caseDir}/metadata.json`, JSON.stringify(metadata, null, 2) + "\n");
  }

  db.close();

  console.log("\n=== Summary ===");
  console.log(`Cases created: ${cases.length}`);
  console.log(`Images extracted: ${imagesExtracted}`);
  console.log(`Images failed: ${imagesFailed}`);
  console.log(`Database: ${DB_PATH}`);
}

main().catch(console.error);
