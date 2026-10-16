# Cinema QA — Windows/Firefox report and regression coverage

Reported file: `Onimusha_all_boss.mkv`, HEVC Main, 3840×2160, AAC-LC, Matroska, 13,191,223,154 bytes. The user's original file is not available to this environment and has not been copied/uploaded. Current candidate is local 7883cef; all browser acceptance below is pending CI until recorded explicitly.

| ID | Verified source issue and change | Current evidence |
|---|---|---|
| CINEMA-001 | Files were written directly to IndexedDB with no preflight. Added 256 MiB file/batch cap, quota estimate/reserve, actual atomic quota errors, and a session-only Open video without copying route. Progress/favorites of temporary items stay in memory. | Unit guards use exact reported byte count; provider tests prove no storage write; real sparse-file picker and reload checks pending browser CI. |
| CINEMA-002 | Top Playback options was a non-interactive Badge. Replaced with shared Button and real callback; gear Quality path retained. | Unmocked player component test passes; native pointer/focus tests pending CI. |
| CINEMA-003 | Details interpolated optional fields literally and did not trigger inspection. It now probes independently and uses native dimensions/explicit unknown fallbacks. Converted delivery identifies H264/AAC/MP4, with actual decoded dimensions when available. | Actual FFprobe sees HEVC/AAC 3840×2160; component details tests pass; built UI pending CI. |
| CINEMA-004 | Original HEVC/MKV decoding is browser-dependent. Server conversion is the compatible route; remux preserves HEVC and is explicitly explained as unsuitable. Local source errors explain compatible-copy/server options. | Real synthetic 4K HEVC source converted and probed as H264/AAC 1920×1080. Actual browser decoding pending CI. |
| CINEMA-005 | Global Space handler prevented native button activation; selecting current direct URL did not reload; mode selection did not request playback and failures were generic. Fixed keyboard guards, reload, visible transition/delivery and playback attempt, errors and disabled explanations. Original mouse failure is not attributed to an unobserved pointer intercept. | Component state/source/error tests pass; built pointer/Space/Enter, remux, same-mode retry and conversion tests pending CI. |

Commands: npm run check; npm run lint; npm run test:all; npm run test:server; npm run build; focused Vitest Cinema/storage/provider/library (19 passed); node --test server/mediaProcessor.test.mjs (4 passed); browser spec/fixture syntax and nine-scenario listing; git diff --check. Local total: 289 frontend / 119 backend. Local Chromium download failed; Firefox/Chromium will run in GitHub CI, with separate JSON reports. No independent security review, physical Windows Firefox, full user movie or real-time Raspberry Pi acceptance is claimed.

## Compatible playback

For large local videos, choose **Open video without copying**. This keeps the original file-backed reference for the current session, without importing bytes into IndexedDB. Select the file again after a reload; session-only items/metadata do not become durable library entries. This does not add a missing HEVC decoder.

For HEVC/MKV, place the original in a host-authorized media folder, refresh the server library, open it and select **Playback options → Convert to H.264/AAC**. This streams a progressive MP4, capped at 1080p, from the authorized open file handle. It does not copy the original into browser storage. Remux only changes the container and cannot make HEVC decode in an unsupported browser. Conversion needs host FFmpeg/FFprobe, shares two slots and may run slower than real time on a Pi. Converted playback restarts at zero and cannot seek/resume; HLS/hardware acceleration remain roadmap work.

An operator can alternatively preconvert a compatible copy on the host, with normal seekable playback. Example (does not overwrite an existing output):

```sh
ffmpeg -n -i "Onimusha_all_boss.mkv" -map 0:v:0 -map "0:a:0?" -vf "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2" -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "Onimusha-browser-1080p.mp4"
```

This command has not been run against the user's file. Keep that original. Some containers require seeking and cannot be read by the existing progressive pipe path; preconversion from the normal host pathname is the alternative. Startup worker failures return 503 before any output; failures after MP4 output starts cannot change HTTP status and surface as a conversion-specific player error. No public service or media directory has been activated by these source changes.
