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
