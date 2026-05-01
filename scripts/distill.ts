/**
 * Distill transcripts + visual analysis into final markdown docs.
 * 
 * Usage: bun scripts/distill.ts <section>
 * 
 * Sections: ta, stage, cds, css, rm, adv, cds-ex, dr, at
 */

const LITELLM_URL = "http://localhost:3030/v1/chat/completions";
const MODEL = "claude-sonnet-4-5-20250929";

const BASE = "/Users/i548399/SAPDevelop/github.com/nse-trading-system";
const TRANSCRIPTS = `${BASE}/transcripts`;
const VISUALS = `${BASE}/visuals`;

const SYSTEM_PROMPT_MAIN = `You are distilling a stock trading course video into a precise, actionable reference document.

INPUT: A video transcript with [VISUAL: ...] annotations describing what was shown on screen at key moments.

OUTPUT: A concise markdown document extracting ONLY:
- Specific rules, conditions, and criteria (with exact numbers/thresholds)
- Indicator settings and parameters
- Entry/exit conditions and their logic
- Risk management formulas and metrics
- Step-by-step processes and workflows
- Key definitions and terminology

RULES:
1. Be extremely concise. No fluff, no repetition, no motivational content.
2. Use tables for structured data (conditions, settings, comparisons).
3. Use bullet points for rules and conditions.
4. Where a [VISUAL] annotation describes a chart pattern or example, include it as:
   > Example: [stock name] — [pattern/setup described from visual]
   with a reference: ![screenshot](screenshots/{group}/{filename})
5. Preserve all specific numbers: percentages, periods, multipliers, price levels.
6. Group related concepts under clear headings.
7. If multiple videos cover the same topic, merge and deduplicate — keep the most precise version.
8. Do NOT include: greetings, motivational talk, "see you in the next video", community info, sales pitches.
9. The output is a reference doc for building an automated trading system — every rule must be unambiguous and implementable.
10. Do NOT include the Visual References section — that will be generated separately.`;

const SYSTEM_PROMPT_VISUALS = `You are generating a Visual References appendix for a stock trading course reference document.

INPUT: A video transcript with [VISUAL: ...] annotations describing what was shown on screen at key moments.

OUTPUT: Generate a Visual References section listing EVERY [VISUAL] annotation with:
- The timestamp
- The screenshot filename
- A 1-2 sentence explanation of what the visual shows and why it matters for understanding the concept

Format as:
## Visual References

| Timestamp | Screenshot | Description |
|-----------|------------|-------------|
| HH:MM | ![screenshot](screenshots/{group}/{filename}) | Explanation |

This serves as a visual appendix — a student can look up any referenced screenshot and understand its significance.
Only output the Visual References section. Do not include any other content.`;

interface Section {
  name: string;
  title: string;
  output: string;
  transcripts: string[];
  resultsFiles: string[];
}

const SECTIONS: Record<string, Section> = {
  ta: {
    name: "ta",
    title: "# Technical Analysis",
    output: `${BASE}/01-technical-analysis.md`,
    transcripts: ["ta-1.txt", "ta-2.txt", "ta-3.txt", "ta-4.txt"],
    resultsFiles: ["ta-1-results.json", "ta-2-results.json", "ta-3-results.json", "ta-4-results.json"],
  },
  stage: {
    name: "stage",
    title: "# Stage Analysis",
    output: `${BASE}/02-stage-analysis.md`,
    transcripts: ["stage-1.txt", "stage-2.txt", "stage-3.txt"],
    resultsFiles: ["stage-results.json"],
  },
  cds: {
    name: "cds",
    title: "# Champion Daily Setup (CDS)",
    output: `${BASE}/03-champion-daily-setup.md`,
    transcripts: ["cds-1.txt", "cds-2.txt", "cds-3.txt", "cds-4.txt", "cds-5.txt", "cds-6.txt", "cds-7.txt"],
    resultsFiles: ["cds-results.json"],
  },
  css: {
    name: "css",
    title: "# Champion Swing Short (CSS)",
    output: `${BASE}/04-css-short.md`,
    transcripts: ["css-1.txt", "css-2.txt", "css-3.txt", "css-4.txt"],
    resultsFiles: ["css-results.json"],
  },
  rm: {
    name: "rm",
    title: "# Risk Management",
    output: `${BASE}/05-risk-management.md`,
    transcripts: ["rm-1.txt", "rm-2.txt"],
    resultsFiles: ["rm-results.json"],
  },
  adv: {
    name: "adv",
    title: "# Advanced Tactics",
    output: `${BASE}/06-advanced-tactics.md`,
    transcripts: ["adv-1.txt", "adv-2.txt", "adv-3.txt"],
    resultsFiles: ["adv-results.json"],
  },
  "cds-ex": {
    name: "cds-ex",
    title: "# CDS Examples (Real Trades)",
    output: `${BASE}/07-cds-examples.md`,
    transcripts: Array.from({ length: 12 }, (_, i) => `cds-ex-${i + 1}.txt`),
    resultsFiles: ["cds-ex-results.json"],
  },
  dr: {
    name: "dr",
    title: "# Daily Routine",
    output: `${BASE}/08-daily-routine.md`,
    transcripts: Array.from({ length: 8 }, (_, i) => `dr-${i + 1}.txt`),
    resultsFiles: ["dr-results.json"],
  },
  at: {
    name: "at",
    title: "# Active Trading",
    output: `${BASE}/09-active-trading.md`,
    transcripts: ["at-1.txt", "at-2.txt"],
    resultsFiles: ["at-results.json"],
  },
};

