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
      "scripts/**",
      "screenshot*.cjs",
      "src/tests/**",
      "*.js",
      "*.cjs",
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
      "@typescript-eslint/no-explicit-any": "warn",
      "no-constant-condition": [
        "warn",
        {
          checkLoops: false,
        },
      ],
      "prefer-const": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
);
