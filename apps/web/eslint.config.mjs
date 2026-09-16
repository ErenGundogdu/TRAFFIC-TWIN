import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message:
                "Feature iç dosyalarını doğrudan kullanmayın; feature public index.ts yüzeyinden import edin.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
  globalIgnores([".next/**", "dist/**", "coverage/**", "next-env.d.ts"]),
]);
