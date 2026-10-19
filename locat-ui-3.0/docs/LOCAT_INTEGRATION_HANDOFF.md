# Locat UI 3.0: integration handoff

## What this repository is
A standalone React 19 + TypeScript + Vite 7 + Tailwind 3 presentation layer, compatible with Locat's frontend toolchain. It has **no** backend, auth, crypto, storage, media engine or network calls. It runs with `npm install && npm run dev` using isolated fixtures (`src/fixtures/*`).

## Dependencies added
`react-router@7` (already in Locat), `lucide-react` (already in Locat), `clsx` (already in Locat), `@fontsource-variable/manrope`, `@fontsource/jetbrains-mono`. No Radix, Expo, React Native, Next.js or animation libraries.

## How to integrate (recommended sequence, following Locat's `LOCAT_UI_INTEGRATION_PLAN.md`)
1. Copy `src/ui`, `src/theme`, `src/contracts`, `src/layouts`, `src/app`, `src/screens` into an isolated area of the Locat repo (e.g. `src/ui3/`). Merge the `@theme` utility mappings from `src/index.css` and `themes.css` behind a namespace. **Don't** copy `src/fixtures` into production entrypoints.
2. Implement `LiveLocatAdapter implements LocatUiAdapter`:
   - `auth.*` → `useAuth()` login/register/logout (identity-key unlock stays inside Locat), `NativeServerSetup` probe, `registrationPasswordError` for guidance, `quickSignIn` saved accounts.
   - `messaging.*` → the existing Chat.tsx handlers: encrypt → outbox → relay. `saveDraft` → `encryptedDraft`. `messageAction` → reactions / pins / replies / forwarding / edit / delete control payloads. `friendAction` / `conversationAction` → tRPC routers.
   - `media.*` → `deviceMedia`, MediaLocal queries, `renderPhotoEdit`, `musicPresets`.
   - `link.*`, `remote.*`, `sentinel.*`, `privateStore.*`, `admin.*` → the existing page logic and routers listed in `LOCAT_COMPONENT_INTEGRATION_MAP.md`.
   - `moduleAvailability` → port `moduleDisabledReason` and add `platform` checks.
   - Return `{status:"ok"}` **only** after the real operation completes (for messages: after durable encrypt and outbox enqueue, never before).
3. Provide projection hooks so screens get live data instead of fixtures. Each fixture import in a screen is one replacement point:
   `FIXTURE_CONVERSATIONS/MESSAGES/CONTACTS/SCHEDULED` (Messages), `FIXTURE_VIDEOS` (Cinema/Home), `FIXTURE_TRACKS` (Music, `app/PlayerProvider.tsx`), `FIXTURE_PHOTOS`, `FIXTURE_DEVICES/TRANSFERS`, `FIXTURE_REMOTE_HOSTS`, `FIXTURE_ALERTS/TOKENS/SOURCES`, `FIXTURE_VAULT/SECRETS`, `FIXTURE_ADMIN_USERS`. The recommended approach is a `useLocatData()` context provided next to the adapter.
4. Remove preview-only paths in live mode: `PreviewLab` (already self-hides when `adapter.mode==="live"`), the "Explore with fictional demo data" buttons (gate them on `adapter.mode`), the `onLocalMessages` fixture mutation, `screens/messages/capabilities.ts` (use `messageComposerState`), `VideoPlayer` (use `PlayerChrome` over the Locat `<video>`), the "Preview: show permission state" buttons, and the Equalizer `Curve`.
5. Mount the app inside Locat's existing providers: `AuthProvider`, `ConnectionProvider`, `TrpcProvider`/QueryClient, `AppLockGate`, `DownloadStatusHost`. Wire the Capacitor `backButton` to `window.locatBack()`.
6. Validate with `npm run check/lint/test/build`, the Android APK workflow, and the physical acceptance checklists.

## Callback catalogue
Every callback is declared in `src/contracts/*.ts` with JSDoc that names the owning Locat module. In brief: `AuthAdapter` (8), `AppLockAdapter` (3), `MessagingAdapter` (10), `MediaAdapter` (5), `PlayerCallbacks` (10), `LinkAdapter` (6), `RemoteAdapter` (3), `SentinelAdapter` (3), `PrivateStoreAdapter` (8), `AdminAdapter` (3).

## Unsupported / intentionally not implemented
Calls, passkeys, MFA, account closure, disappearing / timed / view-limited messages, doodles, sticker packs, encrypted video sharing, share target, widgets, LAN/mDNS/P2P, presence logs, Calendar, Automate, Workspace, Share and the Extensions runtime. Each one appears only as a reserved, disabled UI with a reason.

## Stop conditions (from Locat's integration plan)
- Any fixture or mock session reaches production.
- An adapter returns `ok` before the real operation is durable.
- The UI bypasses identity-key unlock or sends plaintext.
- A real action silently does nothing.
- The Android package ID, auth origins or push settings change.

## preview.2 integration notes
- New contract: `MessagingAdapter.attachFiles(conversationId, files)` → Locat's encrypted attachment pipeline (drag-and-drop and pickers).
- `fixtures/large.ts` and `prefs.largeLibraries` are preview-only stress data. Live data feeds the same `VirtualList`/`VirtualGrid` props.
- Connect `VirtualList.onEndReached`-style paging to the localdb history cursors when integrating (not yet a prop; add it if Locat pages history).
- `/gallery` isn't routed in live mode.
