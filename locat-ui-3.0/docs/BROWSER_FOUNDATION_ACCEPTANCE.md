# Built UI browser foundation acceptance

A pinned Playwright Test 1.64.1 Chromium job now accompanies the existing Node/source checks. Run from the application directory after installing the browser runtime:

```
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:browser
```

`npm run test:browser -- --list` validates test discovery without launching a browser. Discovery, syntax checks and fixture readiness are not a passing browser acceptance run.

## What the test exercises

The fixture starts the actual Node server with the production build, a generated one-day loopback-only HTTPS certificate and a new temporary SQLite database. It never accepts an existing server URL or database path. Its child environment is an allowlist of runtime paths plus explicit fixture configuration, excluding operator Locat/Matrix/relay secrets and deployment settings. The server and its private files are stopped/removed during teardown, including failure paths.

The test creates a synthetic account through a browser fetch, signs in through the actual built UI, and checks the browser's Secure/HttpOnly/SameSite=Strict cookie metadata and absence of the HttpOnly cookie from document.cookie. It checks secure-context/Web Crypto/IndexedDB/Web Locks availability and a native Web Lock acquisition. The Devices UI registers/proves its real nonextractable P-256 Link identity; native IndexedDB retains that key and public identity across a same-context page reload. Secrets UI creates a real encrypted store and record, changes its wrapping passphrase, locks, reloads and reopens the original record using the new phrase. Captured private-store writes must exclude the synthetic passphrases, entry name and secret value.

This first browser test does not run Matrix/Synapse, Rust crypto, SAS, exclusive Matrix stores, key-history workers/import/export, cross-signing, conversation Send or full recovery. Native hardware key protection, OS/browser restart durability, cross-tab contention, cross-site SameSite enforcement, browser certificate trust and physical devices remain separate acceptance work. Chromium on Linux does not certify Firefox, WebKit, Android WebView, Windows/macOS desktop shells or actual media codecs.

## Certificate and network scope

Only the isolated browser context permits the generated self-signed certificate through Playwright ignoreHTTPSErrors. HTTP routing is restricted to the exact loopback fixture origin and service workers are blocked. This is not production browser CA/trust acceptance. Existing Node HTTPS acceptance separately trusts only its generated fixture CA. No browser-wide certificate policy or operator certificate is changed.

## CI evidence

The browser-foundation job installs Chromium/dependencies, builds the app and runs this test. It uploads only the runner JSON report for seven days; no production dataset or operator credentials are used. A successful source/unit build or test discovery is not evidence that this job ran. Record the exact successful workflow/commit when observed before claiming browser execution.

At introduction, local checks include fixture HTTPS readiness, script syntax and one discovered test. The local environment has no Chromium executable; previous browser downloads returned invalid artifacts, so browser execution is delegated to CI rather than simulated. The initial foundation test has now passed in actual Chromium; the exact evidence follows. Broader browser acceptance remains open.

Primary tooling references: https://playwright.dev/docs/intro and https://playwright.dev/docs/ci-intro.

## First executed CI run and fixture correction

Workflow 38745774227 on commit 4819b99 successfully installed Chromium and executed the test against the built app. It failed at synthetic account creation (HTTP 400): the fixture used browser.<suffix>, while server usernames accept only 3–32 lowercase letters/digits/underscores. The fixture now uses browser_<suffix> and reports the API error on a status assertion. The registration hint was corrected to the same server policy. This is an observed failed browser run, not acceptance success; later successful evidence must identify its exact commit/run.

The login recovery notice was also corrected to distinguish existing room-history import/export from planned complete account/device identity recovery. Account creation no longer claims that all private-tool keys were already created; setup remains explicit. No authentication validation was weakened.

## Observed successful foundation run

Commit 523ffd4d5e05cf5cfe760e7aa983a35171d8a50e, workflow 38746294768, browser-foundation job 116460712411 completed successfully: one Chromium test passed (4.4 seconds). The Linux, Windows and macOS verification jobs in that same workflow also completed successfully. Evidence: https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38746294768 . This certifies only the exercised foundation flow and the isolated certificate exception described above.

## Browser-to-browser Link acceptance extension

