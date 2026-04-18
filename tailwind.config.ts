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
        brand: {
          primary: "var(--md-sys-color-primary)",
          secondary: "var(--md-sys-color-secondary)",
          surface: "var(--md-sys-color-surface)",
          background: "var(--md-sys-color-background)",
          text: "var(--md-sys-color-on-surface)",
          muted: "var(--md-sys-color-on-surface-variant)",
        },
        ozeki: {
          dark: "#0f172a",
          slate: "#1e293b",
          green: "#006b61",
          mint: "#e6f0ef",
          gold: "#eab308",
        },
        charius: {
          beige: "#FAF5EF",
          dark: "#09110D",
          orange: "#FA7D15",
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
