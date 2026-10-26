# Locat UI 3.0: feature and UI coverage matrix

Audit source: `ibrahim1101/Locat`, branch `release/locat-v1.0` (shallow clone, read-only, 2026-10-14). The main sources were `docs/LOCAT_COMPLETE_FEATURE_MATRIX.md` (audit 2026-10-11, with addendum 2026-10-12), `src/modules/registry.tsx`, `src/App.tsx`, `docs/CONTROL-STATES.md`, `docs/LOCAT_UI_INTEGRATION_PLAN.md`, `docs/ORIGINAL_CHAT_FIRST_UI_AUDIT_2026-10-12.md`, `docs/CROSS_DEVICE_MEDIA_AND_ANDROID_BACK_PLAN.md`, `src/lib/*` and `contracts/*`.

**Nothing in this repository changes the Locat repository.** The status values below record evidence from the source. They are not claims that a feature is complete.

## Status legend (brief §2)

| Code | Meaning |
|---|---|
| **IMPL** | Implemented and integrated |
| **IMPL-U** | Implemented, not physically verified on the unified builds (only historical device acceptance exists, or none) |
| **PART** | Partially implemented |
| **EXP** | Experimental / beta |
| **SCAF** | Scaffolded only |
| **PLAN** | Planned, with no integrated implementation |
| **UNRES** | Historically unresolved |

UI treatment: **Live surface** means the control is functional once the adapter is connected. **Reserved** means the control is visible but disabled, with a reason and the requirement ID. **Preview module** means the screen is designed but every control is disabled.

Documents named in the brief that **don't exist** on `release/locat-v1.0`: none of the requested docs are missing (`ORIGINAL_CHAT_FIRST_UI_AUDIT_2026-10-12.md`, `CROSS_DEVICE_MEDIA_AND_ANDROID_BACK_PLAN.md`, `DEVICE_MEDIA_LIBRARY.md` and `LOCAT_CROSS_PLATFORM_TESTING.md` are all present). Module docs not opened in this pass are listed in §5.

## 1. The original 49-item register

