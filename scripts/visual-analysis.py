"""
Visual analysis pass: identify segments in transcripts where the viewer
MUST see the screen to understand what's being taught.

Usage: python3 scripts/visual-analysis.py <file1.txt> [file2.txt] ...
   OR: python3 scripts/visual-analysis.py --prefix <prefix>
   OR: python3 scripts/visual-analysis.py --all

Processes files in PARALLEL (up to 5 concurrent). Uses Claude 4.5 Haiku.
Saves results to visuals/<filename>-visuals.json per file.
"""

import sys, json, os, urllib.request, glob
from concurrent.futures import ThreadPoolExecutor, as_completed

LITELLM_URL = "http://localhost:6655/litellm/v1/chat/completions"
LITELLM_KEY = "1cd5c4a5-9490-4e72-a351-4e4e37d9b9da"
MODEL = "anthropic--claude-4.5-haiku"
MAX_WORKERS = 5

TRANSCRIPT_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/transcripts"
OUTPUT_DIR = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/visuals"

SYSTEM_PROMPT = """You analyze stock trading course video transcripts. The speaker teaches while showing TradingView charts.

Identify segments where spoken words alone are NOT sufficient — viewer MUST see the screen.

Output a JSON array. Each item:
{"timestamp":"MM:SS or approximate location","quote":"exact unclear words","what_is_shown":"what must be on screen","why_needed":"why text is insufficient"}

Flag:
- "this candle/stock/level/chart" without naming specifics
- Chart patterns not described verbally
- Price levels/zones only visible on screen
- Scanner/tool workflow demos
- Drawing on charts without stating values

Do NOT flag:
- Stock named AND pattern described verbally
- General concepts without specific visual reference

Output ONLY a valid JSON array. Empty = []. No other text."""


def analyze_chunk(chunk_text, filename, chunk_idx=0):
    """Send one chunk to Haiku."""
    payload = {
        "model": MODEL,
        "temperature": 0.0,
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"File: {filename} (chunk {chunk_idx})\n\n{chunk_text}"}
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

    content = result['choices'][0]['message']['content']
    try:
        return json.loads(content)
    except:
        start = content.find('[')
        end = content.rfind(']') + 1
        if start >= 0 and end > start:
            try:
                return json.loads(content[start:end])
            except:
                return []
        return []


def split_text(text, max_chars=10000):
    """Split transcript into chunks."""
    lines = text.split('\n')
    chunks = []
    current = []
    current_len = 0

    for line in lines:
        if current_len + len(line) > max_chars and current:
            chunks.append('\n'.join(current))
            current = [line]
            current_len = len(line)
        else:
            current.append(line)
            current_len += len(line)

    if current:
        chunks.append('\n'.join(current))

    return chunks


def process_file(filepath):
    """Process a single transcript file. Returns (filename, visuals_list)."""
    filename = os.path.basename(filepath)

    with open(filepath, 'r') as f:
        content = f.read()

    chunks = split_text(content)
    file_visuals = []

    for ci, chunk in enumerate(chunks):
        try:
            visuals = analyze_chunk(chunk, filename, ci)
            if visuals:
                file_visuals.extend(visuals)
        except Exception as e:
            file_visuals.append({"error": str(e), "chunk": ci})

    return filename, file_visuals


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Determine files to process
    if "--all" in sys.argv:
        files = sorted(glob.glob(f"{TRANSCRIPT_DIR}/*.txt"))
    elif "--prefix" in sys.argv:
        idx = sys.argv.index("--prefix") + 1
        prefix = sys.argv[idx]
        # Exact prefix match: prefix-N.txt but NOT prefix-other-N.txt
        all_matches = sorted(glob.glob(f"{TRANSCRIPT_DIR}/{prefix}-*.txt"))
        # Filter: only files where after prefix- the next part is a digit
        files = []
        for f in all_matches:
            basename = os.path.basename(f)
            after_prefix = basename[len(prefix)+1:]  # after "prefix-"
            # Check first char is digit (cds-1.txt) or it's exact prefix match
            if after_prefix and (after_prefix[0].isdigit() or after_prefix.split('-')[0].isdigit()):
                files.append(f)
            elif after_prefix and not any(c == '-' for c in after_prefix.split('.')[0]):
                files.append(f)
    else:
        files = [f for f in sys.argv[1:] if f.endswith('.txt')]
        files = [f if os.path.isabs(f) else os.path.join(TRANSCRIPT_DIR, f) for f in files]

    if not files:
        print("No files to process.")
        print("Usage: python3 scripts/visual-analysis.py --all")
        print("       python3 scripts/visual-analysis.py --prefix cds-ex")
        print("       python3 scripts/visual-analysis.py file1.txt file2.txt")
        sys.exit(1)

    print(f"Processing {len(files)} files with {MAX_WORKERS} parallel workers using {MODEL}")

    all_results = {}
    completed = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_file, f): f for f in files}

        for future in as_completed(futures):
            filepath = futures[future]
            completed += 1
            try:
                filename, visuals = future.result()
                all_results[filename] = visuals
                count = len([v for v in visuals if 'error' not in v])
                print(f"  [{completed}/{len(files)}] {filename}: {count} visual markers")
            except Exception as e:
                filename = os.path.basename(filepath)
                all_results[filename] = [{"error": str(e)}]
                print(f"  [{completed}/{len(files)}] {filename}: ERROR - {e}")

    # Save combined results
    output_path = f"{OUTPUT_DIR}/visuals-combined.json"
    # Merge with existing if present
    if os.path.exists(output_path):
        with open(output_path, 'r') as f:
            existing = json.load(f)
        existing.update(all_results)
        all_results = existing

    with open(output_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    total = sum(len([v for v in vs if 'error' not in v]) for vs in all_results.values())
    print(f"\nDone. {total} total visual markers saved to {output_path}")


if __name__ == "__main__":
    main()
