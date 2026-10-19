# Locat UI 3.0 design system: "Titanium Ember"

## Identity
- Evolves Locat's Obsidian Ember: a matte obsidian canvas, layered titanium surfaces and a single **burnt-orange ember** accent (`#E86B2C`). The official logo is never recolored.
- Typography: **Manrope Variable** for UI (geometric, warm, legible at small sizes), with **JetBrains Mono** for LC codes, origins, metrics and timecodes. Both are self-hosted with `@fontsource` and work offline.
- Tone: restrained, with one accent per view. Depth comes from surface steps and hairlines, not from nested cards.

## Tokens (`src/theme/themes.css`, `src/theme/tokens.ts`, `src/index.css`)

Tailwind CSS v4 maps the shared CSS variables to utilities in the `@theme` block in `src/index.css`. Keep the actual palette values in `themes.css`; do not add per-screen colors or replace the shared theme tokens.
| Token | Use |
|---|---|
| `canvas` | App background |
| `s1` / `s2` / `s3` | Elevation steps: panels, inputs/rows, pressed/selected |
| `line`, `line-strong` | Hairlines (`.hairline`), dashed "planned" borders |
| `ink`, `ink-2`, `ink-3` | Primary, secondary and tertiary text |
| `ember`, `ember-ink`, `ember-soft` | Accent fill, text on accent, tint |
| `ok`, `warn`, `danger`, `info` | Semantic status |
| `planned` | Violet-grey reserved exclusively for *preview / planned / integration-pending* |

Themes: `obsidian` (default), `graphite`, `daylight`, plus `system`. Spacing uses a 4 pt base with 8 pt rhythm. Radii: 8 / 12 / 14 / 20 / 28 / pill. Breakpoints: compact < 768, medium 768–1099, expanded ≥ 1100, wide ≥ 1600.

## Components (`src/ui`)
| Component | Notes |
|---|---|
| `Button` | Variants: primary, secondary, ghost, danger, quiet. Sizes: sm, md (44 px touch / 40 desktop), lg (52). `loading`. **`disabledReason`** disables the button and exposes the reason through `aria-describedby` and a tooltip |
| `IconButton` | Requires `label`; `active` (`aria-pressed`), `tone`, `disabledReason` |
| `TextField` | Label, hint, error, icon, `reveal` (passphrase show/hide) |
| `SearchField`, `Switch` (role=switch, 56 px row), `Segmented` (radiogroup; replaces small dropdowns), `ChipRow` (horizontal, never wraps, 36 px chips, 56 px row, colour-only selection), `Slider` (horizontal/vertical) | |
| `Sheet` | **Adaptive**: bottom sheet on compact, dialog on medium+. Registers with the Back stack, initial focus and restore |
| `ActionMenu` | Long-press / right-click / Shift+F10 menu, with per-item `disabledReason` |
| `Badge`, `AvailabilityBadge`, `ImplBadge`, `Banner`, `PreviewOnlyBanner`, `StateView` (empty, error, offline, permission, locked, unauthorized, unsupported, planned), `Skeleton`, `Meter`, `Kbd` | |
| `Avatar` (presence ring, group squircle), `ListRow`, `Section`, `SectionTitle` | |
| `Toast` via `useToast`; `useReport(result)` maps `OperationResult` to honest feedback | |
| `LocatMark`, `LocatWordmark` | |

## Interaction-state contract (brief §8)
| State | Treatment |
|---|---|
| Default / hover / pressed | Surface step +1, `active:scale-[.98]` |
| Focus | 2 px ember `:focus-visible` outline, offset 2 |
| Active / selected | Ember tint + inset ember ring, or `s3` + lift. **Size never changes** |
| Disabled | 45 % opacity, `pointer-events:none`, reason announced |
| Loading | Spinner replaces the icon, `aria-busy` |
| Success / error | Toast `ok` / `danger`; inline field error |
| Offline | Connection strip + `StateView kind="offline"` + `ModuleGate` |
| Permission denied | `MediaPermission` (explain → request → Open settings when blocked) |
| Locked | Lock screens (App lock, Vault, Secrets) |
| Unauthorized | `ModuleGate` admin state |
| Unsupported | `StateView kind="unsupported"`, codec errors |
| Experimental / beta | `Badge tone=warn/ember`, subtitles |
| Planned | `planned` colour, `PreviewOnlyBanner`, reasons that cite requirement IDs |
| **Integration-pending** | Violet toast: "Preview only: nothing was sent or saved" |

## Motion
- Durations 140 / 220 / 320 ms on `cubic-bezier(.2,.8,.2,1)`. Animations: `rise` (staggered entrance), `sheet-up`, `pop`, `fade`, and `eq` (playing indicator).
- `prefers-reduced-motion` and the in-app "Reduce motion" toggle both collapse all animation.
- No animation library is used; everything is CSS.

## Layout rules
- Every screen uses `layouts/Screen`: a sticky, safe-area-aware header and an independently scrolling body.
- One container level only. Lists use hairline-divided `Section`s, not stacks of cards.
- Long strings: `break-words` / `[overflow-wrap:anywhere]` / `line-clamp`, plus truncation in rows.

## 3.0.0-preview.2 additions
| Component | Notes |
|---|---|
| `VirtualList` (`ui/Virtual.tsx`) | Dependency-free windowing with dynamic row measurement (ResizeObserver). `scroll="self"` or `"parent"` (virtualizes against the Screen body). `stickToBottom` for chat. Roving keyboard: ↑ ↓ Home End PgUp PgDn. Imperative `scrollToIndex` / `scrollToEnd`. Rows must use padding, not margins, for spacing |
| `VirtualGrid` | Responsive columns from `minItemWidth`. Each row is a virtual item. Used by Photos (20k) and Cinema |
| `ContextMenuProvider` / `useContextMenu()` | Cursor-anchored popover on mouse/keyboard (≥ 768 px): viewport flip/clamp, arrows, Home/End, type-ahead, Enter, Esc/Tab, disabled reasons, shortcuts, separators. Touch and phones fall back to the `ActionMenu` sheet. Triggers: right-click, Shift+F10, the Menu key, long-press |
| `DropProvider` / `useDropTarget()` | Global file-drag overlay that names the destination (or explains that none exists). Per-target size and type triage happens before calling the typed adapter callback |
| `/gallery` | Component gallery for every primitive and state, with a live theme switcher. Registered only when `adapter.mode === "preview"` |
| `?` | Keyboard shortcut sheet |
