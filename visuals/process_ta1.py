#!/usr/bin/env python3
"""Process ta-1.txt markers: extract frames and analyze with Gemini."""

import json
import subprocess
import base64
import urllib.request
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

STREAM_URL = sys.argv[1] if len(sys.argv) > 1 else ""
SCREENSHOTS_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/ta"
OUTPUT_FILE = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-1-results.json"
WORK_FILE = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-work.json"
LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"


def load_markers():
    with open(WORK_FILE) as f:
        data = json.load(f)
    return [m for m in data if m.get("_file") == "ta-1.txt"]


def timestamp_to_seconds(ts):
    parts = ts.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def extract_frame(marker):
    ts = marker["timestamp"]
    seconds = timestamp_to_seconds(ts)
    out_path = os.path.join(SCREENSHOTS_DIR, f"ta-1_{ts.replace(':', '')}.png")

    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return out_path

    result = subprocess.run(
        ["ffmpeg", "-y", "-ss", str(seconds), "-i", STREAM_URL, "-frames:v", "1", out_path],
        capture_output=True,
        timeout=30,
    )
    if result.returncode != 0 or not os.path.exists(out_path):
        print(f"  WARN: ffmpeg failed for {ts}: {result.stderr.decode()[-200:]}")
        return None
    return out_path


def analyze_frame(marker, img_path):
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "model": "gemini-2.5-pro",
        "temperature": 0.1,
        "thinking": {"type": "disabled"},
        "max_tokens": 300,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}},
                    {
                        "type": "text",
                        "text": (
                            f'The speaker says: "{marker["quote"]}"\n\n'
                            "Describe precisely what is shown on screen that makes this statement "
                            "understandable. Include: stock name, price levels, indicator values, "
                            "patterns drawn, annotations visible. Be concise (1-3 sentences)."
                        ),
                    },
                ],
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(LITELLM_URL, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read())
    return result["choices"][0]["message"]["content"]


def classify(description, quote):
    """Determine if visual adds critical context beyond the quote."""
    desc_lower = description.lower()
    # Critical if it reveals patterns, drawings, specific values, annotations
    critical_keywords = [
        "trend line", "trendline", "resistance", "support", "pattern",
        "fibonacci", "drawn", "marked", "annotation", "indicator",
        "moving average", "candle", "breakout", "level", "arrow",
        "highlighted", "circle", "box", "line drawn", "cursor",
        "settings", "panel", "dialog", "menu", "dropdown", "toolbar",
        "configuration", "checkbox", "input field", "color",
        "ohlc", "volume", "wick", "body", "open", "close", "high", "low",
        "risk reward", "stop loss", "entry", "target",
    ]
    # Skip if description is just generic
    skip_keywords = [
        "just shows the stock name",
        "generic chart view",
        "nothing specific visible",
        "blank screen",
        "loading",
    ]

    for kw in skip_keywords:
        if kw in desc_lower:
            return False, f"Generic visual: {kw}"

    for kw in critical_keywords:
        if kw in desc_lower:
            return True, None

    # Default to critical if description has substance (>50 chars)
    if len(description) > 50:
        return True, None

    return False, "No additional technical context beyond quote"


def process_marker(marker):
    ts = marker["timestamp"]
    print(f"  Processing {ts}...")

    img_path = extract_frame(marker)
    if not img_path:
        return {
            "timestamp": ts,
            "file": "ta-1.txt",
            "quote": marker["quote"],
            "screenshot": None,
            "description": "Frame extraction failed",
            "critical": False,
            "skipped_reason": "Frame extraction failed",
        }

    try:
        description = analyze_frame(marker, img_path)
    except Exception as e:
        description = f"Gemini analysis failed: {str(e)[:100]}"
        return {
            "timestamp": ts,
            "file": "ta-1.txt",
            "quote": marker["quote"],
            "screenshot": os.path.basename(img_path),
            "description": description,
            "critical": False,
            "skipped_reason": f"Analysis error: {str(e)[:50]}",
        }

    is_critical, skip_reason = classify(description, marker["quote"])

    return {
        "timestamp": ts,
        "file": "ta-1.txt",
        "quote": marker["quote"],
        "screenshot": os.path.basename(img_path),
        "description": description,
        "critical": is_critical,
        "skipped_reason": skip_reason,
    }


def main():
    if not STREAM_URL:
        print("ERROR: Pass stream URL as first argument")
        sys.exit(1)

    markers = load_markers()
    print(f"Loaded {len(markers)} markers for ta-1.txt")

    # Extract all frames first (sequential, ffmpeg is fast enough)
    print("\n--- Extracting frames ---")
    for m in markers:
        extract_frame(m)

    # Analyze with Gemini using threading (5 concurrent)
    print("\n--- Analyzing with Gemini (5 threads) ---")
    results = [None] * len(markers)

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_idx = {
            executor.submit(process_marker, m): i for i, m in enumerate(markers)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                ts = markers[idx]["timestamp"]
                print(f"  ERROR {ts}: {e}")
                results[idx] = {
                    "timestamp": ts,
                    "file": "ta-1.txt",
                    "quote": markers[idx]["quote"],
                    "screenshot": None,
                    "description": f"Error: {str(e)[:100]}",
                    "critical": False,
                    "skipped_reason": f"Processing error",
                }

    # Save results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    # Summary
    critical_count = sum(1 for r in results if r["critical"])
    skipped_count = sum(1 for r in results if not r["critical"])
    print(f"\n--- DONE ---")
    print(f"Total processed: {len(results)}")
    print(f"Critical: {critical_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
