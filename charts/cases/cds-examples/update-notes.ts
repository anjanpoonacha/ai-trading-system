/**
 * Update metadata notes for a case by combining:
 * 1. What's visible on the chart (via Gemini vision)
 * 2. What the speaker says (from transcript)
 *
 * Usage: bun run charts/cases/cds-examples/update-notes.ts <case-dir>
 * Example: bun run charts/cases/cds-examples/update-notes.ts 003-SHYAMMETL
 */

const LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions";
const LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da";

const CASES_DIR = import.meta.dir;
const TRANSCRIPTS_DIR = `${import.meta.dir}/../../../transcripts`;

// Video ID → transcript file mapping
const VID_TO_TRANSCRIPT: Record<string, string> = {
  "s4V52_T4GvE": "cds-ex-1.txt",
  "aTv2pNEEN_Q": "cds-ex-2.txt",
  "MBONI9t-ziQ": "cds-ex-3.txt",
  "F0njKJGioZA": "cds-ex-4.txt",
  "n0uG60h5HXM": "cds-ex-5.txt",
  "e-2FD5_pYqc": "cds-ex-6.txt",
  "Jva74FVG3M4": "cds-ex-7.txt",
  "SKa9B0bXnHA": "cds-ex-8.txt",
  "x1vTUIROOKs": "cds-ex-9.txt",
  "ckPZqexb4l4": "cds-ex-10.txt",
  "QVQitfBsvz8": "cds-ex-11.txt",
  "esy8HetQgrk": "cds-ex-12.txt",
};

async function callGemini(messages: any[]) {
  const resp = await fetch(LITELLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LITELLM_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      temperature: 0.0,
      max_tokens: 1000,
      thinking: { type: "disabled" },
      messages,
    }),
  });
  const data = await resp.json();
  return data.choices[0].message.content;
}

async function describeChart(imagePath: string): Promise<string> {
  const imageData = await Bun.file(imagePath).arrayBuffer();
  const b64 = Buffer.from(imageData).toString("base64");
  const mime = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  return callGemini([
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        {
          type: "text",
          text: `Describe this TradingView chart factually:
- Stock ticker and exchange
- Timeframe (1D/1W)
- Date visible on x-axis where cursor/entry is (if highlighted)
- Price at entry candle
- Key pattern visible (base, breakout, consolidation, gap)
- MA values if visible
- Volume on entry candle if notable
Be brief and factual. No opinions.`,
        },
      ],
    },
  ]);
}

async function getTranscriptContext(
  videoId: string,
  symbol: string
): Promise<string> {
  const transcriptFile = VID_TO_TRANSCRIPT[videoId];
  if (!transcriptFile) return "(no transcript available)";

  const path = `${TRANSCRIPTS_DIR}/${transcriptFile}`;
  const file = Bun.file(path);
  if (!(await file.exists())) return "(transcript file not found)";

  const content = await file.text();
  const lines = content.split("\n");

  // Find lines mentioning the symbol (case-insensitive, try partial match too)
  const symbolLower = symbol.toLowerCase();
  const searchTerms = [symbolLower, symbolLower.slice(0, 5), symbolLower.slice(0, 4)];
  const matches: string[] = [];
  for (const term of searchTerms) {
    if (term.length < 3) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(term)) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 8);
        matches.push(lines.slice(start, end).join("\n"));
        break;
      }
    }
    if (matches.length > 0) break;
  }

  return matches.length > 0
    ? matches[0]
    : `(symbol "${symbol}" not found in transcript — speaker may say "this stock")`;
}

async function main() {
  const caseDir = process.argv[2];
  if (!caseDir) {
    console.log("Usage: bun run update-notes.ts <case-dir>");
    console.log("Example: bun run update-notes.ts 003-SHYAMMETL");
    process.exit(1);
  }

  const casePath = `${CASES_DIR}/${caseDir}`;
  const metadataPath = `${casePath}/metadata.json`;
  const chartPath = `${casePath}/chart.png`;
  const chartExitPath = `${casePath}/chart-exit.png`;

  // Read current metadata
  const metadata = await Bun.file(metadataPath).json();
  console.log(`\n=== ${caseDir} ===`);
  console.log(`Symbol: ${metadata.symbol}`);
  console.log(`Video: ${metadata.video_id}`);

  // Describe entry chart
  console.log("\n--- Chart (entry) ---");
  const chartDesc = await describeChart(chartPath);
  console.log(chartDesc);

  // Describe exit chart if exists
  let exitDesc = "";
  if (await Bun.file(chartExitPath).exists()) {
    console.log("\n--- Chart (exit) ---");
    exitDesc = await describeChart(chartExitPath);
    console.log(exitDesc);
  }

  // Get transcript context
  console.log("\n--- Transcript context ---");
  const transcript = await getTranscriptContext(
    metadata.video_id,
    metadata.symbol
  );
  console.log(transcript);

  // Generate combined notes
  console.log("\n--- Generating notes ---");
  const notes = await callGemini([
    {
      role: "system",
      content: `You write factual metadata notes for stock chart case studies. Combine what the speaker says with what's visible on the chart. Rules:
- Be factual, no opinions or flattery
- Include: ticker, exchange, timeframe, entry pattern, key price levels from chart
- Quote the speaker briefly if they say something specific about the setup
- Keep it to 2-3 sentences max`,
    },
    {
      role: "user",
      content: `Chart description (entry): ${chartDesc}

Chart description (exit): ${exitDesc || "not available"}

Transcript context: ${transcript}

Write the "notes" field for this case's metadata.json. Symbol: ${metadata.symbol}. Label: ${metadata.label}/${metadata.sub_label}.`,
    },
  ]);
  console.log(notes);

  // Ask to update
  console.log("\n--- Update metadata? (notes will be replaced) ---");
  console.log(`Current notes: ${metadata.notes}`);
  console.log(`New notes: ${notes}`);
}

main();
