# Engineering history — current scope rework

Date: 2026-10-20. Earlier records are preserved in `docs/archive/ENGINEERING_HISTORY_2026-10-20_pre-search.md`.

## Retired feature scope

Cinema and standalone media libraries, Locat Remote, and SentinelLab/integrations were removed from active UI, routes and helper code. Schema 18 drops their dedicated tables; core account, messaging, Link, Vault, Secrets and activity data remain. References to retired feature names in active source are limited to compatibility migration/backup code and tests that assert retired routes and tables are absent.

## Nested decrypted Chat search and encrypted text edits

Chat search is a collapsed header disclosure. It matches text and attachment names among up to 200 successfully decrypted messages loaded on this device, keeps terms in component memory, and jumps locally.

The sender can edit an owned decrypted text message from its nested message actions. The edit is a new encrypted event; the target ID and new body remain in ciphertext. Projection requires the edit sender to match the original sender. Attachments and another user's messages are rejected. Unit coverage checks ownership, forged edits and encrypted send shape; browser coverage exercises the two-account UI and checks that edit content is not sent in clear text.

## Validation and publication repair

Local TypeScript, ESLint, all frontend/server tests, production build, browser-spec syntax and Playwright discovery passed after source restoration. The real Matrix browser scenario skipped locally because `LOCAT_TEST_SYNAPSE_PYTHON` is unavailable; hosted acceptance remains necessary. The production build retains its Matrix crypto chunk-size advisory.

Earlier publication failures: commit `89e1f36` included a malformed `ConversationSearch.tsx` from a wrong working directory; UI run `39442044980` and core run `39442037749` failed TypeScript on that source. Commit `715f369` repaired the source but its large docs were truncated by the connector. Commits `2788518` and `003585b` then used UTF-8 blob uploads that created empty app-file blobs; their GitHub Actions failures were upload corruption, not source failures. This repair restores the last verified non-empty source snapshot, reapplies encrypted edits and republishes changed files using base64. Verify fetched files before interpreting the next workflow runs.

## Remaining limits

Search covers loaded messages only. Client-side edit projection can be bypassed by a modified client, so peers should accept only authenticated same-author events. Scheduled sending stays unavailable until it has a durable sender compatible with device-held Matrix credentials. Physical-device and broader identity-recovery acceptance remain open.
