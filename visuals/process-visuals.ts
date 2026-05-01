import { $ } from "bun";
import { mkdir } from "node:fs/promises";

const LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions";
const LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da";
const MODEL = "gemini-2.5-pro";
const TRANSCRIPTS_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts";
const MAX_CONCURRENT = 5;
const LOG_FILE = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/process.log";

interface Marker {
  timestamp: string;
  quote: string;
  what_is_shown: string;
  why_needed: string;
  _file: string;
  _vid_id: string;
}

interface Result {
  timestamp: string;
  quote: string;
  what_is_shown: string;
  visual_description: string;
  status: "critical" | "skipped" | "error";
  _file: string;
  _vid_id: string;
  clip_file?: string;
  error?: string;
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  Bun.write(LOG_FILE, line + "\n", { append: true } as any).catch(() => {});
}

function parseTimestamp(ts: string): number {
  const part = ts.split("-")[0].trim();
  const segments = part.split(":").map(Number);
  if (segments.length === 3) return segments[0] * 3600 + segments[1] * 60 + segments[2];
  return segments[0] * 60 + segments[1];
}

async function getStreamUrl(videoId: string): Promise<string> {
  const result = await $`yt-dlp -f "bestvideo[height<=720]" --get-url "https://www.youtube.com/watch?v=${videoId}"`.text();
  return result.trim();
}

async function extractClip(streamUrl: string, seconds: number, outPath: string): Promise<boolean> {
  try {
    await $`ffmpeg -y -ss ${seconds} -i ${streamUrl} -t 5 -c:v libx264 -preset fast -crf 23 ${outPath}`.quiet();
    const file = Bun.file(outPath);
    return (await file.exists()) && file.size > 1000;
  } catch {
    return false;
  }
}

async function getTranscriptContext(transcriptFile: string, seconds: number): Promise<string> {
  const filePath = `${TRANSCRIPTS_DIR}/${transcriptFile}`;
  try {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");
    const tsRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
    interface TL { lineIdx: number; seconds: number }
    const tls: TL[] = [];

    for (let i = 0; i < lines.length; i++) {
      let match;
      while ((match = tsRegex.exec(lines[i])) !== null) {
        const parts = match[1].split(":").map(Number);
        const s = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
        tls.push({ lineIdx: i, seconds: s });
      }
    }

    if (tls.length === 0) return "";

    let closest = tls[0];
    let minDiff = Math.abs(closest.seconds - seconds);
    for (const tl of tls) {
      const diff = Math.abs(tl.seconds - seconds);
      if (diff < minDiff) { minDiff = diff; closest = tl; }
    }

    const idx = closest.lineIdx;
    const ctx: string[] = [];
    for (let i = Math.max(0, idx - 1); i <= Math.min(lines.length - 1, idx + 1); i++) {
      if (lines[i].trim()) ctx.push(lines[i].trim().substring(0, 500));
    }
    return ctx.join("\n");
  } catch { return ""; }
}

async function isTransitionFrame(clipPath: string): Promise<boolean> {
  try {
    const result = await $`ffmpeg -i ${clipPath} -vframes 3 -vf "blackdetect=d=0.1:pix_th=0.10" -f null - 2>&1`.text();
    return result.includes("black_start");
  } catch { return false; }
}

