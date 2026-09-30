import { execFileSync } from "node:child_process";

import { defineConfig } from "tsdown";

/**
 * On Vercel, resolve and validate the env at build time (a bad env fails the build, not the first
 * request). The function has no varlock CLI or .env.schema to resolve it at runtime.
 */
function vercelEnvBlob(): Record<string, string> {
  if (!process.env.VERCEL) return {};
  const blob = execFileSync("bun", ["x", "varlock", "load", "--format", "json-full", "--compact"], {
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
  return { __GOOMI_VARLOCK_ENV__: JSON.stringify(blob) };
}

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  define: vercelEnvBlob(),
  deps: {
    // Bundle every dependency: Vercel traces package files with the "default" export condition,
    // but Bun resolves "node" first (e.g. @better-auth/telemetry → dist/node.mjs), so a function
    // that loads packages from node_modules crashes on start with a ResolveMessage.
    alwaysBundle: [/.*/],
  },
});
