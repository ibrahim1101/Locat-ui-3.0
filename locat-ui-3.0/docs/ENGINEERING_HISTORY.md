# Engineering history — current scope rework

Date: 2026-10-20. Earlier records are preserved in `docs/archive/ENGINEERING_HISTORY_2026-10-20_pre-search.md`.

## Retired feature scope

Cinema and standalone media libraries, Locat Remote, and SentinelLab/integrations were removed from active UI, routes and helper code. Schema 18 drops their dedicated tables; core account, messaging, Link, Vault, Secrets and activity data remain. References to retired feature names in active source are limited to compatibility migration/backup code and tests that assert retired routes and tables are absent.

## Nested decrypted Chat search and encrypted text edits

Chat search is a collapsed header disclosure. It matches text and attachment names among up to 200 successfully decrypted messages loaded on this device, keeps terms in component memory, and jumps locally.

The sender can edit an owned decrypted text message from its nested message actions. The edit is a new encrypted event; the target ID and new body remain in ciphertext. Projection requires the edit sender to match the original sender. Attachments and another user's messages are rejected. The sender can also redact an owned encrypted message for everyone from the same nested menu, with a styled confirmation that explains retained backups and saved copies. The deletion controller accepts only the sender’s own encrypted room events, checks the current Locat binding after event lookup, and sends a content-free redaction request. Redacted messages and replies project safe deleted placeholders. Unit coverage checks ownership, forged edits and encrypted send shape; browser coverage exercises the two-account edit and deletion UI and checks that content is not sent in clear text.

## Device app lock

Account → Security now includes a nested device-local app lock. Passcodes are salted and derived with PBKDF2-SHA-256; settings control inactivity timeout and background locking, and users can lock immediately. Lock signals clear other open same-origin app tabs as well. The lock gates the app UI while leaving the server session intact. Browser storage is not encrypted by this feature, and biometrics remain disabled pending verified platform authentication. Focused tests cover passcode verification, setting/policy lifecycle, and hiding/revealing app content through the gate. The built-browser foundation flow now additionally checks reload persistence, wrong-passcode rejection, and correct unlock without storing the passcode in the verifier.

## Validation and publication repair

Local TypeScript, ESLint, all frontend/server tests, production build, browser-spec syntax and Playwright discovery passed after source restoration. The real Matrix browser scenario skipped locally because `LOCAT_TEST_SYNAPSE_PYTHON` is unavailable. Hosted UI and core workflows passed on follow-up commit `dcb872b` (runs `39446767634` and `39446768005`), including Chromium and Firefox Matrix acceptance. The later docs-only scope commit `c511cd0` passed platform jobs and the Chromium/Firefox identity, Link and messaging browser batch (core run `39450561720`). The first restored-source browser run exposed a test-fixture issue: the edit case changed a shared message used by a later step. The test now sends and edits its own unique message. The production build retains its Matrix crypto chunk-size advisory. The app-lock follow-on passes TypeScript, ESLint, 271 frontend tests, 108 server tests and production build locally; its hosted macOS/Linux/Windows checks passed, while the longer browser batch was still running at the deletion checkpoint. The delete-for-everyone change passes TypeScript, ESLint, 272 frontend tests, 108 server tests, production build and focused gateway/transport tests locally. The first hosted delete-for-everyone acceptance exposed that the gateway sync allowlist dropped Matrix redaction events, so neither client received the deleted placeholder even though the redaction request was accepted. The gateway now preserves redaction events only in authorized private-room sync and strips any cleartext reason before forwarding. The next hosted Matrix run will verify both clients project the deleted placeholder and keep plaintext out of redaction traffic. App-lock browser acceptance covers reload persistence and wrong/correct passcodes; its Chromium flow passed in run `39457230979`, and cross-tab propagation is included in the latest hosted run. Local Playwright execution is blocked by the missing Chromium binary; browser-test discovery succeeds and hosted CI installs its own runtime. The production build retains its Matrix crypto chunk-size advisory.

Earlier publication failures: commit `89e1f36` included a malformed `ConversationSearch.tsx` from a wrong working directory; UI run `39442044980` and core run `39442037749` failed TypeScript on that source. Commit `715f369` repaired the source but its large docs were truncated by the connector. Commits `2788518` and `003585b` then used UTF-8 blob uploads that created empty app-file blobs; their GitHub Actions failures were upload corruption, not source failures. This repair restored the last verified non-empty source snapshot, reapplied encrypted edits and republished changed files using base64. Fetched GitHub blob sizes and SHAs match local file hashes.

Hosted browser run `39460633601` passed all platform core checks but its browser job exposed two acceptance updates after Messages gained nested sections: Matrix setup still expected Find contact on the default Contacts section, and the encrypted-store flow could not locate the Lock now header action after its unlock round-trip in both Chromium and Firefox. The Matrix flow now explicitly opens Find people and moves between Requests and Contacts; the encrypted-store browser diagnostic now reports visible action labels without field values. The Lock now failure's cause remains under investigation and must be confirmed by the next hosted browser run.

## Remaining limits

Search covers loaded messages only. Client-side edit projection can be bypassed by a modified client, so peers should accept only authenticated same-author events. Scheduled sending stays unavailable until it has a durable sender compatible with device-held Matrix credentials. Physical-device and broader identity-recovery acceptance remain open.

