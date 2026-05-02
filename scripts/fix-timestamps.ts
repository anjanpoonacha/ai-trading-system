/**
 * Fix timestamp resets in transcript files.
 * 
 * Problem: Gemini resets to [00:00] at chunk boundaries instead of continuing
 * from the previous chunk's end time.
 * 
 * Fix: Detect resets (where timestamp drops significantly) and add an offset
 * so timestamps are monotonically increasing.
 * 
 * A "reset" is defined as: current raw timestamp < previous raw timestamp - 10s
 * (the 10s tolerance handles minor Gemini timing inconsistencies)
 * 
 * Usage: bun scripts/fix-timestamps.ts [--dry-run]
 */

import { Glob } from "bun";

const TIMESTAMP_RE = /^\[(\d+):(\d{2})\]/;
const DRY_RUN = process.argv.includes("--dry-run");
const RESET_THRESHOLD = 10; // seconds - drop must be more than this to count as reset

interface Reset {
  line: number;
  from: string;
  to: string;
}

interface FileResult {
  filename: string;
  resets: Reset[];
  lastTimestamp: string;
}

function parseTimestamp(line: string): number | null {
  const match = line.match(TIMESTAMP_RE);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function formatTimestamp(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `[${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}]`;
}

async function processFile(path: string): Promise<FileResult | null> {
  const content = await Bun.file(path).text();
  const lines = content.split("\n");

  // First pass: detect resets and compute offsets
  let prevRawTs = -1;
  let cumulativeOffset = 0;
  let resets: Reset[] = [];
  const correctedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(TIMESTAMP_RE);

    if (!match) {
      correctedLines.push(line);
      continue;
    }

    const rawTs = parseInt(match[1]) * 60 + parseInt(match[2]);

    // Detect reset: raw timestamp dropped significantly
    if (prevRawTs >= 0 && rawTs < prevRawTs - RESET_THRESHOLD) {
      // This is a reset. The offset should bridge the gap.
      // New offset = what the previous corrected timestamp was + 5s
      const prevCorrected = prevRawTs + cumulativeOffset;
      cumulativeOffset = prevCorrected + 5 - rawTs;
      resets.push({
        line: i + 1,
        from: formatTimestamp(prevRawTs + (cumulativeOffset - (prevCorrected + 5 - rawTs))),
        to: formatTimestamp(rawTs),
      });
    }

    const correctedTs = rawTs + cumulativeOffset;
    prevRawTs = rawTs;

    const rest = line.slice(match[0].length);
    correctedLines.push(formatTimestamp(correctedTs) + rest);
  }

  if (resets.length === 0) return null;

  const filename = path.split("/").pop()!;
  const lastLine = correctedLines.filter(l => TIMESTAMP_RE.test(l)).pop() || "";
  const lastMatch = lastLine.match(TIMESTAMP_RE);
  const lastTimestamp = lastMatch ? lastMatch[0] : "?";

  if (!DRY_RUN) {
    await Bun.write(path, correctedLines.join("\n"));
  }

  return { filename, resets, lastTimestamp };
}

async function main() {
  const glob = new Glob("*.txt");
  const results: FileResult[] = [];

  for await (const file of glob.scan("transcripts")) {
    // Skip old/ directory
    if (file.startsWith("old/")) continue;
    const result = await processFile(`transcripts/${file}`);
    if (result) results.push(result);
  }

  if (results.length === 0) {
    console.log("No timestamp resets found in any file.");
    return;
  }

  results.sort((a, b) => a.filename.localeCompare(b.filename));

  if (DRY_RUN) console.log("[DRY RUN]\n");

  console.log("Files with timestamp resets:\n");
  for (const r of results) {
    console.log(`  ${r.filename} — ${r.resets.length} reset(s), final: ${r.lastTimestamp}`);
    for (const reset of r.resets) {
      console.log(`    line ${reset.line}: jumped from ${reset.from} back to ${reset.to}`);
    }
  }

  console.log(`\n${DRY_RUN ? "Would fix" : "Fixed"} ${results.length} file(s).`);
}

main();
