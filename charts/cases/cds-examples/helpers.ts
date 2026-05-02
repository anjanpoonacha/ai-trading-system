/**
 * Helper functions for chart case evaluation.
 * Import and use in REPL or other scripts.
 *
 * Usage:
 *   import { describeChart, transcribeSegment, searchTranscript } from "./helpers"
 */

const LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions";
const LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da";
const TRANSCRIPTS_DIR = `${import.meta.dir}/../../../transcripts`;

export async function llm(
  messages: any[],
  model = "gemini-2.5-flash"
): Promise<string> {
  const resp = await fetch(LITELLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LITELLM_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.0,
      max_tokens: 2000,
      thinking: { type: "disabled" },
      messages,
    }),
  });
  const data = await resp.json();
  return data.choices[0].message.content;
}

/** Send an image to Gemini and ask a question about it */
export async function describeImage(
  imagePath: string,
  prompt: string
): Promise<string> {
  const imageData = await Bun.file(imagePath).arrayBuffer();
  const b64 = Buffer.from(imageData).toString("base64");
  const mime = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  return llm([
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        { type: "text", text: prompt },
      ],
    },
  ]);
}

/** Describe a chart.png — returns ticker, timeframe, date, price, pattern */
export async function describeChart(imagePath: string): Promise<string> {
  return describeImage(
    imagePath,
    `Describe this TradingView chart factually in brief:
- Ticker, exchange, timeframe
- Date at cursor/highlighted candle (from x-axis)
- Price at that candle (OHLC if visible)
- Pattern: base, breakout, consolidation, gap, extended, climax
- MA values if visible
- Volume if notable
Be brief. No opinions.`
  );
}

/** Search a transcript file for a symbol, return surrounding context */
export async function searchTranscript(
  transcriptFile: string,
  searchTerm: string,
  contextLines = 8
): Promise<string> {
  const path = `${TRANSCRIPTS_DIR}/${transcriptFile}`;
  const file = Bun.file(path);
  if (!(await file.exists())) return `(file ${transcriptFile} not found)`;

  const content = await file.text();
  const lines = content.split("\n");
  const term = searchTerm.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(term)) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + contextLines);
      return lines.slice(start, end).join("\n");
    }
  }
  return `("${searchTerm}" not found in ${transcriptFile})`;
}

/** Transcribe a segment of audio from a video via Gemini */
export async function transcribeSegment(
  videoId: string,
  startSec: number,
  durationSec = 60
): Promise<string> {
  const { $ } = await import("bun");
  const tmpWav = `/tmp/retranscribe_audio/${videoId}_seg_${startSec}.wav`;
  const tmpM4a = `/tmp/retranscribe_audio/${videoId}.m4a`;

  // Download audio if not cached
  if (!(await Bun.file(tmpM4a).exists())) {
    await $`yt-dlp -x --audio-format m4a -o ${tmpM4a} https://www.youtube.com/watch?v=${videoId}`.quiet();
  }

  // Extract segment
  await $`ffmpeg -y -ss ${startSec} -t ${durationSec} -i ${tmpM4a} -acodec pcm_s16le -ar 16000 -ac 1 ${tmpWav}`.quiet();

  const audioData = await Bun.file(tmpWav).arrayBuffer();
  const b64 = Buffer.from(audioData).toString("base64");

  const startMin = Math.floor(startSec / 60);
  const startSecRem = startSec % 60;

  return llm([
    {
      role: "system",
      content:
        "Transcribe verbatim with 5-second timestamps. Start from the given offset. Every line: [MM:SS] text.",
    },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: `data:audio/wav;base64,${b64}` },
        },
        {
          type: "text",
          text: `Transcribe this audio. Starts at [${String(startMin).padStart(2, "0")}:${String(startSecRem).padStart(2, "0")}]. Use 5-second intervals.`,
        },
      ],
    },
  ]);
}

/** Extract a video frame at a specific timestamp */
export async function extractFrame(
  videoId: string,
  timestamp: number,
  outputPath: string
): Promise<number> {
  const { $ } = await import("bun");
  const streamUrl =
    await $`yt-dlp -f "best[height<=1080]" --get-url https://www.youtube.com/watch?v=${videoId}`
      .quiet()
      .text();

  await $`ffmpeg -y -ss ${timestamp} -i ${streamUrl.trim()} -frames:v 1 -q:v 1 ${outputPath}`.quiet();

  const file = Bun.file(outputPath);
  return (await file.exists()) ? file.size : 0;
}
