"""
Transcribe a YouTube playlist and analyze for visual-dependent segments.

Usage: python3 scripts/transcribe-and-analyze.py <playlist_url> <prefix> [max_chunk_minutes]

1. Extracts captions via yt-dlp
2. Splits transcript into chunks (~15 min default)
3. Sends each chunk to Claude 4.5 Sonnet to identify visual-dependent segments
4. Outputs: transcript with [VISUAL_NEEDED] markers
"""

import sys, json, urllib.request, urllib.error, os, time

LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"
MODEL = "anthropic--claude-4.5-sonnet"
OUTPUT_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts"

SYSTEM_PROMPT = """You are analyzing a trading course video transcript. The speaker is teaching stock trading concepts while showing charts, indicators, and price action on screen (TradingView).

Your task: Identify segments where the spoken words alone are NOT sufficient to understand what's being taught — i.e., the viewer MUST see the screen to follow along.

For each such segment, output EXACTLY this format:
[VISUAL_NEEDED: MM:SS - brief description of what screenshot is needed and why]

Common cases:
- Speaker says "this candle", "this stock", "look at this" without naming the specific stock/level
- Speaker points to chart patterns without describing them verbally
- Speaker references specific price levels, indicators, or zones visible only on screen
- Speaker demonstrates a tool/scanner workflow on screen

Do NOT flag segments where:
- The speaker names the stock and describes the pattern verbally (even if showing it)
- General concepts being explained without needing a specific visual

Output the ORIGINAL transcript with [VISUAL_NEEDED] markers inserted at the appropriate timestamps. Keep the transcript intact — only ADD markers, don't remove or modify the transcript text."""


def extract_captions(playlist_url):
    """Extract all video captions from playlist using yt-dlp's subtitle downloader."""
    import yt_dlp
    import tempfile, glob as globmod
    
    # Use a temp dir for yt-dlp to write subtitle files
    tmp_dir = tempfile.mkdtemp(prefix="ytcaps_")
    
    opts = {
        "quiet": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "en-GB", "en-IN"],
        "subtitlesformat": "json3",
        "outtmpl": os.path.join(tmp_dir, "%(id)s.%(ext)s"),
        "extract_flat": False,
        "sleep_interval_subtitles": 3,
    }
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
    
    # Now download subtitles one by one with delays
    videos = []
    for entry in info.get('entries', []):
        if not entry or entry.get('title') == '[Private video]':
            continue
        
        title = entry.get('title', 'Unknown')
        vid_id = entry.get('id', '')
        duration = entry.get('duration', 0)
        duration_str = entry.get('duration_string', '?')
        
        print(f"  Fetching captions: {title} ({duration_str})")
        
        # Download subtitles for this single video
        single_opts = {
            "quiet": True,
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "en-US", "en-GB", "en-IN"],
            "subtitlesformat": "json3",
            "outtmpl": os.path.join(tmp_dir, "%(id)s.%(ext)s"),
            "sleep_interval_subtitles": 2,
        }
        
        for attempt in range(5):
            try:
                with yt_dlp.YoutubeDL(single_opts) as ydl2:
                    ydl2.download([f"https://www.youtube.com/watch?v={vid_id}"])
                break
            except Exception as e:
                if "429" in str(e) or "Too Many" in str(e):
                    wait = (attempt + 1) * 15
                    print(f"    Rate limited, waiting {wait}s (attempt {attempt+1}/5)...")
                    time.sleep(wait)
                else:
                    print(f"    Error: {e}")
                    break
        
        # Find the subtitle file
        sub_files = globmod.glob(os.path.join(tmp_dir, f"{vid_id}*.json3"))
        
        transcript_chunks = []
        if sub_files:
            with open(sub_files[0], 'r') as f:
                data = json.load(f)
            lines = []
            for event in data.get('events', []):
                start_ms = event.get('tStartMs', 0)
                for seg in event.get('segs', []):
                    t = seg.get('utf8', '').strip()
                    if t and t != '\n':
                        lines.append((start_ms, t))
            
            # Group into 30-second chunks
            current_chunk = []
            chunk_start = 0
            for ms, text in lines:
                if ms - chunk_start > 30000 and current_chunk:
                    mins = chunk_start // 60000
                    secs = (chunk_start % 60000) // 1000
                    transcript_chunks.append(f"[{mins:02d}:{secs:02d}] {' '.join(current_chunk)}")
                    current_chunk = [text]
                    chunk_start = ms
                else:
                    current_chunk.append(text)
            if current_chunk:
                mins = chunk_start // 60000
                secs = (chunk_start % 60000) // 1000
                transcript_chunks.append(f"[{mins:02d}:{secs:02d}] {' '.join(current_chunk)}")
        else:
            print(f"  No subtitles found for: {title}")
        
        videos.append({
            "title": title,
            "id": vid_id,
            "duration": duration,
            "duration_str": duration_str,
            "transcript": '\n'.join(transcript_chunks)
        })
    
    # Cleanup temp dir
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)
    
    return videos


