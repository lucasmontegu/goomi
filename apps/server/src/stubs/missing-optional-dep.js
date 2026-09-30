// Stand-in for optional dependencies that aren't installed. Their callers import them inside a
// try/catch, so throwing here reproduces "not installed" without letting Bun auto-install them
// at runtime (the Vercel filesystem is read-only, so that attempt kills the process).
throw new Error("Optional dependency is not installed.");
