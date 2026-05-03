import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      colors: {
        // Official ORBF brand palette — single source of truth.
        // Primary teal: #066a67 • Primary orange: #ff7235.
        brand: {
          // Backwards-compatible MD3 references (kept so existing usages
          // like bg-brand-surface don't regress).
          primary: "var(--md-sys-color-primary)",
          secondary: "var(--md-sys-color-secondary)",
          surface: "var(--md-sys-color-surface)",
          background: "var(--md-sys-color-background)",
          text: "var(--md-sys-color-on-surface)",
          muted: "var(--md-sys-color-on-surface-variant)",
          // New canonical brand tokens.
          teal:        "#066a67",
          tealDark:    "#044f4d",
          tealDeep:    "#033f3e",
          tealSoft:    "#e6f3f2",
          tealMuted:   "#cce7e6",
          orange:      "#ff7235",
          orangeDark:  "#e85f24",
          orangeSoft:  "#fff0e8",
          orangeMuted: "#ffd8c4",
        },
        // Semantic aliases.
        primary: "#066a67",
        accent:  "#ff7235",
        // Legacy palette names — re-pointed to the new tokens so any
        // unswept call sites adopt the rebrand automatically.
        ozeki: {
          dark:  "#0f172a",
          slate: "#1e293b",
          green: "#066a67",
          mint:  "#e6f3f2",
          gold:  "#eab308",
        },
        charius: {
          beige:  "#FAF5EF",
          dark:   "#09110D",
          orange: "#ff7235",
        },
      },
      boxShadow: {
        panel: "var(--elevation-2)",
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        brand: "var(--shape-md)",
      },
      transitionTimingFunction: {
        "out-smooth": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
};

export default config;
