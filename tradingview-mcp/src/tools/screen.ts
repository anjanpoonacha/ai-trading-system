/**
 * tv_screen — screen NSE stocks using pre-configured MarketInOut scans.
 *
 * Reads screens.json at invocation time so config changes are picked up
 * without restarting the MCP server.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScreenConfig {
  [key: string]: {
    url: string;
    description: string;
  };
}

interface Candidate {
  symbol: string;
  price: number;
  date: string;
  scans: string[];
}

interface ScreenOutput {
  candidates: Candidate[];
  summary: {
    screensRun: string[];
    totalUnique: number;
  };
  errors?: string[];
}

// ─── Config loader ───────────────────────────────────────────────────────────

const CONFIG_PATH = import.meta.dir + "/../../screens.json";

async function loadConfig(): Promise<ScreenConfig> {
  const file = Bun.file(CONFIG_PATH);
  return await file.json();
}

// ─── Response parser ─────────────────────────────────────────────────────────

function parseResponse(body: string): Array<{ symbol: string; price: number; date: string }> {
  const results: Array<{ symbol: string; price: number; date: string }> = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split("|");
    if (parts.length < 3) continue;

    const rawSymbol = parts[0];
    const price = parseFloat(parts[1]);
    const rawDate = parts[2];

    // Strip .NS suffix
    const symbol = rawSymbol.replace(/\.NS$/, "");

    // Convert MM/DD/YYYY → YYYY-MM-DD
    const [mm, dd, yyyy] = rawDate.split("/");
    const date = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;

    if (!isNaN(price)) {
      results.push({ symbol, price, date });
    }
  }

  return results;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function handleScreen(input: { screens?: string[] }): Promise<ScreenOutput> {
  const config = await loadConfig();
  const errors: string[] = [];

  // Determine which screens to run
  const requestedScreens = input.screens ?? Object.keys(config);
  const validScreens: string[] = [];

  for (const name of requestedScreens) {
    if (config[name]) {
      validScreens.push(name);
    } else {
      errors.push(`Unknown screen: "${name}"`);
    }
  }

  // Fetch all screens in parallel
  const fetchResults = await Promise.allSettled(
    validScreens.map(async (name) => {
      const resp = await fetch(config[name].url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for screen "${name}"`);
      const body = await resp.text();
      return { name, entries: parseResponse(body) };
    }),
  );

  // Merge results — deduplicate by symbol
  const map = new Map<string, Candidate>();
  const screensRun: string[] = [];

  for (const result of fetchResults) {
    if (result.status === "rejected") {
      errors.push(result.reason?.message ?? "Unknown fetch error");
      continue;
    }

    const { name, entries } = result.value;
    screensRun.push(name);

    for (const entry of entries) {
      const existing = map.get(entry.symbol);
      if (existing) {
        if (!existing.scans.includes(name)) existing.scans.push(name);
        // Use latest price/date
        existing.price = entry.price;
        existing.date = entry.date;
      } else {
        map.set(entry.symbol, { ...entry, scans: [name] });
      }
    }
  }

  // Sort: more scans first, then alphabetically
  const candidates = [...map.values()].sort((a, b) => {
    if (b.scans.length !== a.scans.length) return b.scans.length - a.scans.length;
    return a.symbol.localeCompare(b.symbol);
  });

  const output: ScreenOutput = {
    candidates,
    summary: {
      screensRun,
      totalUnique: candidates.length,
    },
  };

  if (errors.length > 0) output.errors = errors;

  return output;
}

// ─── Standalone test ─────────────────────────────────────────────────────────

if (import.meta.main) {
  console.log("tv_screen standalone test\n");
  console.log("Running screen: ppc");

  const t0 = performance.now();
  const result = await handleScreen({ screens: ["ppc"] });
  const elapsed = (performance.now() - t0).toFixed(0);

  console.log(`\n✅ Done in ${elapsed}ms`);
  console.log(`\nFirst 5 candidates:`);
  for (const c of result.candidates.slice(0, 5)) {
    console.log(`  ${c.symbol.padEnd(20)} ₹${c.price.toFixed(2).padStart(10)}  ${c.date}  [${c.scans.join(", ")}]`);
  }

  console.log(`\nSummary:`);
  console.log(`  Screens run: ${result.summary.screensRun.join(", ")}`);
  console.log(`  Total unique: ${result.summary.totalUnique}`);

  if (result.errors?.length) {
    console.log(`\nErrors:`);
    for (const e of result.errors) console.log(`  ⚠️  ${e}`);
  }
}
