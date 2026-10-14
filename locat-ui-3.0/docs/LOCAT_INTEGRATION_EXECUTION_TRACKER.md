# Locat UI 3.0 — integration execution tracker

Status: **migration preparation; no live integration completed yet**.

## Source-of-truth boundaries

- UI source: `ibrahim1101/Locat-ui-3.0`, `main`, `locat-ui-3.0/`.
- Existing application functionality: `ibrahim1101/Locat`, `release/locat-v1.0`.
- **No new feature work on old presentation screens.** Preserve the existing application as the functional reference and rollback path.
- Integration changes should be isolated in a new branch of **Locat**, not merged directly to its release branch. UI source remains in this repository until tested.
- Never replace Locat's existing auth, identity keys, crypto, local database, tRPC, native bridge, media pipeline, or backend with fixture implementations.

## Evidence-based baseline

| Capability | UI 3.0 source | Existing implementation | Live integration |
| --- | --- | --- | --- |
| Authentication and app lock | `src/contracts/auth.ts`, `src/screens/auth/` | `src/state/auth.tsx`, `src/pages/Login.tsx`, `src/lib/appLock.ts` | **Not started** |
| Navigation and module gating | `src/app/registry.ts`, `src/app/BackProvider.tsx` | `src/modules/registry.tsx`, `src/lib/featureAvailability.ts`, native Back | **Not started** |
| Encrypted messaging | `src/contracts/messaging.ts`, `src/screens/messages/` | `src/pages/Chat.tsx`, `src/lib/crypto.ts`, `src/lib/localdb.ts` | **Not started** |
| Cinema, music, photos | `src/contracts/media.ts`, `src/screens/{cinema,music,photos}/` | `src/pages/MediaLocal.tsx`, device media and playback/edit libraries | **Not started** |
| Devices and remote | `src/screens/{devices,remote}/` | `src/pages/{Link,Remote}.tsx`, `remote/` | **Not started** |
| Sentinel and private store | `src/screens/{sentinel,private}/` | `src/pages/{Sentinel,PrivateStore}.tsx` | **Not started** |
| Hub and administration | `src/screens/hub/` | `src/pages/{Hub,Admin}.tsx` | **Not started** |

The UI's `src/main.tsx` currently mounts `previewAdapter` and `FIXTURE_USER`. This is a **demo entrypoint, not a production client**. The `LocatUiAdapter` interface in `src/contracts/adapter.ts` is the integration seam.

## Execution gates

1. **P0: baseline** — Record exact commit SHAs for both repositories, run UI `npm ci && npm run check && npm run lint && npm test && npm run build`; run Locat's existing checks. Do not claim passing until run results are recorded.
2. **P1: safe integration branch** — Create a dedicated integration branch from `release/locat-v1.0`; import UI 3.0 under a namespaced directory without replacing existing routes or global CSS. Retain the existing app as default.
3. **P2: authentication** — Implement live auth/session/app-lock/connection adapters through Locat's existing providers. No fixture users, credentials, or preview state in production. Verify unlock, registration, logout, account switching, server TLS rejection, and offline behavior.
4. **P3: navigation** — Mount UI 3.0 behind an opt-in developer switch; preserve Android Back and module gating. Backend authorization remains authoritative.
5. **P4: messaging** — Wire projections and durable encrypted outbox actions; verify ciphertext-only network paths, receipts, attachments, drafts, groups, and error handling. Never report a send as successful before durable enqueue.
6. **P5: media/devices** — Connect native permission flows, actual media libraries and playback, photo export, device pairing, and remote sessions. Preserve existing Android/Windows behavior.
7. **P6: ecosystem** — Integrate Sentinel, private store, Hub, admin, diagnostics, and settings; label unsupported modules as planned.
8. **P7: acceptance** — Run security, regression, responsive, browser, native Android and upgrade tests. Build APK **manually** only for a meaningful integration milestone.

## Stop conditions

- Preview fixtures or mock adapters are reachable from production routes.
- Auth or app-lock bypasses Locat's existing identity-key unlock.
- UI displays a successful operation that was not persisted.
- Existing encryption, LAN, native permissions, or media functions regress.
- The integration modifies release branches, publishes builds, or changes Android package/signing without explicit approval.

## Immediate next engineering deliverable

Create an **opt-in live integration host** on a separate branch of the original Locat repository. It must reuse existing providers, mount UI 3.0 in a namespaced route, and initially show only the authenticated shell with accurate connection/module availability. Do not connect messaging until the authentication gate is proven.

No CI deployment or automatic APK workflow is needed for this preparation.
