# Locat UI 3.0: platform behavior

## Navigation architecture
| Width | Pattern |
|---|---|
| < 768 (Android phones 360 / 390 / 430) | Bottom nav with 5 destinations: **Chats · Media · Home · Devices · More**. Media opens the last used of Cinema / Music / Photos (a segmented switcher sits in each header). More (`/modules`) lists every module by category with availability badges. The bottom nav is hidden on immersive routes: conversation, video player, photo viewer, remote session |
| 768–1099 (tablet, compact window) | Icon rail sidebar (76 px). Two-pane Messages |
| ≥ 1100 (1280 / 1440 / ultrawide) | Full grouped sidebar (Locat, Media, Connect, Protect, Organize, System). Multi-pane Messages, Sentinel detail pane, Music side player, two-pane Settings. Content is capped (`max-w-*`) for readability on ultrawide screens |

Startup is **chat-first by default** (`/` → `/messages`), following `ORIGINAL_CHAT_FIRST_UI_AUDIT_2026-10-12.md`. The user can switch it to Home under Settings › Appearance.

## Android system Back contract (`src/app/BackProvider.tsx`, `src/app/back.ts`)
The native wrapper calls `window.locatBack()` from the Capacitor `backButton` listener. The result is handled in this order:
1. **Keyboard** open (focused input on a compact screen): blur it. Returns `keyboard`.
2. **Topmost overlay** (Sheet, ActionMenu, command palette, Preview lab, video player layer): close it. Returns `overlay`. On desktop, Escape takes the same path.
3. **Detail → parent**: `/messages/:id` → `/messages`, `/photos/:id` → `/photos`, `/settings/:section` → `/settings`. Returns `navigated`.
4. **Module → origin**: history back if history exists, otherwise the startup root. Returns `navigated`.
5. **Root**: the first press shows a "Press back again to exit Locat" toast (`exit-armed`). A second press within 2 s returns `exit`, and the wrapper should call `App.exitApp()`.

Deep links land on the target route. Back then follows rules 3–4, so it never exits straight from a deep link.

## Safe areas & system bars
- `viewport-fit=cover`. Headers use `pt-safe`. The bottom nav, composer, sheet footers and player controls use `env(safe-area-inset-bottom)`.
- Mobile inputs are forced to 16 px to stop iOS/Android zoom. The composer textarea auto-grows to 160 px.

## Keyboard & desktop
| Shortcut | Action |
|---|---|
| Ctrl/Cmd + K | Command palette |
| Ctrl/Cmd + , | Settings |
| Alt + 1–5 | Home, Messages, Cinema, Music, Devices |
| Enter | Send (desktop). Shift + Enter adds a newline |
| Enter / Shift + F10 / right-click | Open the focused message's menu |
| Player: Space / K, ← →, F, M | Play/pause, seek 10 s, full screen, mute |
| Photo viewer: ← → | Previous / next photo |
| Escape | Close the top overlay |

A skip-to-content link is provided. Everything is reachable by Tab, with a visible focus ring.

## Capabilities differ by OS (`PlatformInfo.capabilities`)
| Capability | Web | Android (Capacitor) | Windows / Linux / macOS (Tauri) |
|---|---|---|---|
| Native save dialog | ✗ | via SAF | ✓ (adapter) |
| Device media library | ✗ (file pickers) | MediaStore | folder pickers |
| PiP | browser-dependent | WebView-dependent | WebView-dependent |
| Biometric | **disabled** (pending signed verification) | disabled | disabled |
| Share target / widgets | planned | planned | planned |
| Remote input | — | viewer only | Windows host only |

## Background / foreground
- Vault and Secrets auto-lock on background or after 5 minutes idle (owned by Locat).
- App lock re-arms according to `autoLock` policy (owned by `lib/appLock.ts`).
- Background audio and lock-screen controls need the native integration (marked in Now Playing).