def analyze_chunk(transcript_chunk, video_title):
    """Send transcript chunk to Claude 4.5 Sonnet for visual analysis."""
    payload = {
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": 8000,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Video: {video_title}\n\nTranscript:\n{transcript_chunk}"}
        ]
    }
    
    data = json.dumps(payload).encode()
    headers = {
        "Authorization": f"Bearer {LITELLM_KEY}",
        "Content-Type": "application/json"
    }
    
    req = urllib.request.Request(LITELLM_URL, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
    
    return result['choices'][0]['message']['content']


def split_transcript(transcript, chunk_minutes=15):
    """Split transcript into chunks of ~N minutes."""
    lines = transcript.split('\n')
    chunks = []
    current_chunk = []
    chunk_start_min = 0
    
    for line in lines:
        # Parse timestamp [MM:SS]
        if line.startswith('['):
            try:
                ts = line[1:line.index(']')]
                parts = ts.split(':')
                current_min = int(parts[0])
                if current_min - chunk_start_min >= chunk_minutes and current_chunk:
                    chunks.append('\n'.join(current_chunk))
                    current_chunk = [line]
                    chunk_start_min = current_min
                else:
                    current_chunk.append(line)
            except:
                current_chunk.append(line)
        else:
            current_chunk.append(line)
    
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks


def process_playlist(playlist_url, prefix, chunk_minutes=15):
    """Full pipeline: extract → split → analyze → save."""
    print(f"Extracting captions from playlist...")
    videos = extract_captions(playlist_url)
    print(f"Found {len(videos)} accessible videos.\n")
    
    for i, video in enumerate(videos, 1):
        title = video['title']
        vid_id = video['id']
        duration_str = video['duration_str']
        transcript = video['transcript']
        
        if not transcript:
            print(f"  {i}. {title} — NO TRANSCRIPT")
            continue
        
        print(f"  {i}. {title} ({duration_str})")
        
        # Split into chunks
        chunks = split_transcript(transcript, chunk_minutes)
        print(f"     Split into {len(chunks)} chunk(s)")
        
        # Analyze each chunk
        analyzed_parts = []
        for ci, chunk in enumerate(chunks, 1):
            print(f"     Analyzing chunk {ci}/{len(chunks)}...", end=" ", flush=True)
            try:
                result = analyze_chunk(chunk, title)
                analyzed_parts.append(result)
                print("done")
            except Exception as e:
                print(f"ERROR: {e}")
                analyzed_parts.append(chunk)  # fallback to raw transcript
            time.sleep(1)  # rate limit
        
        # Assemble final output
        header = f"# {title}\n# Video ID: {vid_id}\n# Duration: {duration_str}\n# URL: https://www.youtube.com/watch?v={vid_id}\n\n"
        full_text = header + '\n\n'.join(analyzed_parts)
        
        filename = f"{OUTPUT_DIR}/{prefix}-{i}.txt"
        with open(filename, "w") as f:
            f.write(full_text)
        print(f"     Saved: {filename} ({len(full_text)} chars)\n")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/transcribe-and-analyze.py <playlist_url> <prefix> [chunk_minutes]")
        sys.exit(1)
    
    playlist_url = sys.argv[1]
    prefix = sys.argv[2]
    chunk_minutes = int(sys.argv[3]) if len(sys.argv) > 3 else 15
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    process_playlist(playlist_url, prefix, chunk_minutes)
    print("\nDone.")