interface VisualResult {
  timestamp: string;
  file: string;
  quote: string;
  clip?: string;
  screenshot?: string;
  description: string;
  critical: boolean;
  skipped_reason?: string | null;
}

async function loadVisualResults(section: Section): Promise<VisualResult[]> {
  const results: VisualResult[] = [];
  for (const rf of section.resultsFiles) {
    const path = `${VISUALS}/${rf}`;
    try {
      const data = await Bun.file(path).json();
      if (Array.isArray(data)) {
        results.push(...data.filter((r: VisualResult) => r.critical));
      }
    } catch {
      console.error(`  Warning: could not read ${rf}`);
    }
  }
  return results;
}

function injectVisuals(transcript: string, visuals: VisualResult[], filename: string, group: string): string {
  const fileVisuals = visuals.filter(v => v.file === filename);
  if (fileVisuals.length === 0) return transcript;

  const lines = transcript.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    result.push(line);
    // Check if any visual matches this line's timestamp
    const tsMatch = line.match(/^\[(\d{2}:\d{2})\]/);
    if (tsMatch) {
      const lineTs = tsMatch[1];
      const matching = fileVisuals.filter(v => v.timestamp === lineTs);
      for (const v of matching) {
        const clipRef = v.clip || v.screenshot || "unknown";
        result.push(`[VISUAL: ${v.description}] ![screenshot](screenshots/${group}/${clipRef})`);
      }
    }
  }

  return result.join("\n");
}

