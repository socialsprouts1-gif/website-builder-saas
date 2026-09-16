/**
 * Stands in for the `server-only` package.
 *
 * That package exists to fail a build if server code is imported into a client
 * bundle. There is no bundle here, so importing it would only throw — the guard
 * is about where code ends up, not about what it does.
 */
export {};
