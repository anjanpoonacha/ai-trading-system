#!/usr/bin/env python3
"""Process ta-2.txt visual markers: extract frames and analyze with Gemini."""

import json
import base64
import subprocess
import urllib.request
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

WORK_FILE = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-work.json'
SCREENSHOTS_DIR = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/ta'
OUTPUT_FILE = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-2-results.json'
VIDEO_URL = 'https://www.youtube.com/watch?v=xpB5rOSavXM'
LITELLM_URL = 'http://localhost:6655/litellm/v1/chat/completions'
LITELLM_KEY = '1cd5c4a5-9490-4e72-a351-4e4e37d9b9da'

def get_stream_url():
    """Get 720p video stream URL using yt-dlp."""
    import yt_dlp
    opts = {
        'quiet': True,
        'simulate': True,
        'skip_download': True,
        'format': 'bestvideo[height<=720]'
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(VIDEO_URL, download=False)
        return info['url']

def timestamp_to_seconds(timestamp):
    """Convert timestamp (possibly a range like '15:33-16:05') to seconds."""
    # Use start of range if it's a range
    ts = timestamp.split('-')[0] if '-' in timestamp else timestamp
    parts = ts.split(':')
    return int(parts[0]) * 60 + int(parts[1])

def extract_frame(stream_url, timestamp, out_path):
    """Extract a single frame at the given timestamp."""
    seconds = timestamp_to_seconds(timestamp)
    result = subprocess.run(
        ['ffmpeg', '-y', '-ss', str(seconds), '-i', stream_url, '-frames:v', '1', out_path],
        capture_output=True, timeout=30
    )
    return result.returncode == 0 and os.path.exists(out_path)

def analyze_frame(marker, out_path):
    """Send frame to Gemini 2.5 Pro for analysis."""
    with open(out_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    payload = {
        'model': 'gemini-2.5-pro',
        'temperature': 0.1,
        'thinking': {'type': 'disabled'},
        'max_tokens': 300,
        'messages': [{
            'role': 'user',
            'content': [
                {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{img_b64}'}},
                {'type': 'text', 'text': f'The speaker says: "{marker["quote"]}"\n\nDescribe precisely what is shown on screen that makes this statement understandable. Include: stock name, price levels, indicator values, patterns drawn, annotations visible. Be concise (1-3 sentences).'}
            ]
        }]
    }
    headers = {
        'Authorization': f'Bearer {LITELLM_KEY}',
        'Content-Type': 'application/json'
    }
    req = urllib.request.Request(LITELLM_URL, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
    return result['choices'][0]['message']['content']

def classify(description, marker):
    """Classify whether the visual is critical or can be skipped."""
    skip_indicators = [
        'generic stock chart',
        'just shows the stock name',
        'generic trading interface',
        'no specific pattern',
        'standard chart view'
    ]
    desc_lower = description.lower()
    
    # Critical if description reveals visual context beyond what's in the quote
    quote_lower = marker['quote'].lower()
    
    # Check if the description adds meaningful visual context
    has_pattern = any(w in desc_lower for w in ['pattern', 'trendline', 'trend line', 'support', 'resistance', 'breakout', 'drawn', 'annotation', 'arrow', 'circle', 'highlight', 'indicator', 'moving average', 'rsi', 'macd', 'volume', 'candle', 'level', 'zone'])
    has_specific_data = any(w in desc_lower for w in ['₹', 'rs', 'price', 'nifty', 'sensex'])
    
    if has_pattern or has_specific_data:
        return True, None
    
    # Check for generic/skip conditions
    for indicator in skip_indicators:
        if indicator in desc_lower:
            return False, indicator
    
    # Default to critical since visual markers were selected for a reason
    return True, None

def process_marker(marker, stream_url, idx):
    """Process a single marker: extract frame + analyze."""
    timestamp = marker['timestamp']
    out_path = os.path.join(SCREENSHOTS_DIR, f'ta-2_{timestamp.replace(":", "")}.png')
    
    print(f"  [{idx+1}/36] {timestamp} - extracting frame...")
    
    # Extract frame
    if not extract_frame(stream_url, timestamp, out_path):
        return {
            **marker,
            'screenshot': out_path,
            'description': None,
            'critical': False,
            'skipped_reason': 'frame extraction failed'
        }
    
    # Analyze with Gemini
    print(f"  [{idx+1}/36] {timestamp} - analyzing with Gemini...")
    try:
        description = analyze_frame(marker, out_path)
    except Exception as e:
        return {
            **marker,
            'screenshot': out_path,
            'description': None,
            'critical': False,
            'skipped_reason': f'Gemini analysis failed: {str(e)}'
        }
    
    # Classify
    critical, skip_reason = classify(description, marker)
    
    result = {
        'timestamp': marker['timestamp'],
        'quote': marker['quote'],
        'what_is_shown': marker.get('what_is_shown', ''),
        'why_needed': marker.get('why_needed', ''),
        'screenshot': out_path,
        'description': description,
        'critical': critical,
    }
    if not critical:
        result['skipped_reason'] = skip_reason or 'no additional visual context beyond quote'
    
    status = "CRITICAL" if critical else f"SKIP ({result.get('skipped_reason', '')})"
    print(f"  [{idx+1}/36] {timestamp} - {status}")
    return result

def main():
    # Load markers
    with open(WORK_FILE) as f:
        all_markers = json.load(f)
    
    markers = [m for m in all_markers if m.get('_file') == 'ta-2.txt']
    print(f"Found {len(markers)} markers for ta-2.txt")
    
    # Get stream URL
    print("Getting 720p stream URL...")
    stream_url = get_stream_url()
    print(f"Stream URL obtained ({len(stream_url)} chars)")
    
    # First extract all frames sequentially (ffmpeg against same stream)
    print("\nExtracting frames...")
    frame_paths = {}
    for idx, marker in enumerate(markers):
        timestamp = marker['timestamp']
        # Use index + start of range for filename to avoid duplicates
        ts_clean = timestamp.split('-')[0].replace(':', '') if '-' in timestamp else timestamp.replace(':', '')
        out_path = os.path.join(SCREENSHOTS_DIR, f'ta-2_{idx+1:02d}_{ts_clean}.png')
        success = extract_frame(stream_url, timestamp, out_path)
        frame_paths[idx] = (out_path, success)
        print(f"  [{idx+1}/36] {timestamp} - {'OK' if success else 'FAILED'}")
    
    # Then analyze with Gemini using threading (5 concurrent)
    print("\nAnalyzing frames with Gemini 2.5 Pro (5 concurrent)...")
    results = [None] * len(markers)
    
    def analyze_single(idx_marker):
        idx, marker = idx_marker
        timestamp = marker['timestamp']
        out_path, success = frame_paths[idx]
        
        if not success:
            return idx, {
                'timestamp': timestamp,
                'quote': marker['quote'],
                'what_is_shown': marker.get('what_is_shown', ''),
                'why_needed': marker.get('why_needed', ''),
                'screenshot': out_path,
                'description': None,
                'critical': False,
                'skipped_reason': 'frame extraction failed'
            }
        
        try:
            description = analyze_frame(marker, out_path)
        except Exception as e:
            return idx, {
                'timestamp': timestamp,
                'quote': marker['quote'],
                'what_is_shown': marker.get('what_is_shown', ''),
                'why_needed': marker.get('why_needed', ''),
                'screenshot': out_path,
                'description': None,
                'critical': False,
                'skipped_reason': f'Gemini analysis failed: {str(e)}'
            }
        
        critical, skip_reason = classify(description, marker)
        result = {
            'timestamp': timestamp,
            'quote': marker['quote'],
            'what_is_shown': marker.get('what_is_shown', ''),
            'why_needed': marker.get('why_needed', ''),
            'screenshot': out_path,
            'description': description,
            'critical': critical,
        }
        if not critical:
            result['skipped_reason'] = skip_reason or 'no additional visual context beyond quote'
        
        status = "CRITICAL" if critical else f"SKIP"
        print(f"  [{idx+1}/36] {timestamp} - {status}")
        return idx, result
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(analyze_single, (i, m)): i for i, m in enumerate(markers)}
        for future in as_completed(futures):
            idx, result = future.result()
            results[idx] = result
    
    # Save results
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Report
    critical_count = sum(1 for r in results if r['critical'])
    skipped_count = sum(1 for r in results if not r['critical'])
    print(f"\n{'='*50}")
    print(f"DONE: {len(results)} markers processed")
    print(f"  Critical: {critical_count}")
    print(f"  Skipped:  {skipped_count}")
    print(f"Results saved to: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
