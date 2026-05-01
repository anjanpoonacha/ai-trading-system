import json, os, base64, urllib.request, subprocess, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import yt_dlp

LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"
SCREENSHOTS_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/stage"
TRANSCRIPTS_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts"

with open('/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/stage-work.json') as f:
    markers = json.load(f)

# Group by video ID
by_video = {}
for m in markers:
    vid = m['_vid_id']
    if vid not in by_video:
        by_video[vid] = []
    by_video[vid].append(m)

print(f"Total markers: {len(markers)}")
print(f"Videos: {list(by_video.keys())}")
for vid, ms in by_video.items():
    print(f"  {vid}: {len(ms)} markers")

# Get stream URLs (720p)
stream_urls = {}
for vid_id in by_video:
    opts = {'quiet': True, 'simulate': True, 'skip_download': True, 'format': 'bestvideo[height<=720]'}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f'https://www.youtube.com/watch?v={vid_id}', download=False)
        stream_urls[vid_id] = info['url']
    print(f"Got stream URL for {vid_id}")

# Get transcript context for a timestamp
def get_transcript_context(filename, timestamp):
    filepath = f"{TRANSCRIPTS_DIR}/{filename}"
    if not os.path.exists(filepath):
        return ""
    with open(filepath) as f:
        lines = f.readlines()
    # Handle range timestamps like "00:32-01:37" - use start
    ts = timestamp.split('-')[0] if '-' in timestamp else timestamp
    target_prefix = f"[{ts}]"
    context_lines = []
    for i, line in enumerate(lines):
        if target_prefix in line or (context_lines and len(context_lines) < 3):
            context_lines.append(line.strip())
        elif context_lines:
            break
    if not context_lines:
        # Try fuzzy - find closest timestamp
        parts = ts.split(':')
        if len(parts) == 2:
            target_sec = int(parts[0]) * 60 + int(parts[1])
        else:
            target_sec = 0
        for i, line in enumerate(lines):
            if line.startswith('['):
                try:
                    ts_str = line[1:line.index(']')]
                    p = ts_str.split(':')
                    sec = int(p[0]) * 60 + int(p[1])
                    if abs(sec - target_sec) <= 30:
                        context_lines = [lines[j].strip() for j in range(max(0,i-1), min(len(lines), i+3))]
                        break
                except:
                    pass
    return ' '.join(context_lines) if context_lines else ""

def process_marker(marker, stream_url):
    timestamp = marker['timestamp']
    filename = marker['_file']
    vid_id = marker['_vid_id']
    quote = marker.get('quote', '')
    
    # Handle range timestamps - use start
    ts = timestamp.split('-')[0] if '-' in timestamp else timestamp
    parts = ts.split(':')
    seconds = int(parts[0]) * 60 + int(parts[1])
    
    prefix = filename.replace('.txt', '').replace('-', '')
    clip_path = f"{SCREENSHOTS_DIR}/{prefix}_{ts.replace(':', '')}.mp4"
    
    # Extract 5-second MP4 clip
    if not os.path.exists(clip_path) or os.path.getsize(clip_path) < 1000:
        subprocess.run(
            ['ffmpeg', '-y', '-ss', str(seconds), '-i', stream_url, '-t', '5',
             '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', clip_path],
            capture_output=True, timeout=60
        )
    
    if not os.path.exists(clip_path) or os.path.getsize(clip_path) < 1000:
        return {**marker, 'description': '[FRAME_EXTRACTION_FAILED]', 'critical': False, 'skipped_reason': 'extraction_failed', 'clip': None}
    
    # Get transcript context
    context = get_transcript_context(filename, timestamp)
    
    # Send to Gemini
    with open(clip_path, 'rb') as f:
        vid_b64 = base64.b64encode(f.read()).decode()
    
    prompt = f"""The speaker says: "{quote}"

Transcript context: {context[:500]}

Describe precisely what is shown on screen in this 5-second clip that makes the statement understandable. Include: stock name, price levels, indicator values, patterns drawn, annotations, cursor movements. Be concise (2-4 sentences)."""

    payload = {
        'model': 'gemini-2.5-pro',
        'temperature': 0.1,
        'thinking': {'type': 'disabled'},
        'max_tokens': 400,
        'messages': [{'role': 'user', 'content': [
            {'type': 'image_url', 'image_url': {'url': f'data:video/mp4;base64,{vid_b64}'}},
            {'type': 'text', 'text': prompt}
        ]}]
    }
    
    headers = {'Authorization': f'Bearer {LITELLM_KEY}', 'Content-Type': 'application/json'}
    req = urllib.request.Request(LITELLM_URL, data=json.dumps(payload).encode(), headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
        description = result['choices'][0]['message']['content']
        
        # Check if transition frame
        transition_keywords = ['loading', 'spinner', 'title card', 'black screen', 'transitioning']
        is_transition = any(kw in description.lower() for kw in transition_keywords)
        
        if is_transition:
            # Retry at +3s
            retry_seconds = seconds + 3
            retry_path = f"{SCREENSHOTS_DIR}/{prefix}_{ts.replace(':', '')}_retry.mp4"
            subprocess.run(
                ['ffmpeg', '-y', '-ss', str(retry_seconds), '-i', stream_url, '-t', '5',
                 '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', retry_path],
                capture_output=True, timeout=60
            )
            if os.path.exists(retry_path) and os.path.getsize(retry_path) > 1000:
                with open(retry_path, 'rb') as f:
                    vid_b64 = base64.b64encode(f.read()).decode()
                payload['messages'][0]['content'][0]['image_url']['url'] = f'data:video/mp4;base64,{vid_b64}'
                req = urllib.request.Request(LITELLM_URL, data=json.dumps(payload).encode(), headers=headers)
                with urllib.request.urlopen(req, timeout=120) as resp:
                    result = json.loads(resp.read())
                description = result['choices'][0]['message']['content'] + " [RETRIED +3s]"
                clip_path = retry_path
        
        # Classify
        skip_keywords = ['generic ui', 'no chart visible', 'title slide only']
        is_skip = any(kw in description.lower() for kw in skip_keywords)
        
        return {
            'timestamp': timestamp,
            'file': filename,
            'quote': quote,
            'clip': os.path.basename(clip_path),
            'description': description,
            'critical': not is_skip,
            'skipped_reason': 'non-chart content' if is_skip else None
        }
    except Exception as e:
        return {
            'timestamp': timestamp,
            'file': filename,
            'quote': quote,
            'clip': os.path.basename(clip_path),
            'description': f'[ERROR: {e}]',
            'critical': False,
            'skipped_reason': f'error: {e}'
        }

# Process all markers with threading (5 concurrent per video)
results = []
for vid_id, vid_markers in by_video.items():
    stream_url = stream_urls[vid_id]
    print(f"\nProcessing {vid_id} ({len(vid_markers)} markers)...")
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_marker, m, stream_url): m for m in vid_markers}
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result)
                critical = "Y" if result['critical'] else "N"
                desc_short = result['description'][:60]
                print(f"  [{critical}] {result['timestamp']} - {desc_short}...")
            except Exception as e:
                print(f"  [E] ERROR: {e}")

# Save
with open('/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/stage-results.json', 'w') as f:
    json.dump(results, f, indent=2)

critical_count = sum(1 for r in results if r.get('critical'))
print(f"\nDone. {len(results)} processed, {critical_count} critical, {len(results)-critical_count} skipped")
