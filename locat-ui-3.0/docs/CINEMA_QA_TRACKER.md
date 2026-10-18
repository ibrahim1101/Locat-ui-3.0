# Cinema QA — Windows/Firefox report and regression coverage

Reported file: `Onimusha_all_boss.mkv`, HEVC Main, 3840×2160, AAC-LC, Matroska, 13,191,223,154 bytes. The user's original file is not available to this environment and has not been copied/uploaded. Accepted runtime **aa380e7fec7aff7f2c5c24da910678da12843d56**, workflow **38958989048**: all four jobs green, including **9 Chromium scenarios (8.1m), Firefox Cinema (7.9s), and 3 storage repetitions (12.4s)**. Both CI browsers used standard sandbox settings. All five IDs have automated regression acceptance; physical Windows Firefox, the full original movie and Pi performance remain unverified. Earlier pending entries below are historical and superseded by this result.

| ID | Verified source issue and change | Current evidence |
|---|---|---|
| CINEMA-001 | Files were written directly to IndexedDB with no preflight. Added 256 MiB file/batch cap, quota estimate/reserve, actual atomic quota errors, and a session-only Open video without copying route. Progress/favorites of temporary items stay in memory. | Exact-byte unit guards and provider no-write assertions pass; actual sparse-file picker, zero-copy guard and temporary reload checks pass in Chromium and Firefox CI. |
| CINEMA-002 | Top Playback options was a non-interactive Badge. Replaced with shared Button and real callback; gear Quality path retained. | Unmocked player tests and native built-UI pointer/focus/Space/Enter activation pass in both CI browsers. |
| CINEMA-003 | Details interpolated optional fields literally and did not trigger inspection. It now probes independently and uses native dimensions/explicit unknown fallbacks. Converted delivery identifies H264/AAC/MP4, with actual decoded dimensions when available. | Actual FFprobe and built Stream Details show HEVC/AAC 3840×2160 without undefined; converted native dimensions are 1920×1080 in both CI browsers. |
| CINEMA-004 | Original HEVC/MKV decoding is browser-dependent. Server conversion is the compatible route; remux preserves HEVC and is explicitly explained as unsuitable. Local source errors explain compatible-copy/server options. | Synthetic 4K HEVC converts to H264/AAC 1920×1080 and reaches decoded readyState=4 in Chromium and Firefox. Full original movie/physical Windows/Pi remain unverified. |
| CINEMA-005 | Global Space handler prevented native button activation; selecting current direct URL did not reload; mode selection did not request playback and failures were generic. Fixed keyboard guards, reload, visible transition/delivery and playback attempt, errors and disabled explanations. Actual browser investigation also found FFprobe cleanup closed the authorized handle before FFmpeg reused it (HTTP 500). Bounded positional input now preserves caller ownership; no pathname is reopened. | Component tests, same-handle real FFmpeg regression and built pointer/Space/Enter/remux/conversion/retry/503 transition checks pass. Standard Chromium and Firefox report HTTP 200 for real media delivery. |

Initial candidate commands: npm run check; npm run lint; npm run test:all; npm run test:server; npm run build; focused Vitest Cinema/storage/provider/library (19 passed); node --test server/mediaProcessor.test.mjs (4 passed); browser spec/fixture syntax and nine-scenario listing; git diff --check. Local total: 289 frontend / 119 backend. Local Chromium download failed; Firefox/Chromium will run in GitHub CI, with separate JSON reports. No independent security review, physical Windows Firefox, full user movie or real-time Raspberry Pi acceptance is claimed.

## Compatible playback

For large local videos, choose **Open video without copying**. This keeps the original file-backed reference for the current session, without importing bytes into IndexedDB. Select the file again after a reload; session-only items/metadata do not become durable library entries. This does not add a missing HEVC decoder.

For HEVC/MKV, place the original in a host-authorized media folder, refresh the server library, open it and select **Playback options → Convert to H.264/AAC**. This streams a progressive MP4, capped at 1080p, from the authorized open file handle. It does not copy the original into browser storage. Remux only changes the container and cannot make HEVC decode in an unsupported browser. Conversion needs host FFmpeg/FFprobe, shares two slots and may run slower than real time on a Pi. Converted playback with a known source duration supports bounded integer-second seeks by restarting H.264/AAC conversion. Linux seeks through an inherited authorized inode; other hosts retain bounded sequential input and may time out. Remux remains start-only; unknown-duration conversion cannot seek. HLS/hardware acceleration remain roadmap work.

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


