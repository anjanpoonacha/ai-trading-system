import { mkdirSync, renameSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";

const TRANSCRIPTS_DIR = join(import.meta.dir, "..", "transcripts");
const OLD_DIR = join(TRANSCRIPTS_DIR, "old");
const dryRun = process.argv.includes("--dry-run");

if (dryRun) console.log("[DRY RUN]\n");

if (!existsSync(OLD_DIR)) {
  if (!dryRun) mkdirSync(OLD_DIR, { recursive: true });
  console.log(`mkdir ${OLD_DIR}`);
}

const files = await readdir(TRANSCRIPTS_DIR);

// Match *-fine.txt and *-fine-a.txt
const fineFiles = files.filter(
  (f) => f.endsWith("-fine.txt") || f.endsWith("-fine-a.txt")
);

for (const fineFile of fineFiles) {
  // Determine the target base name (remove "-fine" from the filename)
  const targetName = fineFile.replace("-fine", "");

  const finePath = join(TRANSCRIPTS_DIR, fineFile);
  const targetPath = join(TRANSCRIPTS_DIR, targetName);
  const oldPath = join(OLD_DIR, targetName);

  // Move existing base file to old/ if it exists
  if (existsSync(targetPath)) {
    console.log(`move: ${targetName} → old/${targetName}`);
    if (!dryRun) renameSync(targetPath, oldPath);
  }

  // Rename fine version to base name
  console.log(`rename: ${fineFile} → ${targetName}`);
  if (!dryRun) renameSync(finePath, targetPath);
}

if (fineFiles.length === 0) {
  console.log("No *-fine.txt or *-fine-a.txt files found.");
} else {
  console.log(`\nProcessed ${fineFiles.length} file(s).`);
}
