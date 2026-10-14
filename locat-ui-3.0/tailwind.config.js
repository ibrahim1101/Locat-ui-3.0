/** Locat UI 3.0 — every color resolves to a CSS variable defined in src/theme/themes.css. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        s1: v("surface-1"),
        s2: v("surface-2"),
        s3: v("surface-3"),
        line: v("line"),
        "line-strong": v("line-strong"),
        ink: v("ink"),
        "ink-2": v("ink-2"),
        "ink-3": v("ink-3"),
        ember: v("ember"),
        "ember-ink": v("ember-ink"),
        "ember-soft": v("ember-soft"),
        titanium: v("titanium"),
        ok: v("ok"),
        warn: v("warn"),
        danger: v("danger"),
        info: v("info"),
        planned: v("planned"),
      },
      fontFamily: {
        sans: ["'Manrope Variable'", "Manrope", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
      },
      borderRadius: { xl: "14px", "2xl": "20px", "3xl": "28px" },
      spacing: { "safe-t": "env(safe-area-inset-top)", "safe-b": "env(safe-area-inset-bottom)" },
      boxShadow: {
        lift: "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 12px 32px -12px rgb(0 0 0 / 0.6)",
        float: "0 24px 64px -16px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(var(--line) / 1)",
        ember: "0 8px 28px -10px rgb(var(--ember) / 0.55)",
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
        "sheet-up": { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { from: { opacity: 0, transform: "scale(.96)" }, to: { opacity: 1, transform: "none" } },
        pulse2: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } },
        eq: { "0%,100%": { transform: "scaleY(.3)" }, "50%": { transform: "scaleY(1)" } },
      },
      animation: {
        rise: "rise .32s cubic-bezier(.2,.8,.2,1) both",
        "sheet-up": "sheet-up .28s cubic-bezier(.2,.8,.2,1) both",
        fade: "fade .2s ease-out both",
        pop: "pop .2s cubic-bezier(.2,.8,.2,1) both",
        pulse2: "pulse2 1.4s ease-in-out infinite",
        eq: "eq .9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
