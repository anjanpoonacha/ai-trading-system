#!/usr/bin/env python3
"""Process CDS visual markers: extract 5-sec MP4 clips and analyze with Gemini 2.5 Pro."""

import json
import subprocess
import os
import re
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Config
WORK_FILE = Path("/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/cds-work.json")
SCREENSHOTS_DIR = Path("/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/cds")
OUTPUT_FILE = Path("/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/cds-results.json")
TRANSCRIPTS_DIR = Path("/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts")

LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "Bearer 1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"
MODEL = "gemini-2.5-pro"

MAX_WORKERS = 5
TRANSITION_KEYWORDS = ["loading", "spinner", "title card", "black screen", "transition", "intro"]

# Skip non-trading videos
SKIP_VIDS = {"qru601JNdWU"}


def parse_timestamp(ts_str: str) -> int:
    """Parse timestamp like '02:36', '02:36-03:07', '11:55-16:05' -> seconds (start)."""
    ts = ts_str.split("-")[0].strip()
    parts = ts.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def get_stream_url(vid_id: str) -> str | None:
    """Get 720p stream URL via yt-dlp."""
    try:
        result = subprocess.run(
            ["yt-dlp", "-f", "best[height<=720]", "--get-url",
             f"https://www.youtube.com/watch?v={vid_id}"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip().split("\n")[0]
    except Exception as e:
        print(f"  [ERROR] yt-dlp failed for {vid_id}: {e}")
    return None


def extract_clip(stream_url: str, timestamp_sec: int, output_path: str) -> bool:
    """Extract 5-second MP4 clip at timestamp via ffmpeg remote seek."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-ss", str(timestamp_sec), "-i", stream_url,
             "-t", "5", "-c:v", "libx264", "-preset", "ultrafast",
             "-an", output_path],
            capture_output=True, text=True, timeout=60
        )
        return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1000
    except Exception as e:
        print(f"  [ERROR] ffmpeg failed: {e}")
        return False


def load_transcript(file_name: str) -> list[dict]:
    """Load transcript file into list of {time_sec, text} entries."""
    path = TRANSCRIPTS_DIR / file_name
    if not path.exists():
        return []
    lines = []
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            match = re.match(r"\[(\d{2}):(\d{2})\]\s*(.*)", line)
            if match:
                mins, secs, text = int(match.group(1)), int(match.group(2)), match.group(3)
                lines.append({"time_sec": mins * 60 + secs, "text": text})
    return lines


def get_transcript_context(transcript: list[dict], timestamp_sec: int, window: int = 30) -> str:
    """Get surrounding transcript lines within window seconds."""
    context_lines = []
    for entry in transcript:
        if abs(entry["time_sec"] - timestamp_sec) <= window:
            context_lines.append(entry["text"])
    return " ... ".join(context_lines[-5:]) if context_lines else ""


def analyze_clip_with_gemini(clip_path: str, quote: str, transcript_context: str) -> str | None:
    """Send MP4 clip + context to Gemini 2.5 Pro via LiteLLM."""
    import base64

    with open(clip_path, "rb") as f:
        video_b64 = base64.b64encode(f.read()).decode()

    prompt = f"""The speaker says: "{quote}"
Transcript context: {transcript_context}
Describe precisely what is shown on screen in this 5-second clip. Include: stock name, price levels, indicator values, patterns drawn, annotations, cursor movements. Be concise (2-4 sentences)."""

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {"url": f"data:video/mp4;base64,{video_b64}"}
                    },
                    {"type": "text", "text": prompt}
                ]
            }
        ],
        "max_tokens": 300
    }

    try:
        import urllib.request
        req = urllib.request.Request(
            LITELLM_URL,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": LITELLM_KEY
            }
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"  [ERROR] Gemini API: {e}")
        return None


def is_transition_frame(description: str) -> bool:
    """Check if description indicates a transition/loading frame."""
    if not description:
        return False
    desc_lower = description.lower()
    return any(kw in desc_lower for kw in TRANSITION_KEYWORDS)


def process_marker(marker: dict, stream_url: str, transcript: list[dict], idx: int) -> dict:
    """Process a single visual marker."""
    timestamp_sec = parse_timestamp(marker["timestamp"])
    vid_id = marker["_vid_id"]
    clip_filename = f"{vid_id}_{idx}_{timestamp_sec}s.mp4"
    clip_path = str(SCREENSHOTS_DIR / clip_filename)

    print(f"  [{idx}] Extracting clip at {marker['timestamp']} ({timestamp_sec}s)...")

    # Extract clip
    success = extract_clip(stream_url, timestamp_sec, clip_path)
    if not success:
        return {
            **marker,
            "status": "skipped",
            "reason": "clip_extraction_failed",
            "gemini_description": None
        }

    # Get transcript context
    context = get_transcript_context(transcript, timestamp_sec)

    # Analyze with Gemini
    description = analyze_clip_with_gemini(clip_path, marker["quote"][:500], context)

    # Check for transition frame -> retry at +3s
    if is_transition_frame(description):
        print(f"  [{idx}] Transition detected, retrying at +3s...")
        retry_sec = timestamp_sec + 3
        retry_path = clip_path.replace(".mp4", "_retry.mp4")
        success = extract_clip(stream_url, retry_sec, retry_path)
        if success:
            description = analyze_clip_with_gemini(retry_path, marker["quote"][:500], context)
            clip_path = retry_path
            # Clean up original
            try:
                os.remove(clip_path.replace("_retry.mp4", ".mp4"))
            except:
                pass

    if not description:
        return {
            **marker,
            "status": "skipped",
            "reason": "gemini_analysis_failed",
            "gemini_description": None
        }

    return {
        **marker,
        "status": "critical",
        "gemini_description": description,
        "clip_file": clip_filename,
        "extracted_at_sec": timestamp_sec
    }


def main():
    print("=" * 60)
    print("CDS Visual Marker Processor")
    print("=" * 60)

    # Load work file
    with open(WORK_FILE) as f:
        markers = json.load(f)

    print(f"Total markers in work file: {len(markers)}")

    # Filter out non-trading videos
    markers = [m for m in markers if m["_vid_id"] not in SKIP_VIDS]
    print(f"After filtering non-trading: {len(markers)}")

    # Group by video
    by_video = {}
    for m in markers:
        vid = m["_vid_id"]
        by_video.setdefault(vid, []).append(m)

    print(f"Videos to process: {len(by_video)}")
    for vid, items in by_video.items():
        print(f"  {vid}: {len(items)} markers")

    results = []
    total_critical = 0
    total_skipped = 0

    for vid_id, vid_markers in by_video.items():
        print(f"\n{'─' * 40}")
        print(f"Processing video: {vid_id} ({len(vid_markers)} markers)")
        print(f"{'─' * 40}")

        # Get stream URL
        print(f"  Getting stream URL...")
        stream_url = get_stream_url(vid_id)
        if not stream_url:
            print(f"  [SKIP] Could not get stream URL for {vid_id}")
            for m in vid_markers:
                results.append({**m, "status": "skipped", "reason": "no_stream_url", "gemini_description": None})
                total_skipped += 1
            continue

        print(f"  Stream URL obtained ({len(stream_url)} chars)")

        # Load transcript
        file_name = vid_markers[0].get("_file", "")
        transcript = load_transcript(file_name)
        print(f"  Transcript loaded: {len(transcript)} lines from {file_name}")

        # Process markers with threading (5 concurrent)
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {}
            for idx, marker in enumerate(vid_markers):
                future = executor.submit(process_marker, marker, stream_url, transcript, idx)
                futures[future] = idx

            for future in as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                    if result["status"] == "critical":
                        total_critical += 1
                    else:
                        total_skipped += 1
                except Exception as e:
                    print(f"  [ERROR] Future failed: {e}")
                    total_skipped += 1

        # Brief pause between videos
        time.sleep(2)

    # Sort results by video then timestamp
    results.sort(key=lambda x: (x.get("_vid_id", ""), parse_timestamp(x.get("timestamp", "0:00"))))

    # Save results
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"DONE")
    print(f"{'=' * 60}")
    print(f"Total processed: {len(results)}")
    print(f"Critical: {total_critical}")
    print(f"Skipped: {total_skipped}")
    print(f"Results saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