Final expanded Cinema/feature acceptance: dd8e3fa, workflow 38960012457, all four jobs green; 9 Chromium (8.1m), 5 Firefox (28.6s), 3 repeated storage (12.7s). CINEMA-001–005 automated regression coverage passed under standard CI sandbox settings. Full original movie/physical Windows/Pi tests remain external acceptance limits.


## Parallel-session audit — 2026-10-18

Fetched remote `0284b5e40c048798b7f9760c260ccf75aee9916e`; local merged baseline `8a37175a75d31636f0f441bb1f32f7e277ccdcf1` has the identical tree. Audited intervening media refresh, local-source explanation, seek/resume and Remote status commits rather than discarding them. Prior discovery source `ad8e012` CI **38961804380** is now observed completed/success.

| ID | Current implementation and remaining acceptance |
|---|---|
| CINEMA-006 | Local files explain why server FFmpeg cannot read them and direct users to host-authorized media roots or a compatible copy. Forced Server Library refresh is implemented. No browser filesystem access or multi-gigabyte upload was added. A guided operator source-configuration workflow remains open. |
| CINEMA-007 | Fixed overescaped API offset validation; reject duplicate/unknown query keys and invalid/unknown/out-of-duration offsets. Real FFmpeg long-GOP experiment proved stream-copy seeking could emit zero decoded video frames: remux seek now fails explicitly and its timeline is disabled. H264/AAC uses Linux inherited open descriptor seeking, bounded fallback elsewhere. Player remounts/cancels old media, ignores stale events, preserves absolute progress/paused intent, retries identical targets and clamps EOF. FFmpeg scene-color and real Firefox decoded-blue-frame tests pass. Standard Chromium/Firefox CI on this candidate remains pending. |
| CINEMA-008 | Two-worker capacity, first-output failure before HTTP200, bounded timeout and disconnect cleanup tested. New stalled-worker tests prove slot recovery on timeout/disconnect. Long original movie, many repeated seeks, real Pi throughput, adaptive streaming and midstream stalls remain open; no hardware acceleration claim. |
| CINEMA-009 | Earlier standard CI accepted 001–005 in Chromium/Firefox. This candidate locally passes two real Firefox Cinema scenarios, including accurate paused seeking, with test-only sandbox restrictions disabled because of this execution environment. Chromium download failed. Physical Windows/Android, original 13GB movie, Pi and cross-network playback remain unverified. |
| CINEMA-010 | OPEN: configured media roots are currently available to authenticated accounts globally. This is not friend-scoped library sharing. Per-library owner/friend authorization, removal/revocation and negative cross-account API tests are required before claiming such sharing. |

Provider regression initially failed because the test checked cancellation before its new asynchronous forced-refresh POST completed; it now waits for the actual subsequent GET and retains obsolete-result/abort assertions. Full-suite video fixture now supplies loaded readyState before simulating ended; no production playback guard was weakened. No messaging crypto, public deployment, DNS or unrelated infrastructure changed.

Final reconciled validation (2026-10-18): npm run check, npm run lint, npm run test:all (**296 frontend /128 backend**), npm run build all pass. MOZ_DISABLE_CONTENT_SANDBOX=1 MOZ_DISABLE_RDD_SANDBOX=1 MOZ_DISABLE_UTILITY_SANDBOX=1 LOCAT_BROWSER_ENGINE=firefox npx playwright test cinema.spec.mjs server-setup.spec.mjs: **3 passed,14.2s**. Two-origin test proves no pre-navigation external fetch/CSP violation, source credential/localStorage isolation and discovery without cookies. Test-only flags absent from CI/production. git diff --check passes.


## 2026-10-18 — Standard Firefox paused-stream acceptance correction

