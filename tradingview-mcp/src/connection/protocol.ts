/**
 * TradingView WebSocket Protocol Handler
 *
 * Handles the custom ~m~ frame format and message construction.
 * Pure functions, no state, no network dependency.
 *
 * Run standalone: bun src/connection/protocol.ts
 */

export interface TVMessage {
  m: string;
  p: unknown[];
}

export type ParsedFrame =
  | { type: "heartbeat"; raw: string }
  | { type: "session"; data: Record<string, unknown> }
  | { type: "message"; data: TVMessage };

/**
 * Encode a message into TradingView's wire format: ~m~<len>~m~<json>
 */
export function encodeFrame(msg: object): string {
  const json = JSON.stringify(msg);
  return `~m~${json.length}~m~${json}`;
}

/**
 * Parse a raw WebSocket frame into typed messages.
 * A single frame can contain multiple concatenated messages.
 */
export function parseFrame(raw: string): ParsedFrame[] {
  const results: ParsedFrame[] = [];
  const parts = raw.split(/~m~\d+~m~/).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith("~h~")) {
      results.push({ type: "heartbeat", raw: `~m~${part.length}~m~${part}` });
      continue;
    }
    try {
      const parsed = JSON.parse(part);
      if (parsed.session_id) {
        results.push({ type: "session", data: parsed });
      } else if (parsed.m && parsed.p) {
        results.push({ type: "message", data: parsed as TVMessage });
      }
    } catch {
      // skip unparseable fragments
    }
  }

  return results;
}

/**
 * Generate a random session ID with prefix (e.g., "cs_abc123def456")
 */
export function genSessionId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 14);
}

// --- Message constructors ---

export function msgSetAuth(token: string): object {
  return { m: "set_auth_token", p: [token] };
}

export function msgCreateChartSession(sessionId: string): object {
  return { m: "chart_create_session", p: [sessionId, ""] };
}

export function msgResolveSymbol(chartSession: string, resolveId: string, symbol: string, adjustment = "splits"): object {
  return {
    m: "resolve_symbol",
    p: [chartSession, resolveId, "=" + JSON.stringify({ symbol, adjustment })],
  };
}

export function msgCreateSeries(
  chartSession: string,
  seriesId: string,
  turnaroundId: string,
  symbolResolveId: string,
  timeframe: string,
  barCount: number,
): object {
  return {
    m: "create_series",
    p: [chartSession, seriesId, turnaroundId, symbolResolveId, timeframe, barCount, ""],
  };
}

export function msgModifySeries(
  chartSession: string,
  seriesId: string,
  turnaroundId: string,
  symbolResolveId: string,
  timeframe: string,
): object {
  return {
    m: "modify_series",
    p: [chartSession, seriesId, turnaroundId, symbolResolveId, timeframe, ""],
  };
}

export function msgCreateStudy(
  chartSession: string,
  studyId: string,
  seriesId: string,
  type: string,
  inputs: Record<string, unknown>,
): object {
  return {
    m: "create_study",
    p: [chartSession, studyId, "st1", seriesId, type, inputs],
  };
}

export function msgRequestMoreData(chartSession: string, seriesId: string, count: number): object {
  return { m: "request_more_data", p: [chartSession, seriesId, count] };
}

export function msgRemoveStudy(chartSession: string, studyId: string): object {
  return { m: "remove_study", p: [chartSession, studyId] };
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Protocol unit test\n");

  // Test encode
  const encoded = encodeFrame({ m: "set_auth_token", p: ["test_token"] });
  console.log("Encoded:", encoded);
  console.assert(encoded.startsWith("~m~"), "should start with ~m~");

  // Test parse - heartbeat
  const hb = parseFrame("~m~4~m~~h~3");
  console.assert(hb[0].type === "heartbeat", "should parse heartbeat");
  console.log("Heartbeat:", hb[0]);

  // Test parse - session
  const sess = parseFrame('~m~20~m~{"session_id":"abc"}');
  console.assert(sess[0].type === "session", "should parse session");
  console.log("Session:", sess[0]);

  // Test parse - message
  const msg = parseFrame('~m~30~m~{"m":"test","p":["hello"]}');
  console.assert(msg[0].type === "message", "should parse message");
  console.log("Message:", msg[0]);

  // Test parse - multiple messages in one frame
  const multi = parseFrame('~m~4~m~~h~1~m~30~m~{"m":"test","p":["hello"]}');
  console.assert(multi.length === 2, "should parse multiple");
  console.log("Multi:", multi.length, "messages");

  // Test genSessionId
  const sid = genSessionId("cs_");
  console.assert(sid.startsWith("cs_") && sid.length === 15, "session id format");
  console.log("SessionId:", sid);

  // Test message constructors
  console.log("\nMessage constructors:");
  console.log("  resolve_symbol:", JSON.stringify(msgResolveSymbol("cs_abc", "sds_sym_0", "NSE:RELIANCE")));
  console.log("  create_series:", JSON.stringify(msgCreateSeries("cs_abc", "sds_1", "s0", "sds_sym_0", "1D", 300)));

  console.log("\n✅ All protocol tests passed");
}
