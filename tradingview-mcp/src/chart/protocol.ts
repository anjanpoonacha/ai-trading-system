/**
 * Protocol — message framing for stdin/stdout IPC between client and worker.
 *
 * Request (client → worker):  JSON line on stdin
 *   {"bars":[...],"cvd":[...],"options":{...}}\n
 *
 * Response (worker → client): JSON header line + raw binary PNG
 *   {"ok":true,"size":54321}\n
 *   <54321 bytes of PNG>
 *
 * Error response:
 *   {"ok":false,"error":"message"}\n
 *
 * Standalone test: bun src/chart/protocol.ts
 */

import type { ChartRequest, ResponseHeader } from "./types";

const NEWLINE = Buffer.from("\n");

export function encodeRequest(req: ChartRequest): Buffer {
  return Buffer.concat([Buffer.from(JSON.stringify(req)), NEWLINE]);
}

export function decodeRequest(line: string): ChartRequest {
  return JSON.parse(line) as ChartRequest;
}

export function encodeResponseHeader(header: ResponseHeader): Buffer {
  return Buffer.concat([Buffer.from(JSON.stringify(header)), NEWLINE]);
}

export function decodeResponseHeader(line: string): ResponseHeader {
  return JSON.parse(line) as ResponseHeader;
}

export function encodeErrorResponse(error: string): Buffer {
  return encodeResponseHeader({ ok: false, error });
}

export function encodeSuccessResponse(png: Buffer): Buffer {
  const header = encodeResponseHeader({ ok: true, size: png.length });
  return Buffer.concat([header, png]);
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Protocol unit test\n");

  // Test request encode/decode
  const req: ChartRequest = {
    bars: [
      { t: 1700000000, o: 100, h: 110, l: 95, c: 105, v: 1000000 },
      { t: 1700086400, o: 105, h: 115, l: 100, c: 112, v: 1200000 },
    ],
    options: { title: "TEST 1D", width: 800, height: 600 },
  };

  const encoded = encodeRequest(req);
  const decoded = decodeRequest(encoded.toString().trim());
  console.assert(decoded.bars.length === 2, "bars roundtrip failed");
  console.assert(decoded.options?.title === "TEST 1D", "options roundtrip failed");
  console.log("  ✅ Request encode/decode roundtrip");

  // Test response header encode/decode
  const header: ResponseHeader = { ok: true, size: 12345 };
  const headerBuf = encodeResponseHeader(header);
  const headerDecoded = decodeResponseHeader(headerBuf.toString().trim());
  console.assert(headerDecoded.ok === true, "header ok failed");
  console.assert(headerDecoded.size === 12345, "header size failed");
  console.log("  ✅ Response header encode/decode roundtrip");

  // Test error response
  const errBuf = encodeErrorResponse("something broke");
  const errDecoded = decodeResponseHeader(errBuf.toString().trim());
  console.assert(errDecoded.ok === false, "error ok failed");
  console.assert(errDecoded.error === "something broke", "error message failed");
  console.log("  ✅ Error response encode/decode roundtrip");

  // Test full success response (header + binary)
  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]); // PNG magic bytes
  const fullResp = encodeSuccessResponse(fakePng);
  const firstNewline = fullResp.indexOf(0x0a); // \n
  const respHeader = decodeResponseHeader(fullResp.subarray(0, firstNewline).toString());
  const respBody = fullResp.subarray(firstNewline + 1);
  console.assert(respHeader.size === fakePng.length, "full response size mismatch");
  console.assert(respBody.equals(fakePng), "full response body mismatch");
  console.log("  ✅ Full success response (header + binary) roundtrip");

  console.log("\n✅ All protocol tests passed");
}
