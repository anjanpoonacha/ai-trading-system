/**
 * Describe a chart image using Gemini vision.
 *
 * Usage:
 *   bun run describe-chart.ts <image-path>
 *   bun run describe-chart.ts 003-SHYAMMETL/chart.png
 *
 * Output: Factual description of the chart to stdout.
 */

const LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions";
const LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da";
const CASES_DIR = import.meta.dir;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("Usage: bun run describe-chart.ts <image-path>");
    console.log("Example: bun run describe-chart.ts 003-SHYAMMETL/chart.png");
    process.exit(1);
  }

  // Resolve path (relative to cases dir or absolute)
  let imagePath = args[0];
  if (!imagePath.startsWith("/")) {
    imagePath = `${CASES_DIR}/${imagePath}`;
  }

  const file = Bun.file(imagePath);
  if (!(await file.exists())) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
  }

  const imageData = await file.arrayBuffer();
  const b64 = Buffer.from(imageData).toString("base64");
  const mime = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

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
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            {
              type: "text",
              text: `Describe this TradingView chart factually:
- Ticker, exchange, timeframe (1D/1W)
- Date at cursor or rightmost candle (from x-axis)
- Price OHLC at entry/current candle
- Pattern: base, breakout, consolidation, gap, extended, climax
- MA values if readable
- Volume if notable
- Any annotations/drawings visible (lines, arrows, measurements)
Brief and factual only.`,
            },
          ],
        },
      ],
    }),
  });

  const data = await resp.json();
  console.log(data.choices[0].message.content);
}

main();
