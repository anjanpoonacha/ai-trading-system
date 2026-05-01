/**
 * TradingView Authentication
 *
 * Fetches JWT auth token from TradingView using session cookies.
 * Caches token in memory (14 min TTL, tokens expire at 15 min).
 *
 * Run standalone: TV_SESSION_ID=xxx TV_SESSION_SIGN=yyy bun src/connection/auth.ts
 */

interface CachedToken {
  token: string;
  expiresAt: number; // unix ms
}

let cached: CachedToken | null = null;

/**
 * Get auth token for TradingView WebSocket.
 * Returns "unauthorized_user_token" if no credentials configured.
 */
export async function getAuthToken(): Promise<string> {
  const sessionId = process.env.TV_SESSION_ID;
  const sessionSign = process.env.TV_SESSION_SIGN;

  if (!sessionId) return "unauthorized_user_token";

  // Check cache
  if (cached && cached.expiresAt > Date.now()) return cached.token;

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
    throw new Error("Failed to extract auth_token from TradingView. Session may be expired.");
  }

  const token = match[1];

  // Decode JWT to get expiry
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    cached = { token, expiresAt: (payload.exp * 1000) - 60000 }; // 1 min safety buffer
  } catch {
    // If can't decode, cache for 14 min
    cached = { token, expiresAt: Date.now() + 14 * 60 * 1000 };
  }

  return token;
}

/**
 * Fetch CVD indicator script + inputs from pine-facade.
 * Returns the inputs object ready for create_study.
 * Accepts optional CVDConfig to override default parameters.
 * Caches base script for 24h (the script never changes).
 */
import type { CVDConfig } from "../types";

let cvdCache: { inputs: Record<string, unknown>; fetchedAt: number } | null = null;

export async function getCVDInputs(config?: CVDConfig): Promise<Record<string, unknown>> {
  // Fetch base inputs (cached)
  if (!cvdCache || Date.now() - cvdCache.fetchedAt > 24 * 60 * 60 * 1000) {
    const sessionId = process.env.TV_SESSION_ID;
    const sessionSign = process.env.TV_SESSION_SIGN;
    if (!sessionId) throw new Error("TV_SESSION_ID required for CVD indicator");

    const cookie = `sessionid=${sessionId}${sessionSign ? `; sessionid_sign=${sessionSign}` : ""}`;
    const url = "https://pine-facade.tradingview.com/pine-facade/translate/STD%3BCumulative%251Volume%251Delta/7.0";

    const resp = await fetch(url, { headers: { Cookie: cookie } });
    const data = (await resp.json()) as any;

    if (!data.success) {
      throw new Error(`CVD config fetch failed: ${data.message || JSON.stringify(data)}`);
    }

    const mi = data.result.metaInfo;
    const inputs: Record<string, unknown> = {
      text: data.result.ilTemplate,
      pineId: mi.scriptIdPart,
      pineVersion: mi.pine.version,
    };

    for (const inp of mi.inputs) {
      if (["text", "pineId", "pineVersion"].includes(inp.id)) continue;
      inputs[inp.id] = { v: inp.defval, f: !!inp.isFake, t: inp.type };
    }

    cvdCache = { inputs, fetchedAt: Date.now() };
  }

  // Clone and apply config overrides
  const inputs = structuredClone(cvdCache.inputs);

  if (config) {
    // in_0: Anchor period (resolution type, e.g. "12M", "1M", "1W", "1D")
    if (config.anchorPeriod !== undefined) {
      (inputs.in_0 as any).v = config.anchorPeriod;
    }
    // in_1: Use custom timeframe (boolean)
    if (config.useCustomTimeframe !== undefined) {
      (inputs.in_1 as any).v = config.useCustomTimeframe;
    }
    // in_2: Custom timeframe resolution (e.g. "30S", "1", "5")
    if (config.timeframe !== undefined) {
      (inputs.in_2 as any).v = config.timeframe;
    }
  }

  return inputs;
}

/**
 * Check if auth is configured (has session cookies)
 */
export function hasAuth(): boolean {
  return !!process.env.TV_SESSION_ID;
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Auth standalone test\n");

  if (!process.env.TV_SESSION_ID) {
    console.log("No TV_SESSION_ID set — will use unauthorized_user_token");
    const token = await getAuthToken();
    console.log(`Token: ${token}`);
    console.log("\nTo test with auth: TV_SESSION_ID=xxx TV_SESSION_SIGN=yyy bun src/connection/auth.ts");
  } else {
    console.log("Fetching auth token...");
    const token = await getAuthToken();
    console.log(`✅ Token: ${token.slice(0, 30)}...`);

    console.log("\nFetching CVD config...");
    const cvdInputs = await getCVDInputs();
    console.log(`✅ CVD script: ${(cvdInputs.text as string).length} chars`);
    console.log(`   pineId: ${cvdInputs.pineId}`);
    console.log(`   pineVersion: ${cvdInputs.pineVersion}`);
  }
}
