---
name: transcribe
description: Transcribe audio or video to a plain-text file with whisper.cpp. Works for a YouTube/remote URL (downloaded via yt-dlp) OR a local file already on disk — e.g. a Telegram voice note, podcast, lecture, or any .ogg/.mp3/.m4a/.mp4/.wav. Use for "transcribe this video/audio/voice note", "get the transcript of <url>", or turning a talk into text.
---

# Transcribe → text

Turn audio or video into a plain-text transcript. The source can be a **remote URL** (YouTube etc.) or a **local file** already on this machine.

## Tooling (already installed — don't reinstall, don't hunt for `whisper`/`main`/`~/.cache/whisper`)

- `whisper-cli` (whisper.cpp) — `/opt/homebrew/bin/whisper-cli`, model
  `~/.cache/whisper-cpp/ggml-large-v3-turbo-q5_0.bin` (multilingual; handles
  Russian/Ukrainian/English well)
- `ffmpeg` — converts the source to the 16 kHz mono WAV whisper needs
- `yt-dlp` — `/opt/homebrew/bin/yt-dlp` (only used for URL sources)

## Audio tracks — OBLIGATORY first step for any video / multi-track file

**Before transcribing, you MUST check how many audio tracks the source has, and if there is more than one you MUST ask the user which track to use — never assume the default.** Movies, rips, and screen recordings routinely bundle several audio tracks (e.g. original English + one or more dubs + commentary). Picking the wrong one silently produces a perfect transcript of the *wrong* language.

```bash
bash .claude/skills/transcribe/transcribe.sh --tracks "<url-or-file>"
```

This lists each audio stream with its index, language, title, codec, and channel count. Then:

- **1 track** → just run it (no question needed).
- **2+ tracks** → STOP and ask the user which `track <index>` to transcribe, then pass that index as the 4th argument. The script *enforces* this: if it sees >1 audio track and no track was given, it refuses, prints the tracks, and exits (code 2) rather than guess.
  - **Prefer the ORIGINAL-language track by default** (the production language — the track that isn't a dub; for most Western films that's `eng`). Present it as the recommended option when you ask — but **still ask**; the user may want a dub. Set `language` to match the chosen track.
  - **If the original is ambiguous** (tracks untagged/mislabelled, or you're unsure of the film/series' production language) → **look it up on the web** (the title's original/production language via Wikipedia/IMDb) rather than guessing, then map that to the right track. Don't assert "this is the original" from a hunch.

## Run

One command does the whole pipeline (resolve source → [download] → convert → transcribe → write `.txt`, with temp cleanup):

```bash
bash .claude/skills/transcribe/transcribe.sh "<url-or-file>" [output.txt] [language] [track]
```

- **source** (required) — a remote URL (`https://…`) is downloaded via yt-dlp; anything else is treated as a path to a local audio/video file.
- **output.txt** (optional) — defaults to `<video title>.txt` (URL) or `<filename>.txt` (local file) in the current directory. Pass an explicit path to route it somewhere specific.
- **language** (optional) — defaults to `auto` (whisper detects). Force with `ru` / `uk` / `en` if auto-detect picks wrong.
- **track** (optional) — absolute audio **stream index** (from `--tracks`). Required when the source has more than one audio track; omit for single-track audio. Note: the 4th arg is positional, so pass output + language before it (e.g. `… movie.mkv out.txt ru 2`).

The script prints progress to stderr and the final transcript path to stdout (capture it to know where the file landed).

## Telegram voice notes

Telegram voice notes are Opus `.ogg`. Download the media first (e.g. via `telegram-mcp`'s `tg_download_media`), then pass the resulting local path straight to the script — the `ffmpeg` step handles the `.ogg` → WAV conversion automatically:

```bash
bash .claude/skills/transcribe/transcribe.sh /path/to/voice.ogg note.txt ru
```

## After running

- Confirm the saved path and show the user a short preview (first few lines) + the word count.
- **Long audio takes a while** — transcription time scales with length. If the source is long (a multi-hour stream/recording), say so up front before kicking it off.
- The script runs whisper with `-mc 0` (no context carry-over) to prevent runaway **repeat-loops** (a phrase repeated 100+ times) and language-flips on long / music-heavy audio. If you still see loops, the next lever is a Silero **VAD** model (`--vad`) to skip non-speech.
- On intro/outro music, whisper may hallucinate **fansub credits** (`Субтитры создавал …`, `Продолжение следует…`, `ПОДПИШИСЬ/КАНАЛ`, music cues in CAPS). Strip these in post (perl needs `-Mutf8` with `-CSD` or Cyrillic literals won't match).
- If the user wants the transcript stored somewhere specific rather than a loose `.txt` (e.g. an **x node** under `notes`), ask and route it there.

## Notes / failure modes

- **URLs:** age-restricted / private / region-locked videos may need cookies — if `yt-dlp` fails with an auth/availability error, surface it; don't retry blindly. Playlists: the script uses `--no-playlist`, so a playlist URL transcribes only the single video it points at.
- **Local files:** if the path doesn't exist the script exits with `✗ no such file`; double-check the path (and quote it if it contains spaces).