| # | Requirement | Status | UI location / component | Interaction & states | Integration requirement |
|---|---|---|---|---|---|
| 1 | Profile picture | IMPL-U (historically accepted) | Settings › Profile (`screens/settings/Settings.tsx` "Change picture"); `ui/Avatar` everywhere | Pending result → toast; fallback avatar from initials | `ProfileDialog.tsx` + `lib/profilePicture.ts`; feed `avatarUrl` into `ContactView`/`SessionUserView` |
| 2 | Read-receipt on/off | IMPL-U (tested) | Settings › Privacy "Send read receipts"; `MessageBubble` delivery icon `read` | Footer explains that receipts are device-local and can't be retracted | localdb pref + `messagePayload` receipt events |
| 3 | Delete for everyone | IMPL-U (accepted) | Message action menu `delete-everyone` (`Conversation.tsx`) | Only on own messages; tombstone "This message was deleted"; limitation copy | `messageAction(id,"delete-everyone")` → Chat.tsx control payload |
| 4 | Hidden messages | IMPL-U (tested) | Message menu "Hide on this device"; header eye toggle shows the hidden view | Hidden view replaces the composer (CONTROL-STATES) | localdb hidden set |
| 5 | Voice messages | IMPL-U (tested) | Composer mic → recorder bar (60 s cap); `MessageBubble` voice waveform | Disabled when blocked; preview recorder captures no audio | Chat.tsx MediaRecorder + 2.9 MB limit; microphone permission flow |
| 6 | Bio | IMPL-U (accepted) | Settings › Profile bio; `ProfileSheet` | Copy notes that the bio is server-visible | usersRouter profile update |
| 7 | Unique LC code | IMPL-U (accepted) | Profile, Settings › Profile "Permanent identifiers", Contacts lookup "username or LC-1234" | Marked as fixed | `contracts/userCode.ts` `parseUserCode`; `findByUsernameOrCode` |
| 8 | Passkeys | PLAN | Sign-in footnote; Settings › Account "Passkeys" (reserved) | Disabled: "Planned (#8)" | Real WebAuthn verification + key recovery |
| 9 | Voice/video calling | PLAN | Conversation header phone/video icons (reserved) | Disabled with reason | Signaling/ICE/TURN module |
| 10 | Webhooks | IMPL-U (Sentinel scope) | Sentinel › Integrations (tokens, endpoint) | Create/revoke tokens; banner explains that outbound automation webhooks are planned | `sentinelRouter` |
| 11 | Hidden-messages management | IMPL-U (tested) | Hidden view: per-message "Restore to conversation" | Excluded from search and previews | localdb |
| 12 | Hidden chats | IMPL-U (tested) | Inbox "Hidden" chip, long-press/right-click menu, Conversation info "Hide conversation" | Device-only disclaimer in the hidden tab | localdb hidden conversations |
| 13 | Permanent deletion & retention limits | PART | Settings › Privacy "About deletion" banner; Conversation info "Delete local history"; Vault delete confirmation | Explicit limitation copy, never promises erasure | localdb tombstones; per-storage policy pending |
| 14 | Account closure | PLAN | Settings › Account "Close account" (reserved); Admin note that disable ≠ closure | Disabled | Server design needed |
| 15 | Online/offline presence | IMPL-U (tested; historical Android issue) | Avatar presence dot, conversation subtitle, ProfileSheet | "hidden" state honoured | `api/hub.ts` presence → `ContactView.presence` |
| 16 | Server status notifications | PART | Shell `ConnectionStrip`; Settings › Notifications "Server online/offline alerts (Partial)" | Offline / TLS / local strips | `state/connection.tsx`; native alerts pending |
| 17 | Edit sent messages | IMPL-U (accepted) | Menu "Edit" → composer edit mode; "edited" label | Own text messages only | `messageAction`/send with `editingId` |
| 18 | Single/multi-view messages | PLAN | Conversation info "View-once / limited-view" (reserved) | Disabled; screenshot disclaimer | Protocol needed |
| 19 | Picture editing | PART | Photos › Viewer › Editor; chat image edit uses the same editor contract | Crop / rotate / flip / filters / adjust / draw / text / undo-redo / "Save as copy" | `lib/photoEditing.ts` `renderPhotoEdit`, `ImageEditDialog.tsx` |
| 20 | Themes | IMPL-U (tested) | Settings › Appearance (Obsidian / Graphite / Daylight / System) | Live in preview (`data-theme`) | Persist through `lib/appearance.ts` |
| 21 | MFA | PLAN | Settings › Account "Two-factor" (reserved); sign-in footnote | Disabled | — |
| 22 | App lock | IMPL-U (tested, UI barrier) | `LockScreen` (Entry.tsx); Settings › Security | Passcode keypad; biometric disabled with reason | `lib/appLock.ts`, `AppLockGate.tsx` |
| 23 | Block/unblock | IMPL-U (tested) | ProfileSheet, Contacts "Blocked" tab, blocked conversation | Composer controls stay visible but disabled (CONTROL-STATES) | usersRouter/conversationsRouter |
| 24 | Enabled/disabled control states | IMPL-U (tested; partial ecosystem) | `contracts/common.Capability`, `Button.disabledReason`, `screens/messages/capabilities.ts` | Reason announced via `aria-describedby` and tooltip | Port of `lib/controlStates.ts` |
| 25 | Complete UI overhaul | PART → **this repository** | Entire Locat UI 3.0 | — | Integrate per `LOCAT_INTEGRATION_HANDOFF.md` |
| 26 | Notification sounds/settings | PART | Settings › Notifications (sound, quiet hours, preview), per-conversation mute | Custom ringtones reserved | `lib/notificationPrefs.ts` |
| 27 | Official logo | IMPL (approved asset) | `ui/Brand.tsx` with `public/locat-official-logo.png` (copied unchanged) | Never recolored | Keep blob c465d01… |
| 28 | GIFs/emojis/stickers | PART | Composer emoji/GIF button; `gif` attachment; sticker packs reserved | Sticker packs disabled "Planned (#28)" | Picker not in Locat yet |
| 29 | Admin user creation | PART | Administration "Create user" (→ integration-pending) + disable/revoke | Password re-auth sheet | `adminRouter`; creation API absent |
| 30 | Disappearing messages | PLAN | Conversation info › Message lifetime (reserved) | Disabled | — |
| 31 | Scheduled messages | PART | Composer menu "Schedule a text message" → `ScheduleSheet`; Inbox calendar icon → `ScheduledSheet` (pending first, cancel, failed state) | Server-uptime notice; text only | `ScheduleTextDialog`, `ScheduledMessagesDialog`, `lib/scheduledDrafts.ts` |
| 32 | Timed deletion | PLAN | Conversation info › Message lifetime (reserved) | Disabled | — |
| 33 | Server installation experience | IMPL-U (host acceptance partial) | Entry › Server setup (strict HTTPS probe, LAN/Tailscale guidance) | insecure / tls-error / unreachable / trusted states | `NativeServerSetup.tsx`, `lib/nativeServerOrigin.ts`. A first-run *host installer* UI isn't in scope (Docker/CLI) |
| 34 | Frontend performance | PART | Lazy routes, memoized bubbles, rAF resize, reduced motion, virtualization-ready lists | — | Measure on device |
| 35 | Doodles | PLAN | Composer menu "Doodle" (reserved) | Disabled | — |
| 36 | Nested replies | PART | Reply chip in composer; reply reference in bubble with jump/highlight and deleted/hidden/missing states | Thread viewer reserved | `lib/messageReplies.ts` |
| 37 | Widgets | PLAN | Home "Coming to Locat" note | — | `PlatformInfo.capabilities.widgets=false` |
| 38 | Privacy controls | IMPL-U (tested; wider scope partial) | Settings › Privacy (Everyone / Contacts / Nobody segmented controls) | — | `PrivacyCommandCenter.tsx` |
| 39 | Server presence logs | PLAN | Administration › Audit "Presence logs" (reserved) | Disabled | — |
| 40 | Configurable video sharing | PART | Composer menu "Video" (disabled with reason); Cinema handles host streaming separately | — | Chunked encrypted video pending |
| 41 | Avatar-triggered profile panel | IMPL-U (accepted) | Conversation header avatar → Conversation info; contact rows → `ProfileSheet`; sidebar avatar → Settings | Keyboard and touch | `ProfileDialog`, `FriendProfileDialog` |
| 42 | Friend requests | IMPL-U (tested) | `ContactsSheet` "Requests" tab (accept/reject/cancel), remove friend | Badge count on the Contacts icon | usersRouter |
| 43 | Strong-password policy | PART | Register: meter + 15-Unicode-char guidance, confirm field | Submit disabled with reason | `contracts/password.ts registrationPasswordError` (adapter `passwordGuidance`) |
| 44 | Android application | IMPL-U (tested packaging; runtime partial) | Compact layout, bottom nav, safe areas, Back contract (`app/BackProvider.tsx`) | — | Capacitor `backButton` → `window.locatBack()` |
| 45 | Encrypted file/document sharing | IMPL-U (tested, 2.9 MB) | Composer "Document or file · up to 2.9 MB"; file bubble with long-name wrap | — | Chat.tsx attachment; `lib/download.ts` |
| 46 | Full-resolution photo sharing | PART | Composer "Photo (original quality)"; bubble badge Original/Compressed + dimensions | — | `browserImage.ts` pipeline choice |
| 47 | Encrypted video sharing | PART | Composer "Video" disabled: "#47 not implemented"; `AttachmentView.video` state | — | Encrypted chunk path |
| 48 | Explicit-permission location sharing | IMPL-U | `LocationSheet` (current / manual, "share once", no background tracking); location bubble | Permission explanation before the native prompt | `LocationShareDialog.tsx`, `lib/location.ts` |
| 49 | OS/PWA share integration | PART | `public/manifest.webmanifest` receives text/title/URL; service worker stages local handoffs; Share reviews content before encryption | Automated UI flow; installed-PWA acceptance pending | Files/photos/videos and Android intents remain unsupported; no background or native integration claim |

