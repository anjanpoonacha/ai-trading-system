import sys, json, urllib.request
import yt_dlp

output_dir = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts"

def transcribe_playlist(playlist_url, prefix):
    opts = {
        "quiet": True,
        "simulate": True, 
        "skip_download": True,
        "extract_flat": False,
    }
    
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(playlist_url, download=False)
    
    for i, entry in enumerate(info.get('entries', []), 1):
        if not entry or entry.get('title') == '[Private video]':
            print(f"  {i}. SKIPPED (private)")
            continue
        
        title = entry.get('title', 'Unknown')
        vid_id = entry.get('id', '')
        duration = entry.get('duration_string', '?')
        print(f"\n  {i}. {title} ({duration}) [{vid_id}]")
        
        subtitle_url = None
        for lang in ['en', 'en-US', 'en-GB', 'en-IN']:
            subs = entry.get('subtitles', {}).get(lang, [])
            for s in subs:
                if s.get('ext') == 'json3':
                    subtitle_url = s['url']
                    break
            if subtitle_url:
                break
        if not subtitle_url:
            for lang, subs in entry.get('automatic_captions', {}).items():
                if lang.startswith('en'):
                    for s in subs:
                        if s.get('ext') == 'json3':
                            subtitle_url = s['url']
                            break
                if subtitle_url:
                    break
        
        if subtitle_url:
            with urllib.request.urlopen(subtitle_url) as r:
                data = json.loads(r.read())
            lines = []
            for event in data.get('events', []):
                start_ms = event.get('tStartMs', 0)
                for seg in event.get('segs', []):
                    t = seg.get('utf8', '').strip()
                    if t and t != '\n':
                        lines.append((start_ms, t))
            
            transcript = []
            current_chunk = []
            chunk_start = 0
            for ms, text in lines:
                if ms - chunk_start > 30000 and current_chunk:
                    mins = chunk_start // 60000
                    secs = (chunk_start % 60000) // 1000
                    chunk_text = ' '.join(current_chunk)
                    visual_keywords = ['look at', 'see here', 'this chart', 'this candle', 'this level', 'as you can see', 'this stock', 'over here', 'this one', 'right here', 'this area', 'this zone', 'this screen', 'this example']
                    for kw in visual_keywords:
                        if kw in chunk_text.lower():
                            chunk_text += f"\n[VISUAL: {mins:02d}:{secs:02d} - speaker references on-screen element]"
                            break
                    transcript.append(f"[{mins:02d}:{secs:02d}] {chunk_text}")
                    current_chunk = [text]
                    chunk_start = ms
                else:
                    current_chunk.append(text)
            if current_chunk:
                mins = chunk_start // 60000
                secs = (chunk_start % 60000) // 1000
                chunk_text = ' '.join(current_chunk)
                visual_keywords = ['look at', 'see here', 'this chart', 'this candle', 'this level', 'as you can see', 'this stock', 'over here', 'this one', 'right here', 'this area', 'this zone', 'this screen', 'this example']
                for kw in visual_keywords:
                    if kw in chunk_text.lower():
                        chunk_text += f"\n[VISUAL: {mins:02d}:{secs:02d} - speaker references on-screen element]"
                        break
                transcript.append(f"[{mins:02d}:{secs:02d}] {chunk_text}")
            
            header = f"# {title}\n# Video ID: {vid_id}\n# Duration: {duration}\n# URL: https://www.youtube.com/watch?v={vid_id}\n\n"
            full_text = header + '\n'.join(transcript)
            filename = f"{output_dir}/{prefix}-{i}.txt"
            with open(filename, "w") as f:
                f.write(full_text)
            print(f"    Saved ({len(full_text)} chars)")
        else:
            print("    No transcript available")

print("=== ACTIVE TRADING ===")
transcribe_playlist("https://www.youtube.com/playlist?list=PLDJyWcJ-qsi8zErIUNMRAThUB5kzWzvBt", "at")

print("\n\n=== RISK MANAGEMENT ===")
transcribe_playlist("https://www.youtube.com/playlist?list=PLDJyWcJ-qsi_u-sBaVkee9lQ6kt2lj0CE", "rm")
