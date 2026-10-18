# Cross-module engineering bug register

This register supplements CINEMA_QA_TRACKER.md; it does not replace the 49-requirement register or A–AM roadmap. Automated acceptance is distinct from physical platform/release acceptance.

## SERVER-001 — Cross-origin server check blocked by strict CSP

- Module: account/server selection. Severity: medium, blocks switching to another host through the prior check workflow.
- Reproduction: enter another HTTPS origin and activate Check server under `connect-src 'self'`.
- Observed/expected: prior UI attempted a cross-origin fetch blocked by CSP; server selection should work without weakening connection policy or sending credentials elsewhere.
- Root cause: discovery attempted before navigating to the selected origin. Fixed in published runtime `435f223920c69512f0a98f1d366e6fbe54547121`.
- Change: validate/review another address as explicitly unchecked, navigate only on user activation, then discover on its own origin with credentials omitted. Abort obsolete checks; never migrate local device keys/accounts implicitly.
- Verification: two component regressions and actual two-origin Firefox browser acceptance pass. Browser asserts zero pre-navigation destination requests, no CSP violation, host/storage credential isolation and cookie-free discovery. Local scoped sandbox flags required; standard CI39130199832 pending at this entry.
- Limits: server-advertised instance ID is not independent identity verification; separate ports on the same hostname share cookie scope. This workflow does not certify a supplied host's trustworthiness.

## REMOTE-001 — Status response size enforced after unbounded buffering

- Module: optional owner-only Remote infrastructure status. Severity: medium, resource exhaustion if a configured upstream emits an oversized/chunked response.
- Reproduction: authorized owner polls configured fixed private status endpoint whose chunked body exceeds 64 KiB without Content-Length.
- Observed/expected: prior `response.text()` buffered the entire response before checking string length; the consumer must enforce a byte limit during streaming and cancel excess input.
- Root cause: post-buffer character limit did not bound network/body allocation, and UTF-8 bytes could exceed the stated limit.
- Change: consume with bounded byte accounting, strict UTF-8 decoding and reader cancellation; reject declared oversized/error responses before reading; preserve 2.5s upstream timeout, no redirects, owner gate, fixed operator endpoint, field allowlist and generic client errors.
- Verification: six focused backend tests pass, including chunked cancellation before the remainder is consumed, multibyte overflow, malformed JSON/upstream failure, sanitized successful owner response and no credential forwarding. Full batch/CI recorded in SESSION_HANDOFF.
- Limits: this is opt-in read-only status, not a remote desktop/media acceptance test. No real Pi, VPN, DNS or existing service contacted or changed.

## MEDIA-REFRESH-001 — Outdated cancellation assertion after forced refresh

- Module: test fixture for LiveMediaProvider. Severity: test-only failure.
- Reproduction: run provider test after parallel-session POST /api/media/refresh change.
- Observed/expected: test expected immediate old-GET cancellation before asynchronous POST completed; production correctly starts the replacement GET after POST.
- Fix/evidence: wait for the actual replacement fetch before asserting cancellation. Retains latest-result, obsolete-response and unmount abort assertions; full frontend suite passes. No production provider behavior weakened.

Cinema-001–010 remain in CINEMA_QA_TRACKER.md, including unresolved guided server-source setup, friend-scoped library ACLs, real long-file/device acceptance and hardware performance. The current authenticated global-root media behavior is not permission-based friend sharing.


## BUILD-001 — Unpatched braces development-tool advisory

- Module: Tailwind3 build tool dependency tree. Severity: high according to npm audit; development dependency, not present in the production dependency audit.
- Reproduction/evidence: npm audit --json reports five affected nodes (braces3.0.3, chokidar3.6.0, fast-glob3.3.3, micromatch4.0.8 and tailwindcss3.4.19) from one reviewed advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). npm audit --omit=dev --json reports zero. npm view braces version engines --json reports latest3.0.3; npm ls confirms only Tailwind's development tree.
- Root cause per advisory: recursive AST walkers lack depth guards and can exhaust the stack on crafted patterns. A simple local deeply nested pattern did not reproduce RangeError under Node24; a10001-character case hit its existing length guard. Do not claim a demonstrated application exploit or a fixed dependency.
- Status: OPEN. Advisory lists no patched release. npm suggests a Tailwind4 major migration; no force upgrade, advisory suppression, custom crypto or unreviewed package fork added.
- Next: compatibility-tested tooling migration/removal or reviewed upstream fix, with theme/CSS parity and complete source/browser checks. Keep high development advisory visible until an audited resolution. Production audit zero does not close the full build dependency finding.


## MEDIA-REFRESH-002 — Unbounded forced host scans

