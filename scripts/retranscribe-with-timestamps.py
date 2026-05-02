"""
Re-transcribe videos with fine-grained (5-second) timestamps.
Downloads M4A audio, sends whole file (if <10min) or 10-min chunks to Gemini 2.5 Flash.
Processes videos in parallel (5 concurrent workers).

Usage:
  python3 scripts/retranscribe-with-timestamps.py          # all videos
  python3 scripts/retranscribe-with-timestamps.py cds-ex-12  # single file
"""

import sys, json, os, base64, urllib.request, subprocess, time
from concurrent.futures import ThreadPoolExecutor, as_completed

LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"
MODEL = "gemini-2.5-flash"
MAX_WORKERS = 5
CHUNK_SECONDS = 600  # 10-min chunks — fewer seams = fewer timestamp resets

TRANSCRIPT_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts"
TMP_DIR = "/tmp/retranscribe_audio"

SYSTEM_PROMPT = """You are transcribing a stock trading course video (Indian market NSE + US market).

CRITICAL FORMAT RULES:
1. Output MUST be in 5-SECOND segments
2. Each segment MUST start on a new line with the timestamp: [MM:SS]
3. Timestamps are cumulative from the start of the audio segment
4. Transcribe EVERY word exactly as spoken
5. Preserve technical terms exactly: TRP, CDS, CSS, PPC, DMA, ARR, RPT, MBB, BA, S1B, S2, NPC, LOD, ADT, V-bottom, buying climax, extended entry, stage 2, breakout, consolidation

Example output format:
[00:00] Hi traders, today we will look at...
[00:05] a few examples of extended entries and why we should avoid them.
[00:10] So let us start with this stock. Look at this chart...
[00:15] the stock gave a beautiful breakout here at this level...

NEVER output paragraphs without [MM:SS] prefixes. EVERY line of output must start with [MM:SS]."""


# Video IDs that need re-transcription (from playlist-index.json)
VIDEOS_TO_REDO = {
    "cds-ex-1.txt": "s4V52_T4GvE",
    "cds-ex-2.txt": "aTv2pNEEN_Q",
    "cds-ex-3.txt": "MBONI9t-ziQ",
    "cds-ex-4.txt": "F0njKJGioZA",
    "cds-ex-5.txt": "n0uG60h5HXM",
    "cds-ex-6.txt": "e-2FD5_pYqc",
    "cds-ex-7.txt": "Jva74FVG3M4",
    "cds-ex-8.txt": "SKa9B0bXnHA",
    "cds-ex-9.txt": "x1vTUIROOKs",
    "cds-ex-10.txt": "ckPZqexb4l4",
    "cds-ex-11.txt": "QVQitfBsvz8",
    "cds-ex-12.txt": "esy8HetQgrk",
    "at-2.txt": "uP-MO7aow1Q",
    "dr-2.txt": "EEjTQcSekwA",
    "dr-4.txt": "kcLgkznqwFc",
    "dr-5.txt": "R1ebFP4lv8w",
    "dr-7.txt": "5Qg7fRS42v8",
}


def download_audio(vid_id):
    """Download audio for a video. Returns path to m4a file."""
    import yt_dlp
    audio_path = f"{TMP_DIR}/{vid_id}.m4a"
    if os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000:
        return audio_path

    dl_opts = {
        "quiet": True,
        "remote_components": ["ejs:github"],
        "format": "bestaudio[ext=m4a]/bestaudio",
        "outtmpl": audio_path,
    }
    with yt_dlp.YoutubeDL(dl_opts) as ydl:
        ydl.download([f"https://www.youtube.com/watch?v={vid_id}"])
    return audio_path


def get_audio_duration(path):
    """Get duration in seconds."""
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path], stderr=subprocess.DEVNULL
        ).decode().strip()
        return int(float(out))
    except:
        return 600  # default 10 min


def split_audio(audio_path, chunk_seconds=None):
    """Split audio into M4A chunks (or return whole file if short enough).
    Returns list of (chunk_path, start_seconds, mime_type)."""
    if chunk_seconds is None:
        chunk_seconds = CHUNK_SECONDS
    duration = get_audio_duration(audio_path)
    vid_id = os.path.splitext(os.path.basename(audio_path))[0]

    # If video fits in one chunk, send the whole M4A directly
    if duration <= chunk_seconds:
        return [(audio_path, 0, "audio/mp4")]

    # Otherwise split into M4A chunks
    chunks = []
    for start in range(0, duration, chunk_seconds):
        chunk_path = f"{TMP_DIR}/{vid_id}_chunk_{start}.m4a"
        if not os.path.exists(chunk_path) or os.path.getsize(chunk_path) < 1000:
            subprocess.run(
                ["ffmpeg", "-y", "-i", audio_path, "-ss", str(start),
                 "-t", str(chunk_seconds), "-vn", "-acodec", "aac",
                 "-b:a", "64k", chunk_path],
                capture_output=True
            )
        if os.path.exists(chunk_path) and os.path.getsize(chunk_path) > 1000:
            chunks.append((chunk_path, start, "audio/mp4"))

    return chunks


