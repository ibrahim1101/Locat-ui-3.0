/**
 * Locat UI 3.0 design tokens (TypeScript mirror of themes.css + layout rules).
 * Tailwind classes are the primary consumer; these constants exist for logic that
 * needs numeric values (breakpoints, durations, z-layers) and for documentation.
 */
export const THEMES = [
  { id: "obsidian", name: "Obsidian", description: "Matte black with ember accent (default)" },
  { id: "graphite", name: "Graphite", description: "Softer dark titanium for long sessions" },
  { id: "daylight", name: "Daylight", description: "Warm light theme for bright rooms" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"] | "system";

/** Layout breakpoints (px). `compact` = phone, `medium` = tablet / small window, `expanded` = desktop. */
export const BREAKPOINTS = { compact: 0, medium: 768, expanded: 1100, wide: 1600 } as const;

/** 4pt base grid; components use multiples of 8 except hairline insets. */
export const SPACE = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;

export const RADIUS = { sm: 8, md: 12, lg: 14, xl: 20, pill: 999 } as const;

/** Minimum interactive target sizes. */
export const TARGET = { touch: 44, androidTouch: 48, pointer: 32 } as const;

export const MOTION = { fast: 140, base: 220, slow: 320, easing: "cubic-bezier(.2,.8,.2,1)" } as const;

/** Stacking layers. Only overlays use z-index. */
export const Z = { nav: 20, miniPlayer: 25, overlay: 40, toast: 50, preview: 60 } as const;
