export default {
  "apps/web/**/*.{js,mjs,cjs,ts,tsx}": [
    "prettier --write",
    "pnpm --filter @traffic-twin/web exec eslint --fix",
    "pnpm --filter @traffic-twin/web exec vitest related --run --passWithNoTests",
  ],
  "apps/server/**/*.{js,mjs,cjs,ts}": [
    "prettier --write",
    "pnpm --filter @traffic-twin/server exec eslint --fix",
    "pnpm --filter @traffic-twin/server exec vitest related --run --passWithNoTests",
  ],
  "packages/contracts/**/*.{js,mjs,cjs,ts}": [
    "prettier --write",
    "pnpm --filter @traffic-twin/contracts exec eslint --fix",
    "pnpm --filter @traffic-twin/contracts exec vitest related --run --passWithNoTests",
  ],
  "**/*.{css,json,md,yaml,yml}": "prettier --write",
};
