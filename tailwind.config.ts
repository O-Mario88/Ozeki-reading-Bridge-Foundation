import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--md-sys-color-primary)",
          secondary: "var(--md-sys-color-secondary)",
          surface: "var(--md-sys-color-surface)",
          background: "var(--md-sys-color-background)",
          text: "var(--md-sys-color-on-surface)",
          muted: "var(--md-sys-color-on-surface-variant)",
        },
      },
      boxShadow: {
        panel: "var(--elevation-2)",
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
