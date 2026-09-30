import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  // The bundle ships without node_modules, so Bun would try to auto-install these optional
  // packages on first use and crash on Vercel's read-only filesystem.
  alias: Object.fromEntries(
    ["@opentelemetry/api", "bufferutil", "utf-8-validate"].map((name) => [
      name,
      fileURLToPath(new URL("./src/stubs/missing-optional-dep.js", import.meta.url)),
    ]),
  ),
  deps: {
    // Bundle every dependency: Vercel traces package files with the "default" export condition,
    // but Bun resolves "node" first (e.g. @better-auth/telemetry → dist/node.mjs), so a function
    // that loads packages from node_modules crashes on start with a ResolveMessage.
    alwaysBundle: [/.*/],
  },
});