## Standalone encrypted secure notes

Secrets now stores secure notes as a separate encrypted entry type with strict field validation and the same account/module/record-bound authenticated encryption as credentials. The editor presents Credential and Secure note as a nested segmented choice; note mode provides a multiline field, while credential mode keeps password generation and optional note details. Notes can be searched locally after unlock, viewed, copied, edited and removed. UI and crypto tests verify encrypted upload, note round-trip and bounds. This remains an experimental browser implementation; native storage and independent security review are pending.

## Nested contact sections

Messages now separates accepted contacts, pending requests, account discovery and blocked accounts into a compact Obsidian Ember segmented control. Sending or cancelling a friend request moves into Requests; accepting one moves into Contacts. Block/unblock moves into Blocked or Contacts after the server confirms the mutation. Empty states explain each destination, and the existing account-scoped request cancellation behavior remains in place. Focused UI coverage verifies section isolation and the discovery/mutation lifecycle.

## Nested Link destinations

The Link Devices screen now groups registered browsers, verified pairings and encrypted transfers into separate counted sections using the existing Obsidian Ember segmented-control treatment. Successful sends open Transfers, and pairing decisions return to Pairings. Focused Link tests cover section navigation and transfer recovery; browser acceptance now navigates the same sections during the two-device pairing, transfer and revocation journey. Local TypeScript, ESLint, all frontend/server tests and production build were run for this batch; hosted acceptance will be recorded after publication.

## Nested private storage destinations

Unlocked Vault and Secrets now separate Entries, Backups and Security into counted Obsidian Ember sections. Search, folder filtering and entry actions stay under Entries; encrypted export and missing-entry restore are under Backups; passphrase changes are under Security. The Credential/Secure note choice remains nested inside the Secrets editor. Locking resets navigation to Entries along with clearing decrypted state. Focused tests verify section visibility, the retained secret-note lifecycle and passphrase-change flows.

## Live Home data boundary

The Home dashboard previously rendered preview conversation and device fixtures regardless of adapter mode, which could make sample activity look like a signed-in user's real account data. Fixture rows now render only in preview mode and carry a visible “Preview sample data” label. Live mode shows a clear message that conversation summaries are not connected yet and directs users to the actual Chats and Link screens. Focused tests cover both modes. Live Home summaries remain open work.

The live dashboard now also loads account-owned accepted-contact and incoming-request counts through the same expected-account guard used elsewhere in live settings. It has loading, retry and cancellation states, and routes into Messages for the detailed Contacts, Requests and Find people sections. No conversation previews are inferred from contact membership.

When there are incoming requests, the Home summary opens Messages directly to its nested Requests section; otherwise it opens Contacts. The selected nested destination is read from the route query so the shortcut lands in the relevant view without flattening the Messages screen.

This dashboard batch passes TypeScript, ESLint, 282 frontend tests, 108 server tests and the production build. The existing Matrix crypto chunk-size advisory remains.

## Active handoff and messaging status

The old UI integration handoff described this project as a fixture-only presentation layer and listed Cinema, media, Remote and Sentinel integrations as future targets. It is now archived as `docs/archive/LOCAT_INTEGRATION_HANDOFF_pre_core_scope.md`; the active handoff documents the current same-origin server, authenticated APIs, Matrix/Link/private-store boundaries, retired scope and remaining platform/security acceptance. The live module availability message for Messages now reflects the existing verified one-to-one encrypted implementation and keeps cross-device/physical-device acceptance marked open.

Browser foundation acceptance now creates a second synthetic account, sends a real incoming contact request to the signed-in account and checks that Home routes directly into the nested Requests view. The spec passes `node --check` and Playwright discovery. Local execution is blocked because the workspace does not have Playwright's Chromium headless executable installed; hosted `browser-foundation` acceptance is the verification gate for this addition.


## Live global Search data boundary

The live `/search` route previously used a destination-only view. It now uses the shared search page, which loads account-owned accepted contacts from `/api/contacts` and searches them alongside the module registry; the request is cancelled on unmount/account change and scoped to the expected account. Preview mode keeps visibly fictional contact and message fixtures. Live encrypted messages remain searchable only inside an open conversation on this device. Focused tests cover account scoping, fixture isolation, empty contacts and preview behavior. The browser foundation flow checks that live search for a fixture-only person returns no result. A resolved empty contacts response leaves the results empty without retaining a loading state. The actual live Home route now mounts its account-scoped contact/request summary, keeps the unavailable conversation summary truthful, and routes request review into the nested Requests section. A browser-foundation assertion initially expected the preview Home copy on the separate live route; the updated flow now verifies the real live Home card and keeps the fixture isolation checks. Local TypeScript, ESLint, 286 frontend tests, 108 server tests and production build pass; the Matrix crypto chunk-size advisory remains.


## Windows proxy-test startup tolerance

The hosted Windows verifier occasionally exceeded the proxy-mode server test's original three-second readiness window before starting the listener. The test now polls for up to ten seconds while retaining the immediate child-exit check. Both focused hosting tests pass locally; the next Windows workflow will verify the larger startup margin.
