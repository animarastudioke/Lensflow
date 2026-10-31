// Next.js resolves "server-only" at build time; vitest has no such package,
// so unit tests that import server modules alias it to this empty module.
export {}
