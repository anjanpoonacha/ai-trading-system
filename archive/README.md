# Archive

Approaches that were tested and didn't meet quality requirements.

## transcribe-ytdlp-subs.py

**What:** Downloads YouTube json3 auto-generated subtitles via yt-dlp, groups words into 30-second blocks with `[MM:SS]` timestamps.

**Why archived:** YouTube's auto-captions have poor quality for Indian English stock trading content. Tested on `esy8HetQgrk` — stock ticker names (AGYS, PFC, KPRMILL) are completely missing from auto-subs. Word-level timing data exists in json3 format (`tOffsetMs` per word) but the transcription itself is unusable for our use case.

**What works instead:** Gemini 2.5 Pro audio transcription (`scripts/retranscribe-with-timestamps.py`) with 5-second segment granularity. Correctly identifies all stock names and technical terms.

**Test date:** 2026-05-02