async function callLLM(content: string, systemPrompt: string = SYSTEM_PROMPT_MAIN): Promise<string> {
  const payload = {
    model: MODEL,
    temperature: 0.1,
    max_tokens: 64000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content },
    ],
  };

  const response = await fetch(LITELLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`LLM call failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const finishReason = data.choices[0].finish_reason;
  const result = data.choices[0].message.content;
  if (finishReason === "length") {
    console.warn(`  ⚠ Output truncated (finish_reason=length, ${result.length} chars). Consider splitting further.`);
  }
  return result;
}

async function processSection(sectionKey: string) {
  const section = SECTIONS[sectionKey];
  if (!section) {
    console.error(`Unknown section: ${sectionKey}`);
    console.error(`Available: ${Object.keys(SECTIONS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nProcessing: ${section.title}`);
  console.log(`  Transcripts: ${section.transcripts.length} files`);

  // Load visual results
  const visuals = await loadVisualResults(section);
  console.log(`  Visual markers: ${visuals.length} critical`);

  // Load and enrich transcripts
  const enrichedParts: string[] = [];
  for (const tf of section.transcripts) {
    const path = `${TRANSCRIPTS}/${tf}`;
    try {
      let content = await Bun.file(path).text();
      content = injectVisuals(content, visuals, tf, section.name);
      enrichedParts.push(`\n--- FILE: ${tf} ---\n${content}`);
    } catch {
      console.error(`  Warning: could not read ${tf}`);
    }
  }

  const fullInput = enrichedParts.join("\n");
  console.log(`  Total input: ${(fullInput.length / 1024).toFixed(0)}KB`);

  // Compute visuals output path: insert "-visuals" before .md
  const visualsOutput = section.output.replace(/\.md$/, "-visuals.md");

  // If input is very large (>100KB), split into chunks and distill each, then merge
  let mainContent: string;
  if (fullInput.length > 100_000) {
    console.log(`  Large input — splitting into chunks...`);
    const chunkSize = 60_000;
    const chunks: string[] = [];
    let current = "";

    for (const part of enrichedParts) {
      if (current.length + part.length > chunkSize && current.length > 0) {
        chunks.push(current);
        current = part;
      } else {
        current += part;
      }
    }
    if (current) chunks.push(current);

    console.log(`  ${chunks.length} chunks to process`);

    // Process chunks in parallel
    const chunkResults = await Promise.all(
      chunks.map(async (chunk, i) => {
        console.log(`  Chunk ${i + 1}/${chunks.length} sending...`);
        const result = await callLLM(
          `${section.title}\n\nDistill the following transcript chunk (${i + 1}/${chunks.length}):\n\n${chunk}`
        );
        console.log(`  Chunk ${i + 1} done (${result.length} chars)`);
        return result;
      })
    );

    // If multiple chunks, do a final deduplication merge pass on each pair
    if (chunkResults.length > 1) {
      console.log(`  Deduplicating ${chunkResults.length} chunk results pairwise...`);
      // Merge pairs iteratively until we have one result
      let remaining = [...chunkResults];
      while (remaining.length > 1) {
        const next: string[] = [];
        for (let i = 0; i < remaining.length; i += 2) {
          if (i + 1 < remaining.length) {
            const pairInput = remaining[i] + "\n\n---\n\n" + remaining[i + 1];
            console.log(`    Merging pair (${(pairInput.length / 1024).toFixed(0)}KB input)...`);
            const merged = await callLLM(
              `${section.title}\n\nMerge and deduplicate these two distilled sections into ONE cohesive document. Be extremely concise — remove ALL redundancy, combine overlapping sections under unified headings. Do NOT include a Visual References section. Output must be under 14000 characters:\n\n${pairInput}`
            );
            console.log(`    Pair merged: ${merged.length} chars`);
            next.push(merged);
          } else {
            next.push(remaining[i]);
          }
        }
        remaining = next;
      }
      mainContent = remaining[0];
    } else {
      mainContent = chunkResults[0];
    }
  } else {
    // Single pass
    console.log(`  Sending to LLM (main content)...`);
    mainContent = await callLLM(
      `${section.title}\n\nDistill the following transcripts:\n\n${fullInput}`
    );
  }

  // Save main content
  await Bun.write(section.output, mainContent);
  console.log(`  Saved main: ${section.output} (${mainContent.length} chars)`);

  // Generate visuals appendix — split into chunks if input is large
  console.log(`  Generating visual references...`);
  if (fullInput.length > 100_000) {
    const chunkSize = 80_000;
    const visChunks: string[] = [];
    let current = "";
    for (const part of enrichedParts) {
      if (current.length + part.length > chunkSize && current.length > 0) {
        visChunks.push(current);
        current = part;
      } else {
        current += part;
      }
    }
    if (current) visChunks.push(current);

    const visResults = await Promise.all(
      visChunks.map(async (chunk, i) => {
        console.log(`  Visuals chunk ${i + 1}/${visChunks.length} sending...`);
        const result = await callLLM(
          `${section.title}\n\nGenerate the Visual References appendix from the following transcript chunk (${i + 1}/${visChunks.length}):\n\n${chunk}`,
          SYSTEM_PROMPT_VISUALS
        );
        console.log(`  Visuals chunk ${i + 1} done (${result.length} chars)`);
        return result;
      })
    );

    // Concatenate all visual chunks (strip duplicate headers)
    const combined = visResults.map((r, i) => {
      if (i === 0) return r;
      // Remove the "## Visual References" header and table header from subsequent chunks
      return r.replace(/^## Visual References\s*\n+\|[^\n]+\n\|[-|\s]+\n/m, "");
    }).join("\n");
    await Bun.write(visualsOutput, combined);
    console.log(`  Saved visuals: ${visualsOutput} (${combined.length} chars)`);
  } else {
    const visualsContent = await callLLM(
      `${section.title}\n\nGenerate the Visual References appendix from the following transcripts:\n\n${fullInput}`,
      SYSTEM_PROMPT_VISUALS
    );
    await Bun.write(visualsOutput, visualsContent);
    console.log(`  Saved visuals: ${visualsOutput} (${visualsContent.length} chars)`);
  }
}

// Main
const section = process.argv[2];
if (!section) {
  console.error("Usage: bun scripts/distill.ts <section>");
  console.error(`Sections: ${Object.keys(SECTIONS).join(", ")}`);
  process.exit(1);
}

await processSection(section);
console.log("\nDone.");