All 49 items are mapped. Historical device acceptance (01, 03, 06, 07, 17, 41) and the unaudited "13/44" counter are preserved as evidence only. They aren't treated as unified-build acceptance.

## 2. Ecosystem register

| Module | Status | Route / screen | Availability source | Notes |
|---|---|---|---|---|
| M0 Messenger | Mixed (see §1) | `/messages`, `/messages/:id` (`screens/messages/*`) | adapter | Chat-first startup preserved (Settings › Appearance › "Open Locat to") |
| M1 Sentinel | IMPL-U | `/sentinel` | needs server | Severity tiles, filters, search, ack/resolve, sources health, token create/revoke |
| M2 Link | IMPL-U (server-relayed) | `/devices` | needs server | Pairing SAS approval, re-proof, alias, revoke, file/text/URL/clipboard (explicit paste), history; LAN/mDNS/P2P reserved |
| M3 Vault | EXP (limited beta) | `/vault` | needs server | Lock/unlock, quota 64 MiB / 128 entries / 2 MiB per file, encrypted names, backup export, delete confirmation |
| M4 Dashboard + Search | PART | `/home`, `/search`, `/modules` | local | Search banner says E2EE content is searched locally only |
| M5 Hub | EXP | `/hub` | admin-only | All metrics `null` → "—" with source caveat; no fake numbers |
| M6 Secrets | EXP | `/secrets` | needs server | Masked fields, reveal/copy via adapter, generator (local `crypto.getRandomValues`, never stored), auto-lock status |
| M7 Calendar + Automate | PLAN | `/calendar`, `/automate` | planned | Preview modules, controls disabled |
| M8 Share | PLAN | `/share` | planned | Preview |
| M9 Workspace | PLAN | `/workspace` | planned | Preview |
| M10 Extensions | SCAF | `/extensions` | planned | "No sandbox runtime: extensions receive no privileges" |
| M11 Offline/LAN | PART (outbox tested; LAN planned) | `/offline` | local | Three modes; outbox ≠ LAN messaging; LAN-only reserved |
| M12 | **UNRES** | none (intentionally) | — | `UNRESOLVED_MILESTONES` in registry; shown as an unnamed note on `/modules` |
| M13 | **UNRES** | none (intentionally) | — | Same. No name invented |
| Cinema | PART | `/cinema`, `/cinema/play/:id` | local | Device/server, folders, search, sort, resume, player chrome (speed, fit, subtitles, quality incl. experimental 1080p/4K HLS, PiP, fullscreen, codec error, buffering, reconnecting); series/playlists/tracks reserved |
| Music | PART | `/music` (+ `?eq=1`, `?now=1`) | local | Songs/albums/artists/folders/favorites, queue, shuffle/repeat, mini player, Now Playing, EQ 5/10/15/31 graphic + parametric (24 filters), preamp/headroom warning, Pure bypass |
| Photos | PART (beta) | `/photos`, `/photos/:id` | local | Limited/denied/blocked permission states, albums, viewer zoom/next, metadata, editor, HEIC unsupported state |
| Remote | EXP | `/remote`, `/remote/session/:id` | local | Consent sheet, stats overlay, input toggle (Windows only), disconnect; controller/audio reserved |
| Performance/Diagnostics | PART | `/diagnostics` | local | **Real** browser capability probes (read-only) |
| Administration | PART | `/admin` | admin-only | Disable/enable/revoke with password re-auth; create user → pending |
| Settings / Profile | PART | `/settings/*`, `/profile` → `/settings/profile` | local | 14 sections, see `LOCAT_UI_DESIGN_SYSTEM.md` |