- Module: Cinema/server media refresh. Severity: medium, authenticated resource abuse on large/slow host libraries.
- Reproduction: repeatedly POST authenticated same-origin /api/media/refresh after each prior scan completes.
- Observed/expected: pending scans coalesce, but sequential forced requests bypass the normal one-minute scan cache without a request budget; expensive scans and audit writes should be bounded.
- Root cause: forced-refresh route had authorization/origin guards but no account/shared limiter.
- Change: six forced requests/account/minute and thirty across the process/minute; 429 includes Retry-After before scanning. Cached GET, stream and other accounts' budget stay independent. Existing bounded/coalesced scanner retained.
- Verification: actual HTTP API regression proves unauthenticated401/wrong-origin403, forced addition/removal visibility, seventh same-account request429 with bounded Retry-After, cached GET200 and another account's independent200. Full batch296frontend/131backend/type/lint/build passes as recorded in handoff.
- Limits: process-local fixed-window budgets reset on restart, not a distributed quota; per-library ownership/friend ACLs and real Pi load acceptance remain open.


## CINEMA-011 — Development StrictMode removes the live video source

- Severity: medium; Vite development Cinema cannot load server video.
- Reproduction: run the React development build under its existing StrictMode and open a server video.
- Observed versus expected: video element loses src during ref replay and remains loading; it must retain the same source through replay while real replacement/unmount still cancel it.
- Root cause: synchronous null-ref cleanup removed src before React immediately reattached the same element. Component and actual Vite/Firefox before-fix regressions both failed with missing src.
- Change: one-microtask confirmation cancels genuinely obsolete elements only; stale event and progress guards retained. Source0be90a070ddfcee60b0ef72689646341a1c0f9d7.
- Verification: component regression passes and still checks real unmount cleanup; actual development direct/transcode playback advances; full297frontend/131backend/type/lint/build and three built Firefox scenarios pass. New standard CI pending at entry.
- Limits: local scoped sandbox restrictions disabled; not physical/native/original movie acceptance. Production builds do not replay refs this way, but replacement/unmount behavior is tested in built UI too.


### Accepted 2026-10-18 checkpoint

Commit8c79940f5d0c715d3bbe70e49b70a02e47f7e0e4 (runtime `0be90a070ddfcee60b0ef72689646341a1c0f9d7`), workflow 39132471838: all five jobs green, standard real Vite/StrictMode acceptance,11 Chromium 8.3m/7 Firefox 39.9s/3 storage 12.4s. Ubuntu297 frontend/131 backend and actual Synapse passed; Windows297 frontend/130 backend plus1 explicitUnix stalled-worker skip. CINEMA011/SERVER001/REMOTE001/MEDIA-REFRESH002 automated acceptance now observed, without closing physical/platform/global or full-roadmap requirements. Next: deterministic rapid active-seek burst/setup acceptance, then explicit library ownership/friend ACLs, guided source configuration and BUILD001 compatible tooling remediation. Cinema006/008/009/010 remaining limits unchanged; all 49 requirements / A–AM scope intact. See final SESSION_HANDOFF entry for exact evidence, previous failures and source boundaries. No deployment/public exposure.


## CINEMA-012 — Rapid converted seeks lose playing intent

Severity medium. While playing, seek twice before replacement metadata arrives: final source remains paused. Root cause: second seek derived intent from the newly mounted, paused loading element. Keep captured intent while switching. The playing regression failed before the fix, paused regression passed; both pass after. Actual browser holds intermediate requests, releases final real conversion and requires advancing playback; three local Firefox repetitions pass. Source9a6bd93c09aefd95c103e7cd2d77e28681369acc; standard candidate CI pending. This does not certify unlimited rapid-seek worker load or original movie/Pi performance.


## CINEMA-010 — Implicit all-account server library access

Severity high for mixed-trust accounts: after roots were configured, any registered user could discover/probe/stream every root, without a grant. Runtimee403a466661752b769987d3a3e6f02f4c8de3fdb defaults to operator-assigned owners/configured accepted friends, denies unassigned roots and filters account snapshots; permission/session loss aborts active transport within the one-second poll interval. Unknown/invalid owner policies fail closed; no browser-controlled paths/owners. Prior behavior is explicit compatibility opt-in only. Actual HTTP tests verify both directions, all delivery modes, unrelated/pending/ungranted denial, active contact/session cancellation and policy revocation after restart; real built browser friend playback/removal passes. Current standard CI pending. Dynamic owner-controlled durable grants/UI and true cross-homeserver libraries remain OPEN; see MEDIA_LIBRARY_ACCESS.md for migration, configured grant reacceptance semantics and bytes-already-received limits.
