/**
 * POC: TradingView WebSocket — Verify NSE data access + completion signal
 *
 * Tests:
 * 1. Does `unauthorized_user_token` give us NSE daily bars?
 * 2. Does `series_completed` arrive as reliable "done" signal?
 * 3. How fast is it? (latency per symbol)
 * 4. Can we switch symbols with modify_series?
 *
 * Run: bun scripts/poc-websocket.ts
 * With auth: TV_SESSION_ID=xxx TV_SESSION_SIGN=yyy bun scripts/poc-websocket.ts
 */

import { WebSocket } from "ws";

const WS_URL = "wss://data.tradingview.com/socket.io/websocket?from=chart/&type=chart";
const SYMBOLS = ["NSE:RELIANCE", "NSE:TCS", "NSE:INFY"];
const TIMEFRAME = "1D";
const BAR_COUNT = 100;

// --- Protocol helpers ---

function formatMsg(msg: object): string {
  const json = JSON.stringify(msg);
  return `~m~${json.length}~m~${json}`;
}

function parseMessages(raw: string): Array<{ type: "ping"; data: string } | { type: "json"; data: any }> {
  const results: Array<{ type: "ping"; data: string } | { type: "json"; data: any }> = [];
  const parts = raw.split(/~m~\d+~m~/).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith("~h~")) {
      results.push({ type: "ping", data: `~m~${part.length}~m~${part}` });
    } else {
      try {
        results.push({ type: "json", data: JSON.parse(part) });
      } catch {
        // skip unparseable
      }
    }
  }
  return results;
}

function genId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 14);
}

// --- Auth ---

async function getAuthToken(): Promise<string> {
  const sessionId = process.env.TV_SESSION_ID;
  const sessionSign = process.env.TV_SESSION_SIGN;

  if (!sessionId) {
    console.log("⚠️  No TV_SESSION_ID — using unauthorized_user_token (free/delayed data)\n");
    return "unauthorized_user_token";
  }

  console.log("🔑 Fetching auth token from TradingView...");
  const cookie = `sessionid=${sessionId}${sessionSign ? `; sessionid_sign=${sessionSign}` : ""}`;

  const resp = await fetch("https://www.tradingview.com/", {
    headers: {
      Cookie: cookie,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    redirect: "follow",
  });

  const html = await resp.text();
  const match = html.match(/"auth_token":"([^"]+)"/);
  if (!match) {
    console.log("⚠️  Could not extract auth_token — falling back to unauthorized\n");
    return "unauthorized_user_token";
  }

  console.log(`✅ Got auth token (${match[1].slice(0, 20)}...)\n`);
  return match[1];
}

// --- Main test ---