## 3. Brief §5 checklist coverage (spot index)

- **A Entry:** Welcome, sign in (saved accounts = returning sessions), register, password guidance, server setup (HTTPS, LAN, Tailscale), local mode, identity recovery sheet, app lock, passkey/MFA reserved, account switching (Settings › Account), logout. Production auth is never simulated: the result is `integration-pending`, and "Explore with fictional demo data" is labelled as such.
- **B Navigation:** see `LOCAT_PLATFORM_BEHAVIOR.md`. Every module is reachable through the sidebar, More/`/modules`, or Ctrl+K.
- **C to S:** covered by the tables above.

## 4. Known gaps in this UI delivery (honest list)

- ~~Virtualization~~ done in 3.0.0-preview.2 (`ui/Virtual.tsx`): chat history, songs, the photo grid and the Cinema library.
- ~~Global drag-and-drop~~ done (`app/DropProvider.tsx`, `app/drop.ts`): conversations, Vault and Devices register as drop targets.
- ~~Cursor-anchored context menus~~ done (`ui/ContextMenuProvider.tsx`, `ui/ContextMenu.ts`).
- The drawing canvas in Photos is presentational (stroke counter). Real strokes come from `LocalPhotoEditor`.
- Group management (add/remove members, key rotation action) is shown in Conversation info. Rotation itself is owned by Locat `groupEpoch`.

## 5. Docs not inspected in depth this pass

`GROUPS.md`, `HIDDEN-*.md`, `MESSAGE-CONTROLS.md`, `NOTIFICATIONS.md`, `SENTINEL.md`, `LINK.md`, `SERVER_ADMIN.md`, `APPEARANCE.md`, `QUICK_SIGN_IN_DESIGN.md`, `PROFILE-VIEWING.md`, `SCHEDULED_MESSAGES.md`, `LAN_*`. Review them before wiring each module.
