## 1. Rewrite the connection helper

- [x] 1.1 In `src/server/lib/db-client.js`, add a module-scoped `Map` cache for pools keyed by connection string
- [x] 1.2 Add a `resolveConnectionString(c)` helper that returns `c.env.DB.connectionString` (or `c.env.DB` if it is a string) for Hyperdrive, else `c.env.DATABASE_URL`, else `null`
- [x] 1.3 Rewrite `getDbClient(c)` to resolve the connection string, throw a clear error when none is found, look up the cache, and create+store a `pg.Pool` only on a cache miss
- [x] 1.4 Keep the `async` signature and the lazy `await import("pg")`; ensure the returned object exposes `.query(sql, params)` returning `{ rows }`
- [x] 1.5 Add code comments documenting the expected Hyperdrive binding shape and the resolution order

## 2. Tests

- [x] 2.1 Create `src/server/lib/db-client.spec.js`
- [x] 2.2 Test: calling `getDbClient` twice with the same connection source constructs the pool at most once (reuse)
- [x] 2.3 Test: the Hyperdrive path (`c.env.DB.connectionString`) builds a client from the connection string
- [x] 2.4 Test: the `DATABASE_URL` fallback path builds a client when `c.env.DB` is absent
- [x] 2.5 Test: a context with neither source throws an error whose message mentions Hyperdrive binding or `DATABASE_URL`
- [x] 2.6 Mock `pg` (e.g. `vi.mock("pg")`) so tests assert pool construction count without a real database

## 3. Verify consumers and contract

- [x] 3.1 Confirm `src/server/index.js`, `invitation/routes.js`, and `wishes/routes.js` need no edits (signature + `{ rows }` shape preserved)
- [x] 3.2 Run `bun run test` and confirm existing invitation/wishes/e2e suites still pass unchanged

## 4. Gate and manual check

- [x] 4.1 Run `bun run lint` and `bun run format:check`
- [x] 4.2 Run `bun run test:coverage` to satisfy the pre-push coverage gate
- [ ] 4.3 Manually verify `bun run dev:server` connects locally via `DATABASE_URL` (BLOCKED: no `DATABASE_URL`/live Postgres in this environment; run manually where a DB is available)
