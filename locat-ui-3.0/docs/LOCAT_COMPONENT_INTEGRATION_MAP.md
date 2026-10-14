# Locat UI 3.0: component integration map

Each row maps a UI 3.0 component to its typed input, its callbacks, and the existing Locat source that owns the real behavior. **Integration rule:** wrap the existing state and logic in a `LiveLocatAdapter` that implements `src/contracts/adapter.ts#LocatUiAdapter`, plus thin projection hooks. Don't add a second store or copy plaintext outside IndexedDB.

| UI 3.0 component | Props / contract | Callbacks → adapter | Existing Locat owner |
|---|---|---|---|
| `App.tsx` routes | `useSession().stage/prefs` | — | `src/App.tsx` (replace routes; keep `useAuth`, `ConnectionProvider`, `AppLockGate`) |
| `app/SessionProvider.tsx SessionProvider` (hooks in `app/session.ts`) | `adapter`, `initialUser`, `initialConnection`, `platform` | `setStage`, `setConnection` (preview only) | `state/auth.tsx` (`SessionUser`), `state/connection.tsx`, `state/nonServerMode.ts`, `lib/platform/index.ts` |
| `app/registry.ts MODULES` | `ModuleDef` (static) | `adapter.moduleAvailability(id, ctx)` | `src/modules/registry.tsx` + `moduleDisabledReason` |
| `app/BackProvider.tsx BackProvider` (hooks in `app/back.ts`) | `rootPath` | `window.locatBack(): BackOutcome` | `lib/nativeBackHistory.ts`, `components/shell/NativeBackNavigation.tsx`, Capacitor `App.addListener('backButton')` |
| `layouts/AppShell` (`Sidebar`, `MobileNav`, `ConnectionStrip`, `MiniPlayer`, `CommandPalette`) | session + player | navigation only | replaces `components/shell/AppShell.tsx`, `MobileBottomNav.tsx`, `ServerConnectionControl.tsx` |
| `screens/shared/ModuleGate` | `id` | — | `moduleDisabledReason`; the **server stays authoritative** |
| `screens/auth/Entry` Welcome/SignIn/Register/ServerSetup/LocalIntro | `AuthAdapter` | `signIn`, `register`, `probeServer`, `passwordGuidance`, `enterLocalMode`, `savedAccounts` | `pages/Login.tsx`, `useAuth().login/register`, `NativeServerSetup.tsx`, `lib/nativeServerOrigin.ts`, `contracts/password.ts`, `lib/quickSignIn.ts`, `NativeOfflineHome.tsx` |
| `LockScreen` | `AppLockAdapter` | `unlock` | `lib/appLock.ts verifyPasscode`, `AppLockGate.tsx` |
| `messages/Messages` | `ConversationView[]`, `MessageView[]`, `ContactView[]` | — | projection of `pages/Chat.tsx` state (`ConversationSummary`, `LocalMessage` from `lib/localdb.ts`) |
| `messages/Inbox` | `conversations`, `activeId`, `requests` | `onOpen`, `onCompose`, `onContacts`, `onScheduled`, `onLongPress` | Chat.tsx list + `HIDDEN-CHATS` |
| `messages/Conversation` | `conversation`, `messages` | `messaging.send/messageAction/saveDraft` | `ChatWindow.tsx`, `lib/crypto.ts`, outbox, `deliveryAck.ts`, `messageReactions/Pins/Replies/Forwarding.ts`, `encryptedDraft.ts` |
| `messages/Composer` | `ComposerDraft`, `ComposerCapabilities`, `replyTo`, `editing` | `onSend`, `onDraft`, `onAttach(kind)`, `onSchedule`, `onVoice(sec)` | `lib/controlStates.ts messageComposerState` (→ capabilities), MediaRecorder in ChatWindow |
| `messages/MessageBubble` | `MessageView` | `onMenu`, `onJump`, `onRetry` | `LocalMessage` projection; `messagePayload.ts` kinds |
| `messages/capabilities.ts` | fixture-only port | — | **Delete in live mode**: use `messageComposerState` |
| `ContactsSheet`, `ProfileSheet` | `ContactView[]` | `friendAction`, `findByUsernameOrCode` | `NewConversationDialog.tsx`, `FriendProfileDialog.tsx`, `usersRouter` |
| `ConversationInfoSheet` | `ConversationView` | `conversationAction`, `createGroup` | `GroupDialog.tsx`, `lib/groupEpoch.ts` |
| `ScheduledSheet` / `ScheduleSheet` | `ScheduledMessageView[]` | `schedule`, `cancelScheduled` | `ScheduleTextDialog.tsx`, `ScheduledMessagesDialog.tsx`, `lib/scheduledDrafts.ts`, `lib/scheduleTime.ts` |
| `LocationSheet` | conversation | `shareLocation` | `LocationShareDialog.tsx`, `lib/location.ts` |
| `cinema/Cinema` | `VideoItemView[]` | `media.refreshLibrary`, `media.requestAccess` | `pages/MediaLocal.tsx` (kind=cinema), `DeviceMediaLibrary.tsx`, `lib/deviceMedia.ts`, `api/media*` |
| `cinema/PlayerChrome` | `PlaybackView` | `PlayerCallbacks` | `LocalCinemaPlayer.tsx`, `CinemaHlsPlayer.tsx`, `lib/cinemaPlayback.ts`, `lib/playbackProgress.ts`. Mount their `<video>` behind the chrome. `VideoPlayer` (fixture) is replaced |
| `music/Music`, `NowPlaying`, `app/PlayerProvider.tsx` / `app/player.ts` | `TrackView`, `QueueView` | play/toggle/next/prev/seek | `MediaLocal.tsx` (kind=music), `LocalMediaQueue.tsx`, `lib/musicQueue.ts` |
| `music/Equalizer` | `EqView` | `media.saveEqPreset` | `MusicEqualizer.tsx`, `MusicFrequencyResponse.tsx`, `lib/musicEq.ts`, `lib/musicPresets.ts` (replace the fixture `Curve` with the real response) |
| `photos/Photos`, `Viewer`, `Editor` | `PhotoView`, `PhotoEditView` | `media.exportPhoto(id, edit, "copy")` | `pages/Photos.tsx`, `LocalPhotoEditor.tsx`, `lib/photoEditing.ts`, `lib/imageEditing.ts` |
| `screens/shared/MediaPermission` | `PermissionState` | `onRequest`, `Linking.openSettings` | `lib/platform/capacitor.ts`, Android SAF/MediaStore bridge |
| `devices/Devices` | `DeviceView[]`, `TransferView[]` | `link.*` | `pages/Link.tsx`, `lib/link.ts` (`pairingSas`, chunk crypto), `api/linkRouter.ts`, `components/link/DeviceLibrarySharing.tsx` |
| `remote/Remote` | `RemoteHostView`, `RemoteSessionView` | `remote.connect/disconnect/setInput` | `pages/Remote.tsx`, `remote/` |
| `sentinel/Sentinel` | `AlertView`, `SentinelTokenView`, `SentinelSourceView` | `sentinel.*` | `pages/Sentinel.tsx`, `api/sentinelRouter.ts` |
| `private/PrivateStore` | `PrivateStoreState`, `VaultEntryView`, `SecretEntryView`, `QuotaView` | `privateStore.*` | `pages/PrivateStore.tsx`, `lib/privateStoreCrypto.ts`, `contracts/privateStore.ts` |
| `search/Search` | `SearchResultView[]` | navigation | `pages/Search.tsx`, `lib/globalSearch.ts searchLocalMessages` |
| `hub/Hub` | `MetricView[]`, `ServiceView[]` | — | `pages/Hub.tsx` (admin stats); `packages/` telemetry prototypes |
| `hub/Admin` | `AdminUserView[]` | `admin.*` | `pages/Admin.tsx`, `api/adminRouter.ts` |
| `hub/Diagnostics` | real probes | — | `pages/Performance.tsx` (merge Remote stream stats) |
| `offline/Offline` | `ConnectionState` | `setStage("server")` | `state/connection.tsx`, outbox, `NativeOfflineHome.tsx` |
| `settings/Settings` | session prefs | various adapters | `Preferences.tsx`, `PrivacyCommandCenter.tsx`, `SecurityDialog.tsx`, `AppLockSection.tsx`, `NotificationPreferences.tsx`, `StorageDialog.tsx`, `lib/appearance.ts`, `lib/archive.ts` |
| `planned/Planned` | `ModuleId` | none (all disabled) | none yet |
| `ui/*` | design system | — | replaces `components/ui/*` shadcn primitives for new surfaces. Radix can still back a11y-heavy pieces later |

## State ownership

- **Authoritative:** Locat `useAuth`, Chat.tsx state, localdb, crypto, privateStore, tRPC/TanStack Query caches.
- **UI 3.0 local state** is limited to: view filters, search text, open overlays, draft text before handoff (the encrypted draft is persisted by Locat), and fixture-only mutations. In live mode, remove `onLocalMessages` and the fixture `setConversations` calls.
