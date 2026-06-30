import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    "*.js",
    "*.mjs",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Permite descartes intencionados con prefijo `_` (p. ej. `[_n, val]`).
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "off"
    }
  },
  {
    // Los ficheros de test usan <img> a propósito; no necesitan next/image.
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: { "@next/next/no-img-element": "off" },
  }
]);

export default eslintConfig;
