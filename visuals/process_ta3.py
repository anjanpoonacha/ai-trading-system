#!/usr/bin/env python3
"""Process ta-3 visual markers: extract frames and analyze with Gemini."""

import json
import base64
import subprocess
import urllib.request
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

WORK_FILE = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-work.json'
SCREENSHOTS_DIR = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/screenshots/ta/'
OUTPUT_FILE = '/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals/ta-3-results.json'
VIDEO_URL = 'https://www.youtube.com/watch?v=xyKtg_D1-aY'
LITELLM_URL = 'http://localhost:6655/litellm/v1/chat/completions'
LITELLM_KEY = '1cd5c4a5-9490-4e72-a351-4e4e37d9b9da'

def get_stream_url():
    import yt_dlp
    opts = {
        'quiet': True,
        'simulate': True,
        'skip_download': True,
        'remote_components': ['ejs:github'],
        'format': 'bestvideo[height<=720]'
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(VIDEO_URL, download=False)
        return info['url']

def parse_timestamp(timestamp):
    """Parse timestamp, handling ranges like '12:45-13:16' by using start time."""
    # Take only the start time if it's a range
    ts = timestamp.split('-')[0] if '-' in timestamp else timestamp
    parts = ts.split(':')
    return int(parts[0]) * 60 + int(parts[1])

def extract_frame(stream_url, timestamp, out_path):
    seconds = parse_timestamp(timestamp)
    result = subprocess.run(
        ['ffmpeg', '-y', '-ss', str(seconds), '-i', stream_url, '-frames:v', '1', out_path],
        capture_output=True, timeout=30
    )
    return result.returncode == 0 and os.path.exists(out_path)

def analyze_frame(marker, out_path):
    with open(out_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()

    payload = {
        'model': 'gemini-2.5-pro',
        'temperature': 0.1,
        'thinking': {'type': 'disabled'},
        'max_tokens': 300,
        'messages': [{'role': 'user', 'content': [
            {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{img_b64}'}},
            {'type': 'text', 'text': f'The speaker says: "{marker["quote"]}"\n\nDescribe precisely what is shown on screen that makes this statement understandable. Include: stock name, price levels, indicator values, patterns drawn, annotations visible. Be concise (1-3 sentences).'}
        ]}]
    }
    headers = {
        'Authorization': f'Bearer {LITELLM_KEY}',
        'Content-Type': 'application/json'
    }
    req = urllib.request.Request(LITELLM_URL, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read())
    return result['choices'][0]['message']['content']

def classify(description, quote):
    desc_lower = description.lower()
    quote_lower = quote.lower()
    
    # Critical if description reveals pattern/drawing/technical context not in quote
    generic_indicators = [
        'generic', 'just shows the stock name', 'no specific pattern',
        'standard tradingview', 'nothing specific'
    ]
    
    # Check if description adds meaningful visual context beyond the quote
    visual_keywords = [
        'drawn', 'line', 'pattern', 'arrow', 'circle', 'highlight',
        'annotation', 'marked', 'indicator', 'candle', 'level',
        'support', 'resistance', 'trend', 'moving average', 'volume',
        'breakout', 'price', 'range', 'chart', 'formation'
    ]
    
    has_visual_content = any(kw in desc_lower for kw in visual_keywords)
    is_generic = any(g in desc_lower for g in generic_indicators)
    
    if is_generic and not has_visual_content:
        return False, "Generic UI or stock name only"
    
    return True, None

def process_marker(marker, stream_url, idx):
    timestamp = marker['timestamp']
    out_path = os.path.join(SCREENSHOTS_DIR, f'ta-3_{timestamp.replace(":", "")}.png')
    
    result = {
        'index': idx,
        'timestamp': timestamp,
        'quote': marker['quote'],
        'what_is_shown': marker.get('what_is_shown', ''),
        'screenshot': out_path
    }
    
    try:
        # Extract frame
        if not extract_frame(stream_url, timestamp, out_path):
            result['error'] = 'Frame extraction failed'
            result['critical'] = False
            result['skipped_reason'] = 'Frame extraction failed'
            return result
        
        # Analyze with Gemini
        description = analyze_frame(marker, out_path)
        result['description'] = description
        
        # Classify
        critical, skip_reason = classify(description, marker['quote'])
        result['critical'] = critical
        if skip_reason:
            result['skipped_reason'] = skip_reason
            
    except Exception as e:
        result['error'] = str(e)
        result['critical'] = False
        result['skipped_reason'] = f'Error: {str(e)}'
    
    return result

def main():
    # Load markers
    with open(WORK_FILE) as f:
        all_markers = json.load(f)
    
    markers = [m for m in all_markers if m.get('_file') == 'ta-3.txt']
    print(f"Found {len(markers)} markers for ta-3.txt")
    
    # Get stream URL
    print("Getting video stream URL...")
    stream_url = get_stream_url()
    print(f"Stream URL obtained (length: {len(stream_url)})")
    
    # Process all markers with threading for Gemini calls
    results = []
    
    # First extract all frames sequentially (ffmpeg + network stream)
    print("Extracting frames...")
    frame_paths = {}
    for i, marker in enumerate(markers):
        timestamp = marker['timestamp']
        # Use start time for filename, sanitize
        ts_for_file = timestamp.split('-')[0].replace(':', '')
        out_path = os.path.join(SCREENSHOTS_DIR, f'ta-3_{ts_for_file}.png')
        success = extract_frame(stream_url, timestamp, out_path)
        frame_paths[i] = (out_path, success)
        print(f"  [{i+1}/{len(markers)}] {timestamp} - {'OK' if success else 'FAILED'}")
    
    # Then analyze with Gemini using thread pool
    print("\nAnalyzing frames with Gemini (5 concurrent)...")
    
    def analyze_single(args):
        idx, marker = args
        out_path, success = frame_paths[idx]
        
        result = {
            'index': idx,
            'timestamp': marker['timestamp'],
            'quote': marker['quote'],
            'what_is_shown': marker.get('what_is_shown', ''),
            'screenshot': out_path
        }
        
        if not success:
            result['error'] = 'Frame extraction failed'
            result['critical'] = False
            result['skipped_reason'] = 'Frame extraction failed'
            return result
        
        try:
            description = analyze_frame(marker, out_path)
            result['description'] = description
            
            critical, skip_reason = classify(description, marker['quote'])
            result['critical'] = critical
            if skip_reason:
                result['skipped_reason'] = skip_reason
        except Exception as e:
            result['error'] = str(e)
            result['critical'] = False
            result['skipped_reason'] = f'Error: {str(e)}'
        
        return result
    
    completed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(analyze_single, (i, m)): i for i, m in enumerate(markers)}
        for future in as_completed(futures):
            r = future.result()
            results.append(r)
            completed += 1
            status = "CRITICAL" if r.get('critical') else f"skipped ({r.get('skipped_reason', 'n/a')})"
            print(f"  [{completed}/{len(markers)}] {r['timestamp']} - {status}")
    
    # Sort by index
    results.sort(key=lambda x: x['index'])
    
    # Save
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Summary
    critical_count = sum(1 for r in results if r.get('critical'))
    skipped_count = sum(1 for r in results if not r.get('critical'))
    error_count = sum(1 for r in results if 'error' in r)
    
    print(f"\n{'='*50}")
    print(f"RESULTS SUMMARY")
    print(f"{'='*50}")
    print(f"Total processed: {len(results)}")
    print(f"Critical (visual needed): {critical_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")
    print(f"Output: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
