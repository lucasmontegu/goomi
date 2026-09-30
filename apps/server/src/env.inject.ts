// The Vercel function ships without the varlock CLI and .env.schema, so the build resolves the env
// once (see tsdown.config.ts) and varlock/auto-load reuses that blob instead of spawning the CLI.
// Must be imported before varlock/auto-load.
declare const __GOOMI_VARLOCK_ENV__: string | undefined;

if (typeof __GOOMI_VARLOCK_ENV__ === "string" && !process.env.__VARLOCK_ENV) {
  process.env.__VARLOCK_ENV = __GOOMI_VARLOCK_ENV__;
  process.env._VARLOCK_USE_INJECTED_ENV = "1";
}
