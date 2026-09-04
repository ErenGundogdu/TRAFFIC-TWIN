import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rootEnvPath = resolve(import.meta.dirname, "../../.env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  agentRules: false,
  reactStrictMode: true,
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