async function main() {
  const authToken = await getAuthToken();
  const chartSession = genId("cs_");
  const wsUrl = authToken === "unauthorized_user_token"
    ? "wss://data.tradingview.com/socket.io/websocket?from=chart/&type=chart"
    : "wss://prodata.tradingview.com/socket.io/websocket?from=chart/&type=chart";

  console.log(`📡 Connecting to ${wsUrl}`);
  console.log(`📊 Chart session: ${chartSession}`);
  console.log(`🎯 Symbols: ${SYMBOLS.join(", ")}`);
  console.log(`⏱️  Timeframe: ${TIMEFRAME}, Bars: ${BAR_COUNT}\n`);

  const ws = new WebSocket(wsUrl, {
    headers: {
      Origin: "https://www.tradingview.com",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  let symbolIndex = 0;
  let barsReceived = 0;
  let startTime = 0;
  const results: Array<{ symbol: string; bars: number; timeMs: number; firstBar: any; lastBar: any }> = [];

  function send(m: string, p: any[]) {
    ws.send(formatMsg({ m, p }));
  }

  function startNextSymbol() {
    const symbol = SYMBOLS[symbolIndex];
    barsReceived = 0;
    startTime = performance.now();

    const symResolveId = `sds_sym_${symbolIndex}`;
    send("resolve_symbol", [
      chartSession,
      symResolveId,
      "=" + JSON.stringify({ symbol, adjustment: "splits" }),
    ]);

    if (symbolIndex === 0) {
      send("create_series", [chartSession, "sds_1", "s0", symResolveId, TIMEFRAME, BAR_COUNT, ""]);
    } else {
      send("modify_series", [chartSession, "sds_1", `s${symbolIndex}`, symResolveId, TIMEFRAME, ""]);
    }
  }

  ws.on("open", () => {
    console.log("✅ WebSocket connected\n");
  });

  ws.on("message", (raw: Buffer) => {
    const messages = parseMessages(raw.toString());

    for (const msg of messages) {
      // Echo heartbeats immediately
      if (msg.type === "ping") {
        ws.send(msg.data);
        continue;
      }

      const data = msg.data;

      // Session handshake — send auth + create chart session
      if (data.session_id) {
        console.log(`🤝 Session: ${data.session_id} (via ${data.via || "unknown"})`);
        send("set_auth_token", [authToken]);
        send("chart_create_session", [chartSession, ""]);
        // Start first symbol
        startNextSymbol();
        continue;
      }

      if (!data.m) continue;

      // Symbol resolved
      if (data.m === "symbol_resolved") {
        const meta = data.p[2];
        console.log(`  ✓ Resolved: ${meta.full_name || meta.name} (${meta.exchange})`);
        continue;
      }

      // Symbol error
      if (data.m === "symbol_error") {
        const elapsed = (performance.now() - startTime).toFixed(0);
        console.log(`  ❌ Symbol error: ${data.p[1]} — ${data.p[2]} (${elapsed}ms)`);
        results.push({ symbol: SYMBOLS[symbolIndex], bars: 0, timeMs: +elapsed, firstBar: null, lastBar: null });
        symbolIndex++;
        if (symbolIndex < SYMBOLS.length) {
          startNextSymbol();
        } else {
          printResults();
          ws.close();
        }
        continue;
      }

      // Data update (bars arriving)
      if (data.m === "timescale_update" || data.m === "du") {
        const payload = data.p[1];
        if (payload && payload.sds_1 && payload.sds_1.s) {
          barsReceived += payload.sds_1.s.length;
        }
        continue;
      }

      // Series completed — THE completion signal
      if (data.m === "series_completed") {
        const elapsed = (performance.now() - startTime).toFixed(0);
        const symbol = SYMBOLS[symbolIndex];

        // Get first and last bar timestamps for context
        console.log(`  ✅ ${symbol}: ${barsReceived} bars in ${elapsed}ms`);

        results.push({ symbol, bars: barsReceived, timeMs: +elapsed, firstBar: null, lastBar: null });

        symbolIndex++;
        if (symbolIndex < SYMBOLS.length) {
          startNextSymbol();
        } else {
          printResults();
          ws.close();
        }
        continue;
      }

      // Log other message types (for discovery)
      if (!["series_loading", "study_loading", "studies_metadata"].includes(data.m)) {
        // Uncomment for debugging:
        // console.log(`  📨 ${data.m}`);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
    process.exit(1);
  });

  ws.on("close", () => {
    console.log("\n🔌 Connection closed");
    process.exit(0);
  });

  // Safety timeout
  setTimeout(() => {
    console.error("\n⏰ Timeout after 30s — something went wrong");
    ws.close();
    process.exit(1);
  }, 30000);

  function printResults() {
    console.log("\n" + "═".repeat(60));
    console.log("📊 RESULTS");
    console.log("═".repeat(60));
    console.log(`  Auth: ${authToken === "unauthorized_user_token" ? "FREE (unauthorized)" : "AUTHENTICATED"}`);
    console.log(`  Endpoint: ${wsUrl.split("/socket")[0]}`);
    console.log(`  Timeframe: ${TIMEFRAME}, Requested: ${BAR_COUNT} bars\n`);

    for (const r of results) {
      const status = r.bars > 0 ? "✅" : "❌";
      console.log(`  ${status} ${r.symbol.padEnd(15)} ${String(r.bars).padStart(4)} bars  ${String(r.timeMs).padStart(5)}ms`);
    }

    const totalMs = results.reduce((s, r) => s + r.timeMs, 0);
    const avgMs = results.length > 0 ? (totalMs / results.length).toFixed(0) : 0;
    console.log(`\n  Total: ${totalMs}ms | Avg: ${avgMs}ms/symbol`);

    if (results.every((r) => r.bars > 0)) {
      console.log("\n  🎉 NSE data works on free endpoint! No auth needed for historical bars.");
    } else if (results.every((r) => r.bars === 0)) {
      console.log("\n  ⚠️  No bars received. NSE may require authentication.");
    } else {
      console.log("\n  ⚠️  Partial results. Some symbols may be gated.");
    }
    console.log("═".repeat(60));
  }
}

main();
