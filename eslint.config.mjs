import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".next*/**",
      "frontend/.next/**",
      "frontend/node_modules/**",
      "next-env.d.ts",
      "node_modules/**",
      "public/**",
      "out/**",
      "coverage/**",
      "dist/**",
    ],
  },
  js.configs.recommended,
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
