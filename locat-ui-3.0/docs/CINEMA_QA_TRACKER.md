# Cinema QA — Windows/Firefox report and regression coverage

Reported file: `Onimusha_all_boss.mkv`, HEVC Main, 3840×2160, AAC-LC, Matroska, 13,191,223,154 bytes. The user's original file is not available to this environment and has not been copied/uploaded. Accepted runtime **aa380e7fec7aff7f2c5c24da910678da12843d56**, workflow **38958989048**: all four jobs green, including **9 Chromium scenarios (8.1m), Firefox Cinema (7.9s), and 3 storage repetitions (12.4s)**. Both CI browsers used standard sandbox settings. All five IDs have automated regression acceptance; physical Windows Firefox, the full original movie and Pi performance remain unverified. Earlier pending entries below are historical and superseded by this result.

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


## Cinema browser follow-up — 2026-10-16

Starting remote 5f1dc03ee73fd142973c6dbf016f18139a2ad8ee. CI 38928716526: Windows 117066865506, Ubuntu 117066865578 and macOS 117066865713 passed all checks; browser 117066865412 failed the new Cinema remux readiness assertion, with all eight existing browser scenarios (including 55 real UI encrypted messages) passing. Firefox CI was skipped after that failure.

Actual isolated Firefox reproduced HTTP 500 on mode=remux. Captured synthetic gateway diagnostics identified ERR_OUT_OF_RANGE, fd=-1: probeMedia destroyed its FileHandle ReadStream, which closes the caller-owned descriptor even with autoClose:false. Conversion then tried to reuse it. A bounded positional reader now preserves caller ownership without reopening a pathname or relaxing containment. Regression uses the same handle for probe then remux/transcode and verifies selected audio/output. Browser diagnostics report mode/status and native media state without cookies or credentials.

Executed npm run check; npm run lint; npm run test:all (289 frontend / 119 backend passed); npm run build (passed, existing bundle warning); node --test server/mediaProcessor.test.mjs (4 passed); git diff --check. Firefox installed after a truncated first mirror; Chromium downloads still truncated. Normal local Firefox startup fails with sandbox uid_map EPERM. Test-only MOZ_DISABLE_CONTENT_SANDBOX=1 against isolated synthetic HTTPS then passed remux and reached converted H264 1920x1080 metadata, but stalled readyState=1, time=0, buffered data present, no native error. Browser decoding acceptance remains OPEN; do not weaken the decoded-frame assertion or certify Windows/user movie playback. A separate scoped decoder-sandbox diagnostic is being investigated; no such flags enter production or CI.

Next: obtain standard Chromium/Firefox CI on this descriptor fix, diagnose any remaining converted playback failure, update this evidence and QA tracker, then resume Linux host-connector/global readiness. Full E2EE roadmap, all 49 requirements and ecosystem A–AM remain intact. No public exposure/deployment occurred.


## Firefox Cinema and existing-feature functional checkpoint — 2026-10-16

Start remote aa380e7fec7aff7f2c5c24da910678da12843d56; runtime descriptor fix unchanged. Ending local test/CI source a3864aa6d8e1969328d38724c0a99d725b56f5f9. Workflow 38958989048 has passed Ubuntu 117168974678, Windows 117168975004 and macOS 117168975447; browser 117168975308 is still running at this checkpoint.

Actual local Firefox Cinema passed all assertions in 7.4s: native 13,191,223,154-byte sparse-file import rejection before IDB copying, session-only open/reload, pointer/Space/Enter controls, real remux, HEVC 3840x2160 details, decoded converted H264 1920x1080 readyState=4, same-mode retry and injected 503 error. No assertion was relaxed. This host blocks Firefox content and media utility namespaces (uid_map EPERM). A bare native player also stalled on an ordinary MP4; scoped test-only MOZ_DISABLE_CONTENT_SANDBOX=1 MOZ_DISABLE_RDD_SANDBOX=1 MOZ_DISABLE_UTILITY_SANDBOX=1 allowed decoding. These flags are absent from repository production/CI configuration. This is functional testing, not normal sandbox acceptance or physical Windows testing.

Extra real Firefox tests: storage/Link identity persistence, two-user encrypted Link transfer/revocation, Photos editing/export and Sentinel webhook/revocation all passed (4 tests, 21.1s). First Photos run failed because its cancellation fixture hardcoded pointer ID 1 while Firefox used 0. Production correctly ignored the foreign pointer. The test now captures the actual native pointer ID; production pointer handling is unchanged. No other failures were hidden.

The CI Firefox step now runs these five scenarios, including Cinema, independently of earlier Chromium test success once build/runtime/media tools are installed. Default sandbox settings remain. Commands: npm run check; npm run lint; npm run test:all (289 frontend / 119 backend); npm run build (all passed, existing bundle warning); node --check browser-tests/photos.spec.mjs; PyYAML workflow inspection; git diff --check; isolated Firefox Cinema and four existing-feature Playwright commands. Raw diagnostics/logs remain local synthetic test artifacts, not user credentials/files.

Next: observe standard-browser CI, fix any remaining failures, record exact accepted commit/run, then implement the Linux host connector preparation without activating a public service. Full roadmap and platform/public-network limitations remain unchanged.
