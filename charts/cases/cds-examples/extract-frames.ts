/**
 * Extract video frames at specific timestamps for chart cases.
 *
 * Usage:
 *   bun run extract-frames.ts <youtube-url> <case/file:timestamp> [<case/file:timestamp> ...]
 *
 * Examples:
 *   bun run extract-frames.ts https://youtu.be/aTv2pNEEN_Q 003-SHYAMMETL/chart.png:49 003-SHYAMMETL/chart-exit.png:110
 *   bun run extract-frames.ts https://youtu.be/F0njKJGioZA 001-USHAMART-entry/chart.png:7 001-USHAMART-entry/chart-exit.png:74
 */

import { $ } from "bun";
import { existsSync, statSync } from "fs";

const CASES_DIR = import.meta.dir;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: bun run extract-frames.ts <youtube-url> <case/file:timestamp> ...");
    console.log("Example: bun run extract-frames.ts https://youtu.be/aTv2pNEEN_Q 003-SHYAMMETL/chart.png:49");
    process.exit(1);
  }

  const videoUrl = args[0];
  const frameSpecs = args.slice(1);

  // Parse frame specs
  const frames: { path: string; timestamp: number }[] = frameSpecs.map((spec) => {
    const [path, ts] = spec.split(":");
    return { path, timestamp: parseInt(ts) };
  });

  // Get stream URL
  console.log(`Getting stream URL for ${videoUrl}...`);
  const streamUrl = (
    await $`yt-dlp -f "best[height<=1080]" --get-url ${videoUrl}`.quiet().text()
  ).trim();

  // Extract each frame
  for (const { path, timestamp } of frames) {
    const outPath = `${CASES_DIR}/${path}`;
    await $`ffmpeg -y -ss ${timestamp} -i ${streamUrl} -frames:v 1 -q:v 1 ${outPath}`.quiet();

    const size = existsSync(outPath) ? Math.round(statSync(outPath).size / 1024) : 0;
    console.log(`${path}: ${size}KB at t=${timestamp}`);
  }
}

main();