A second isolated test uses two browser contexts with independent native IndexedDB identities under one synthetic account. It renames the devices, compares the actual SAS values, confirms that one approval cannot enable Send, approves on the second device, transfers/decrypts text and a three-chunk binary file, compares downloaded bytes exactly, completes deliveries and revokes the second key. Refresh and reload must reject that revoked key. Captured chunk writes exclude the synthetic message plaintext. Both browser tests passed in actual Chromium on commit 6942ad106ce3d8bbf1a1df441f7fc846e9b04175, workflow 38747425857, job 116464642353 (two tests, 9.7 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38747425857 . Subsequent source changes require their own acceptance run. It does not establish LAN discovery, native clients, interrupted upload resume, Matrix verification or physical-device compatibility.

## Managed Matrix browser acceptance extension

The third test requires LOCAT_TEST_SYNAPSE_PYTHON pointing at the pinned isolated Python environment; without it the test is explicitly skipped, which is not Matrix acceptance. CI installs the pinned requirements and supplies that interpreter. Its fixture generates a separate loopback-only Synapse database/configuration, an instance-scoped exclusive application-service registration and private service tokens. No operator homeserver URL, account, registration or credentials are accepted. Ordinary registration on the temporary Synapse is disabled; only the generated application service provisions managed devices. The Node and Python child environments exclude inherited operator Locat settings. Both processes and temporary files are removed on teardown.

The test signs in through the built UI and explicitly creates/binds a managed Matrix session. Real Rust crypto must initialize in native browser IndexedDB. A second tab sharing that device/store must be rejected as a writer, then bind after the first releases its Web Lock, with the same public signing key. Reload and rebind must retain that key. Verification sync must reach ready through the actual same-origin gateway. The UI must confirm current-session upstream logout and managed-device cleanup. Browser network routing still permits only the fixture HTTPS origin; Synapse is reached only by the production Node gateway. The initial three-test suite passed in actual Chromium at commit 056b778966cdd7ef2671960895213a5dd9c87b5f, workflow 38748818924, job 116469473948 (three passed, 18.8 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38748818924 . It does not exercise peer SAS UI, workers/history import/export, chat, cross-signing/full recovery, disk/browser restart durability or native devices.

## Browser peer SAS extension

A fourth test creates two independent browser accounts/devices, accepts their contact relationship through real authenticated API requests, and provisions/binds/enables verification through the built UI. Both people explicitly select each other. The test compares the actual three decimal SAS numbers, rejects the first exchange and checks that neither device becomes verified. A fresh exchange must remain unverified after only one confirmation and report exact-device SDK trust only after both confirm. The conversation API must still return 501. The four-test suite passed at b651cd3da884c70216cc156bdb39d7fc199f991f, workflow 38749827784, job 116472992843 (four passed, 24.8 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38749827784 . This does not claim full messaging, cross-signing or account recovery acceptance.

Subsequent lifecycle hardening keys Matrix settings by account, excludes simultaneous setup/bind/logout/revoke actions synchronously, and aborts the BrowserLinkClient and SDK gateway transport when their respective owners close. A separately owned provisioning cleanup client can still attempt to revoke a late issued token; if that cannot complete, durable server cleanup remains authoritative. Cancellation cannot undo committed work or an already-stored history import.

## Browser history-worker extension

A fifth test generates one real Megolm history key using an isolated in-memory pinned Rust OlmMachine; it never creates a room or sends a message through the app. A standard encrypted export is selected through the built history-import file control. The browser worker must reject a wrong phrase and clear the field, then import the actual key using the correct phrase. Reload/rebind must retain the same signing identity and imported history. The export worker must produce a standard downloadable file using the production 500,000-round derivation; the pinned Rust library independently decrypts that download and compares its room/session/key to the original fixture. A wrong export phrase must fail. Captured browser POST bodies exclude both history phrases and the plaintext history key. The full five-test suite passed at 474e4b8f81a010f784134cb7ccd0cd43326ebb71, workflow 38750184276, job 116474234604 (five passed, 34.7 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38750184276 . All Linux/Windows/macOS verification jobs in that workflow also completed successfully. It does not restore identity/trust/account access, establish room membership or open conversation Send.

## Sentinel browser acceptance extension

The sixth test uses another isolated HTTPS production server/database. It signs in through the built UI, creates a one-time token in Integrations and closes its secret sheet, verifies that inventory cannot return the token, then uses that synthetic token for an actual generic webhook. The incident UI applies a search, records a note and resolves the alert. The actual downloaded JSON must use applied filters, include the readable incident, exclude the note and token/owner fields, and mark hasMore correctly. Finally the UI revokes the token; another webhook must fail with 401 while the existing incident remains visible. Actual Chromium workflow 38751797265 at commit 213a92ca70a8004343ad1903ad6e7216cb405978, job 116479806942 passed all six tests (34.7 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38751797265 . This includes the preceding account-consistency/Remote source hardening; Remote screen capture remains mocked. It is not vendor-agent/notification/retention/native acceptance.

## Subsequent failure and diagnostic repeat coverage

Later workflow 38772513042 at 8b6467b646ac7c02e74775288b6f345fdf62f2fd, browser job 116551707406, reported five passes and one failure: the Secrets rewrap success notice did not appear within 15 seconds. No diagnostic state was included, so this is an unresolved observed failure rather than proof of a particular cause. Earlier successful runs above remain historical evidence, not certification of this failing revision.

The foundation test now brings the Secrets page to the foreground and adds failure-only visibility/validation flags, generic error text and private endpoint paths/statuses. It never logs input values, passphrases or request bodies. The main success assertions and production visibility auto-lock are unchanged. After a passing full suite, CI repeats the foundation flow three times with no automatic retries. JSON reports have separate names and browser output cleanup is confined to test-results/browser-artifacts, preserving both reports. The peer-SAS test now establishes friendship using the built Contacts search/request/refresh/accept controls rather than API seeding. These revisions require an observed successful run; repeat execution is not a substitute for investigating any renewed failure.

Subsequent workflow 38773607256 at 3fe5203 passed the Secrets foundation assertion and five tests overall; the peer Contacts/SAS test exceeded 120 seconds and a context-close error masked its stalled action. Its repeat step did not run. The next diagnostic revision bounds individual browser actions/navigation and names sign-in/contact/binding stages; cleanup preserves the original test failure. Cryptographic success/trust assertions remain unchanged. The contacts change has not yet earned full browser acceptance.

Diagnostic workflow 38774568776 at e649ea7, job 116558747407, identified the peer test's exact failure: the contact-search placeholder was absent on the post-login landing route. The scenario incorrectly assumed it was already on Messages. The fixture now explicitly navigates both accounts to /messages and checks Find contact before discovery. The other five tests passed, including Secrets; the repeated step was skipped. This fixture correction still needs observed CI acceptance; no trust/cryptographic assertion or application auto-lock was removed.

## Corrected Contacts route and repeat execution observed

Workflow 38775163620 at d3879a09601fbd64025b47b3705c71a3a76b3bd9, browser job 116560800040, passed all six main tests (28.9 seconds) and then all three foreground foundation repetitions (10.3 seconds): https://github.com/ibrahim1101/Locat-ui-3.0/actions/runs/38775163620 . This includes actual Contacts UI search/request/acceptance before SAS, account Settings lifetime changes and expected-owner headers on private/Sentinel calls. It does not prove the original isolated missing-notice failure's cause or certify arbitrary background behavior; visibility auto-lock remains active.

A seventh Photos target now exercises real native Chromium canvas/PNG/JPEG and browser-local import: pixel restoration on undo, redo geometry/annotations, edited-copy download and byte-identical original-file download, with history cleared on close/reopen. See PHOTO_EDITING.md. This new target is pending until its own observed successful run and does not certify all image codecs/native applications.

## Photos drawing acceptance observed

The preceding undo-only Photos revision 812058a0cfec55424827f071ded531c3ff2723f4 passed workflow 38776082498 on all three OS verification jobs; browser job 116563960019 passed seven tests (37.1 seconds) plus three foundation repetitions (12.4 seconds).

Drawing revision 03a8805 / workflow 38777466494 passed all OS verification jobs but its browser job 116568715798 failed Photos when a raw mouse-down did not activate a draft after lower-page controls. Six other scenarios passed; repetitions were skipped. The fixture now explicitly scrolls to the canvas and checks its center hit target before using actual mouse input.

Corrected revision b44cdaeb30d4d4381d50f52c827bbb91493aac91 / workflow 38778141307 / browser job 116571028417 passed seven tests in 40.1 seconds, then three foundation repetitions in 11.4 seconds. Photos checks actual green stroke pixels, one-step undo/redo, cancelled draft/export gating, undoable clearing, JPEG export and unchanged original PNG bytes. This is desktop Chromium acceptance, not physical touchscreen/stylus or native application certification. The subsequent Photo information disclosure assertion requires its own observed run.

Photo information revision 8ce518500b5f7554e00b8bb6492c2cb0cf90714f / workflow 38778737431 / job 116573076384 passed seven scenarios (38.4 seconds) plus three foundation repetitions (12.4 seconds), including the original decoded-dimensions disclosure. The next Photos tag-save/reload/search assertion requires its own observed execution.

Tags revision 5e2149b84065168211e34b3322f6aba325ff653c / workflow 38779206826 / browser job 116574713201 passed seven scenarios (38.5 seconds) plus three foundation repetitions (12.2 seconds). Photos tags were saved through the built UI, retained after page reload and found by tag search. The subsequent explicit duplicate-comparison assertion requires separate observed execution.

Duplicate-comparison source fc49fa234f5617cadf7f90f80d0a9bb2d32ef09c / workflow 38780050257 / browser job 116577577755 passed seven scenarios (38.3 seconds), then three foundation repetitions (12.2 seconds). The actual Photos UI imports a second identical PNG and displays both filenames in one matching-hash group. These results include the complete Photos browser scenario added in this batch; visual similarity, native/hardware/physical input and cloud synchronization remain outside this acceptance.

Timeline source 488a4fb50828deb5a54c2711a1bb2dfc1841a1ea / workflow 38781851921 succeeded on all four jobs. Browser job 116583811006 passed seven scenarios (40.4 seconds) plus three foundation repetitions (12.2 seconds), including import timeline selection/filtering and Grid restoration. New persistent thumbnail/WebP assertions require their own observed execution.

Thumbnail revision bd988597cbcb436ebc988a15a12726380bb29909 / workflow 38783128218 / browser job 116588186778 passed six scenarios but failed Photos with TypeError: Failed to fetch in its new fetch(blob URL) inspection helper. The fixture now inspects the synthetic account's persisted thumbnail Blob in native IndexedDB, retaining production connect-src 'self'. It also checks actual 800×400-to-320×160 native resizing and local-card/import readiness while fixture server inventory is deliberately withheld. All corrected assertions require an observed passing run.

Corrected fixture revision f3a41830cca43b13565f8d1914b136c5eada512d / workflow 38784656103 / browser job 116593436148 passed seven scenarios (40.7 seconds) and three foundation repetitions (12.5 seconds). Actual Photos acceptance now includes stored WebP thumbnail data before/after reload, native 800×400-to-320×160 resizing, original PNG preservation and local-photo/import readiness during a deliberately paused server inventory request. Earlier fixture failures remain historical failures. No CSP, account authorization, original-file assertion or success requirement was relaxed. Native devices, other physical codecs, EXIF timelines and cloud synchronization remain outside this acceptance.

Workflow 38784656103 subsequently completed successfully on all four jobs, including Windows, Ubuntu and macOS source verification. These OS jobs do not certify native installers or physical-device behavior.

The 2026-10-16 room-bootstrap/ciphertext-gateway source batch does not add a browser conversation scenario. Existing seven scenarios and prior successful runs remain historical evidence for their exercised flows. SDK/Synapse and Node HTTPS room tests do not establish browser conversation acceptance. UI Send remains gated until a complete built-client scenario passes.

Workflow 38849371659 at fb97863dc3a935d726edfe1f443615af42c76a8c / browser job 116806947302 passed seven main scenarios (36.9s), then two of three Secrets repetitions passed (26.7s); the remaining repeat failed with a visible rewrap dialog, no server rewrap call and an empty required field. All three OS source jobs passed. This workflow is a failure, not full browser acceptance. The shared Sheet opening timer now preserves focus already inside the dialog; two source regression tests cover preservation and normal initial focus/opener restoration. The exact prior repeat failure cause is not proven, and a new observed browser run is required. New encrypted transport source has Node/SDK/production HTTPS acceptance; no browser conversation test yet.

Observed source follow-on 76908f6f4872a498d6b734e0d04383e7bdb685fc / workflow 38850540733 / browser job 116810544497 passed all seven scenarios (39.0s), followed by all three foreground Secrets repetitions (12.4s). This exercises the corrected shared Sheet focus behavior without relaxing required fields or store security. Ubuntu job 116810544619 also passed the expanded real Synapse/production HTTPS protected messaging fixture and all source tests; macOS verification succeeded. Windows job 116810544655 subsequently completed successfully; all four jobs passed. Browser conversation UI is still not exercised.

Account-owned browser integration (local source 16a9452): explicit handle adoption/stop, guarded controller, bounded original-event retries and real Contacts-to-conversation UI are implemented with 261 frontend/111 backend tests and production HTTPS controller acceptance. Send remains hard-gated pending new built-browser room/ownership acceptance and actual Send/Receive/reliability/security coverage. No milestone completion claim.

Full browser acceptance candidate: prerequisites passed at bf24e71 / workflow 38866823701, all four jobs; browser 116861467492 passed seven scenarios (53.6s) plus three repetitions (12.0s), including native owner retention and real encrypted-room sync with Send disabled. Local 261 frontend/111 backend and real HTTPS controller/lost-ack tests pass. New source ecd9a9e exercises actual Send, unverified-device block, offline homeserver restart, reload/rebind, tamper/cross-account/revocation and plaintext scans in the isolated CI acceptance build only. Default Send remains disabled until this candidate is observed passing; no messaging milestone completion claim yet.

Full candidate accepted at 2d0e2ad / run 38868622567 / browser 116867181610: seven scenarios in 1.3m, three repetitions in 10.3s, all four jobs succeeded. Actual built UI Send/Receive, unverified-device blocking, offline/homeserver restart, reload/key/trust/history retention, tamper/cross-account/revocation and ciphertext persistence checks passed. Default Send is now enabled and the acceptance-only build flag removed; fresh SDK key query precedes guards. Local 262 frontend/111 backend + type/lint/build/real HTTPS/Synapse pass; normal-build CI still pending. Broader reliability/recovery, native/physical/global/federation/TURN and ecosystem scope remain open.