async function describeClip(clipPath: string, quote: string, context: string, retries = 2): Promise<string> {
  const clipData = await Bun.file(clipPath).arrayBuffer();
  const base64 = Buffer.from(clipData).toString("base64");

  const prompt = `The speaker says: "${quote.substring(0, 300)}"
Transcript context: ${context.substring(0, 400)}
Describe precisely what is shown on screen in this 5-second clip. Include: stock name, price levels, indicator values, patterns drawn, annotations, cursor movements. Be concise (2-4 sentences).`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(LITELLM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LITELLM_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:video/mp4;base64,${base64}` } },
            ],
          }],
          max_tokens: 300,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (attempt === retries) throw new Error(`LiteLLM ${resp.status}: ${errText.substring(0, 150)}`);
        await Bun.sleep(2000 * (attempt + 1));
        continue;
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err: any) {
      if (attempt === retries) throw err;
      await Bun.sleep(2000 * (attempt + 1));
    }
  }
  return "";
}

async function processMarker(marker: Marker, streamUrl: string, screenshotsDir: string): Promise<Result> {
  const seconds = parseTimestamp(marker.timestamp);
  const clipFile = `${marker._vid_id}_${seconds}s.mp4`;
  const clipPath = `${screenshotsDir}${clipFile}`;

  const result: Result = {
    timestamp: marker.timestamp,
    quote: marker.quote,
    what_is_shown: marker.what_is_shown,
    visual_description: "",
    status: "critical",
    _file: marker._file,
    _vid_id: marker._vid_id,
    clip_file: clipFile,
  };

  try {
    // Check if clip already exists
    const existing = Bun.file(clipPath);
    let needExtract = !(await existing.exists()) || existing.size < 1000;

    if (needExtract) {
      const success = await extractClip(streamUrl, seconds, clipPath);
      if (!success) {
        result.status = "error";
        result.error = "Clip extraction failed";
        return result;
      }
    }

    // Check transition frame
    const isTransition = await isTransitionFrame(clipPath);
    if (isTransition) {
      const retrySuccess = await extractClip(streamUrl, seconds + 3, clipPath);
      if (!retrySuccess) {
        result.status = "error";
        result.error = "Retry after transition also failed";
        return result;
      }
    }

    // Get transcript context
    const context = await getTranscriptContext(marker._file, seconds);

    // Describe with Gemini
    const description = await describeClip(clipPath, marker.quote, context);

    if (!description || description.length < 20) {
      result.status = "skipped";
      result.visual_description = description || "No description generated";
    } else {
      result.visual_description = description;
      result.status = "critical";
    }
  } catch (err: any) {
    result.status = "error";
    result.error = err.message?.substring(0, 200) || String(err);
  }

  return result;
}

async function processGroup(name: string, workFile: string, screenshotsDir: string, outputFile: string) {
  log(`\n${"=".repeat(60)}`);
  log(`Processing ${name}`);
  log(`${"=".repeat(60)}`);

  const markers: Marker[] = JSON.parse(await Bun.file(workFile).text());
  log(`Total markers: ${markers.length}`);
  await mkdir(screenshotsDir, { recursive: true });

  // Check for existing partial results
  let existingResults: Result[] = [];
  const existingFile = Bun.file(outputFile);
  if (await existingFile.exists()) {
    try {
      existingResults = JSON.parse(await existingFile.text());
      log(`Found ${existingResults.length} existing results, resuming...`);
    } catch { existingResults = []; }
  }

  // Build set of already-processed markers (by vid_id + timestamp)
  const doneKeys = new Set(existingResults.map(r => `${r._vid_id}:${r.timestamp}`));

  // Filter to pending markers
  const pending = markers.filter(m => !doneKeys.has(`${m._vid_id}:${m.timestamp}`));
  log(`Pending: ${pending.length} (already done: ${existingResults.length})`);

  if (pending.length === 0) {
    log(`${name} already complete!`);
    return summarize(existingResults, name, outputFile);
  }

  // Group by video
  const byVideo = new Map<string, Marker[]>();
  for (const m of pending) {
    const list = byVideo.get(m._vid_id) || [];
    list.push(m);
    byVideo.set(m._vid_id, list);
  }

  const allResults = [...existingResults];
  let processed = existingResults.length;

  for (const [videoId, videoMarkers] of byVideo) {
    log(`  Video ${videoId}: ${videoMarkers.length} markers`);

    let streamUrl: string;
    try {
      streamUrl = await getStreamUrl(videoId);
      log(`  Stream URL OK`);
    } catch (err: any) {
      log(`  ERROR stream URL ${videoId}: ${err.message}`);
      for (const m of videoMarkers) {
        allResults.push({
          timestamp: m.timestamp, quote: m.quote, what_is_shown: m.what_is_shown,
          visual_description: "", status: "error", _file: m._file, _vid_id: m._vid_id,
          error: `Stream URL failed: ${err.message?.substring(0, 100)}`,
        });
      }
      processed += videoMarkers.length;
      continue;
    }

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < videoMarkers.length; i += MAX_CONCURRENT) {
      const batch = videoMarkers.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map(marker => processMarker(marker, streamUrl, screenshotsDir))
      );
      allResults.push(...batchResults);
      processed += batch.length;

      // Save intermediate results after each batch
      await Bun.write(outputFile, JSON.stringify(allResults, null, 2));
      log(`  ${processed}/${markers.length} done`);
    }
  }

  return summarize(allResults, name, outputFile);
}

function summarize(results: Result[], name: string, outputFile: string) {
  const critical = results.filter(r => r.status === "critical").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const errors = results.filter(r => r.status === "error").length;
  log(`\n  ${name} COMPLETE: critical=${critical} skipped=${skipped} errors=${errors} total=${results.length}`);
  log(`  Output: ${outputFile}`);
  return { critical, skipped, errors, total: results.length };
}

async function main() {
  log("Visual Marker Processor - Started: " + new Date().toISOString());

  // Process only the group specified by CLI arg, or all
  const arg = process.argv[2]; // "dr", "at", "rm", or undefined for all

  const groups = [
    { key: "dr", name: "DR (Daily Routine)", work: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/dr-work.json", screenshots: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/dr/", output: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/dr-results.json" },
    { key: "at", name: "AT (Active Trading)", work: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/at-work.json", screenshots: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/at/", output: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/at-results.json" },
    { key: "rm", name: "RM (Risk Management)", work: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/rm-work.json", screenshots: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/rm/", output: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/rm-results.json" },
    { key: "css", name: "CSS (Champion Short Setup)", work: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/css-work.json", screenshots: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/css/", output: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/css-results.json" },
    { key: "adv", name: "ADV (Advanced Tactics)", work: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/adv-work.json", screenshots: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/adv/", output: "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/adv-results.json" },
  ];

  const toProcess = arg ? groups.filter(g => g.key === arg) : groups;
  const totals = { critical: 0, skipped: 0, errors: 0, total: 0 };

  for (const group of toProcess) {
    const r = await processGroup(group.name, group.work, group.screenshots, group.output);
    totals.critical += r.critical;
    totals.skipped += r.skipped;
    totals.errors += r.errors;
    totals.total += r.total;
  }

  log(`\nALL DONE: critical=${totals.critical} skipped=${totals.skipped} errors=${totals.errors} total=${totals.total}`);
  log("Finished: " + new Date().toISOString());
}

main().catch(err => { log("FATAL: " + err.message); process.exit(1); });