def transcribe_chunk(chunk_path, start_offset_seconds, title, mime_type="audio/mp4"):
    """Transcribe a single audio chunk via Gemini."""
    with open(chunk_path, 'rb') as f:
        audio_b64 = base64.b64encode(f.read()).decode('utf-8')

    offset_min = start_offset_seconds // 60
    offset_sec = start_offset_seconds % 60

    user_msg = (
        f"Transcribe this audio segment from '{title}'. "
        f"This is a CONTINUATION — the audio you are hearing starts at [{offset_min:02d}:{offset_sec:02d}] in the full video. "
        f"Your FIRST timestamp MUST be [{offset_min:02d}:{offset_sec:02d}]. "
        f"Increment by ~5 seconds from there. "
        f"NEVER output [00:00] unless this is genuinely the start of the video. "
        f"Every line MUST start with [MM:SS] format. Timestamps must be monotonically increasing."
    )

    payload = {
        "model": MODEL,
        "temperature": 0.0,
        "max_tokens": 65536,
        "thinking": {"type": "disabled"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{audio_b64}"}},
                {"type": "text", "text": user_msg}
            ]}
        ]
    }

    data = json.dumps(payload).encode()
    headers = {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(LITELLM_URL, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=600) as resp:
        result = json.loads(resp.read())

    usage = result.get('usage', {})
    if usage.get('prompt_tokens', 0) < 100:
        raise Exception(f"Audio not received (prompt_tokens={usage.get('prompt_tokens')})")

    return result['choices'][0]['message']['content']


def process_video(filename, vid_id):
    """Full pipeline for one video: download → split → transcribe → save."""
    # Read existing file to get title
    existing_path = f"{TRANSCRIPT_DIR}/{filename}"
    title = filename
    if os.path.exists(existing_path):
        with open(existing_path, 'r') as f:
            first_line = f.readline().strip()
            if first_line.startswith('# '):
                title = first_line[2:]

    # Download
    audio_path = download_audio(vid_id)

    # Split into chunks (or send whole file if short)
    chunks = split_audio(audio_path)

    # Transcribe each chunk
    transcript_parts = []
    for chunk_path, start_sec, mime_type in chunks:
        try:
            text = transcribe_chunk(chunk_path, start_sec, title, mime_type)
            transcript_parts.append(text)
        except Exception as e:
            transcript_parts.append(f"[ERROR at offset {start_sec}s: {e}]")
        time.sleep(0.5)  # rate limit between chunks

    # Assemble
    header = (
        f"# {title}\n"
        f"# Video ID: {vid_id}\n"
        f"# URL: https://www.youtube.com/watch?v={vid_id}\n"
        f"# Granularity: 5-second segments\n\n"
    )
    full_text = header + '\n'.join(transcript_parts)

    # Save as -fine.txt (preserves original 30s transcript)
    base = filename.replace('.txt', '')
    output_path = f"{TRANSCRIPT_DIR}/{base}-fine.txt"
    with open(output_path, 'w') as f:
        f.write(full_text)

    return f"{base}-fine.txt", len(full_text)


def main():
    os.makedirs(TMP_DIR, exist_ok=True)

    # Allow filtering by prefix: python3 script.py cds-ex-12
    filter_prefix = sys.argv[1] if len(sys.argv) > 1 else None

    videos = VIDEOS_TO_REDO
    if filter_prefix:
        videos = {k: v for k, v in VIDEOS_TO_REDO.items() if filter_prefix in k}
        if not videos:
            print(f"No match for '{filter_prefix}'. Available: {list(VIDEOS_TO_REDO.keys())}")
            sys.exit(1)

    print(f"Re-transcribing {len(videos)} files with {MAX_WORKERS} parallel workers")
    print(f"Model: {MODEL} | 5-second granularity | {CHUNK_SECONDS}s chunks\n")

    results = {}
    completed = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_video, filename, vid_id): filename
            for filename, vid_id in videos.items()
        }

        for future in as_completed(futures):
            filename = futures[future]
            completed += 1
            try:
                fname, size = future.result()
                results[fname] = size
                print(f"  [{completed}/{len(videos)}] {fname}: {size} chars")
            except Exception as e:
                results[filename] = f"ERROR: {e}"
                print(f"  [{completed}/{len(videos)}] {filename}: ERROR - {e}")

    print(f"\nDone. {sum(1 for v in results.values() if isinstance(v, int))}/{len(videos)} files transcribed.")


if __name__ == "__main__":
    main()
