/**
 * Transcribe a segment of a YouTube video's audio via Gemini.
 *
 * Usage:
 *   bun run transcribe-segment.ts <youtube-url> <start-seconds> [duration-seconds]
 *
 * Examples:
 *   bun run transcribe-segment.ts https://youtu.be/aTv2pNEEN_Q 49 60
 *   bun run transcribe-segment.ts https://youtu.be/F0njKJGioZA 0 90
 *
 * Output: 5-second timestamped transcription to stdout.
 */

import { $ } from "bun";

const LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions";
const LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da";
const TMP_DIR = "/tmp/retranscribe_audio";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: bun run transcribe-segment.ts <youtube-url> <start-seconds> [duration=60]");
    process.exit(1);
  }

  const videoUrl = args[0];
  const startSec = parseInt(args[1]);
  const duration = parseInt(args[2] || "60");

  // Extract video ID from URL
  const vidMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (!vidMatch) {
    console.error("Invalid YouTube URL");
    process.exit(1);
  }
  const videoId = vidMatch[1];

  await $`mkdir -p ${TMP_DIR}`.quiet();

  // Download audio if not cached
  const audioPath = `${TMP_DIR}/${videoId}.m4a`;
  if (!(await Bun.file(audioPath).exists())) {
    console.error(`Downloading audio for ${videoId}...`);
    await $`yt-dlp -x --audio-format m4a -o ${audioPath} https://www.youtube.com/watch?v=${videoId}`.quiet();
  }

  // Extract segment as WAV
  const segPath = `${TMP_DIR}/${videoId}_seg_${startSec}_${duration}.wav`;
  await $`ffmpeg -y -ss ${startSec} -t ${duration} -i ${audioPath} -acodec pcm_s16le -ar 16000 -ac 1 ${segPath}`.quiet();

  // Send to Gemini
  const audioData = await Bun.file(segPath).arrayBuffer();
  const b64 = Buffer.from(audioData).toString("base64");

  const startMin = Math.floor(startSec / 60);
  const startSecRem = startSec % 60;
  const offset = `${String(startMin).padStart(2, "0")}:${String(startSecRem).padStart(2, "0")}`;

  const resp = await fetch(LITELLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LITELLM_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      temperature: 0.0,
      max_tokens: 4000,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "system",
          content: `Transcribe this stock trading course audio verbatim with 5-second timestamps starting at [${offset}]. Every line must start with [MM:SS]. Preserve stock names and technical terms exactly.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:audio/wav;base64,${b64}` } },
            { type: "text", text: `Transcribe from [${offset}], 5-second intervals.` },
          ],
        },
      ],
    }),
  });

  const data = await resp.json();
  console.log(data.choices[0].message.content);
}

main();
