import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig({
  // รวม config ของ Next.js
  extends: [...nextVitals, ...nextTs],

  rules: {
    "@typescript-eslint/no-explicit-any": "error",
  },

  // Override ignores
  ignorePatterns: [
    ...globalIgnores,
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ],
});