Starting branch checkpoint `fee7c5890a3a3c05455be9abd84583a913150774`; production runtime remains `956821dde98b828616a7d393def8abfaf0bc02e6`. CI39130199832 on435f223: all three OS checks and connector succeeded; Chromium **11 passed7.8m**, including paced55 encrypted UI messages and history recovery. Firefox **6passed/1failed41.9s**: new paused-seek test demanded readyState4 but received3 after offset1. Standard browser job117683627924 therefore failed; storage repeat step skipped. Do not call that candidate all-green.

Investigation: paused progressive playback can hold current/future decoded data without HAVE_ENOUGH_DATA4. The seek test now requires decoded dimensions/current data and independently verifies red first frame at1s, blue first frame at2s, paused intent and actual advancing playback after the real Play button. Initial playing-video4 check and existing4KHEVC readyState4 assertion retained. No production codec/decoder guard or security assertion relaxed. Local scoped Firefox cinema.spec.mjs --repeat-each=3: **6passed33.2s**. All source validation counts recorded after completion. Current candidate standard CI still required.

Additional evidence: LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix passed actual SDK44/Synapse1.163 productionHTTPS/protected gateway encryption/decryption,55historypaging, offline/server restart, key continuity, tamper, revocation and plaintext scans. Not browser/native/public-network acceptance. npm audit --omit=dev --json:0vulnerabilities. Full npm audit --json:5high development dependency nodes from one unpatched braces advisory; BUILD-001 remains OPEN in ENGINEERING_BUG_REGISTER. npm view/ls inspected; no forcedTailwind4 upgrade or theme changes. Simple nested pattern did not reproduce RangeError locally; length10001 hit existing guard. No remediation claimed.

Preserved server-selection stash is fully reconciled into published435f223; retained as backup only, do not reapply it. All49/A–AM and complete roadmap intact. Next: standard Firefox/Chromium acceptance for this stronger regression, then compatibility-tested build-tool advisory resolution and Cinema010 owner/friend permission prerequisites. Physical originalmovie/Windows/Android/Pi and actual international/federation/TURN remain unverified. No deployment/DNS/publicrelease/unrelated infrastructure action occurred.

Paused-scene regression batch: npm run check; npm run lint; npm run test:all (296frontend/131backend); npm run build all pass; git diff --check passes. Runtime unchanged; standard candidate CI pending publication.


## 2026-10-18 — Forced media refresh resource boundary

Start published05ca36baeae46980860db703a39aba99adf1092d. End runtime source3ca4f01df3f575f6f91fd8e3c2274fbd7b153a50 (local1b451460e759f81aac0dcfa21b4e41bed73d0136, tree6292325c8306066a9d5c05533a5d67b137ca2f9e); following commit records this checkpoint.

MEDIA-REFRESH-002: authenticated sequential forced rescans bypassed scan cache without abuse budgets. Added six/account/minute and thirty/process/minute limits before scan/audit work;429 withRetry-After. GET cache access and each account's budget stay independent. Existing origin/session guards and scanner bounds/coalescing remain. Files server/index.mjs,server/api.test.mjs,ENGINEERING_BUG_REGISTER. Actual HTTP test exercises401,403, added/removed files, sixth allowed/seventh429, cachedGET200 and independent other-account200. No filesystem picker, unbounded upload, public media source or permission-sharing claim added.

Commands: node --test server/api.test.mjs (passed); npm run check; npm run lint; npm run test:all (**296frontend/131backend**); npm run build (all passed, existing bundle warning); git diff --check passed. Process-local budgets are not distributed/durable quotas; real Pi workload remains open.

Observed prior fee7c58 CI39130538724: all OS and connector jobs passed; browser117684611216 failed the same pre-correction Firefox paused-readyState assertion (11Chromium passed7.9m,6Firefox passed/1failed47.7s). Stronger test commit05ca36b CI39131180505 now running: Ubuntu117686502142,macOS117686502264 and connector117686502234 succeeded at observation; Windows117686501939/browser117686502176 pending. Current refresh-source CI pending publication. No failed CI is hidden or called accepted.

Next: observe/fix exact candidate CI, preserve verified E2EE regressions, resolve BUILD-001 tooling prerequisite with theme parity, then guided source ownership/per-library friend ACLs and removal/revocation negative acceptance. All49/A–AM/full roadmap retained; full original movie/physical platforms/Pi/publicnetwork/federation/TURN remain open. No production/DNS/main/release/unrelated infrastructure changes.
