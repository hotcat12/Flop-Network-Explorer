# External deployment notes

## Vercel

Source: https://vercel.com/docs/frameworks/backend/express (Express on Vercel, updated 2026-08-10)

Vercel can deploy an Express application as a single Vercel Function with zero configuration when the app is exposed from a supported entrypoint and exports the Express app or uses a listener. Static assets should be served from the `public/**` directory; `express.static()` is not used for Vercel static asset serving. Express on Vercel inherits Vercel Function limitations and needs robust error handling.

Source: https://vercel.com/docs/cron-jobs (Cron Jobs, updated 2026-08-11)

Vercel Cron makes an HTTP GET request to a production path configured in `vercel.json`. Cron expressions use UTC and five fields. The job is suitable for invoking a serverless refresh endpoint, but the endpoint must be implemented in the Vercel-compatible function layout and protected with a secret/header check if it mutates data.

## Render

Source: https://render.com/docs/deploy-node-express-app

Render Web Service deployment accepts a Git-connected repository plus Node build and start commands. Render redeploys automatically on pushes to the connected branch.

Source: https://render.com/docs/free

Render Free Web Services can run Node apps but spin down after 15 minutes without inbound traffic and take about a minute to wake. The filesystem is ephemeral, so persistent data must live in a database. Free Render Postgres is limited to 1 GB, expires after 30 days, and has no backups. Free services are intended for testing/hobby use rather than production.

## Project-specific implication

FLOP/SCAN is a full-stack React + Express + tRPC + MySQL/TiDB project with scheduled Technocore refresh and a Manus Heartbeat callback. A plain static Vercel deployment is insufficient. External hosting requires either adapting the Express server to a Vercel Function entrypoint and providing an external database, or deploying the existing Node server as a Render Web Service with an external/managed database. The current Manus-hosted version already has the compatible server runtime and Heartbeat integration.

## Repository-specific audit

The repository currently uses these scripts:

- `pnpm dev`: `NODE_ENV=development tsx watch server/_core/index.ts`
- `pnpm build`: `vite build` followed by esbuild bundling `server/_core/index.ts` to `dist/index.js`
- `pnpm start`: `NODE_ENV=production node dist/index.js`
- `pnpm check`: `tsc --noEmit`
- `pnpm test`: `vitest run`
- `pnpm db:push`: generates and applies Drizzle migrations; review SQL before applying in any external environment.

The production entrypoint is `server/_core/index.ts`. It creates an HTTP server around Express, mounts `/api/trpc`, mounts `/api/scheduled/refreshTechnocore`, serves the Vite-built static output in production, and listens on the platform-provided `PORT`. This is a long-running Node/Express shape and is a natural fit for a Render Web Service. Vercel requires adapting or exposing the Express app through a supported Function entrypoint; a static-site-only import will not provide the API.

## External environment variables

Configure secrets in the hosting provider's project/service environment settings, never in GitHub or a committed `.env` file. The full-stack runtime reads `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY`. The frontend may also use `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`, `VITE_APP_TITLE`, and `VITE_APP_LOGO`.

For an externally hosted public explorer, `DATABASE_URL` and `JWT_SECRET` are required for the persistent cache/session layer. OAuth variables are required only if Manus OAuth login is retained; otherwise the authentication-dependent features must be removed or replaced with an external identity provider. The Forge API variables are Manus-specific integrations and should not be copied as arbitrary placeholders; either provide valid compatible credentials or disable features that depend on them. Any variable prefixed with `VITE_` is exposed to the browser bundle, so it must not contain a private secret.

## External database runbook

Use a MySQL/TiDB-compatible managed database because the schema imports `drizzle-orm/mysql2`. Provision the database, create a restricted application user, enable TLS/SSL if the provider requires it, and set the provider's connection string as `DATABASE_URL` in the service environment. From a controlled local or CI environment, run `pnpm install --frozen-lockfile`, generate/review migrations with `pnpm drizzle-kit generate`, and apply the reviewed SQL with `pnpm drizzle-kit migrate` against the external database. Do not run destructive schema commands automatically on every deployment. Verify the `users`, `rooms`, `agents`, and `networkSnapshots` tables before starting the public service.

If a provider offers only PostgreSQL, it is not drop-in compatible with this repository; the Drizzle schema and driver must first be migrated from MySQL to PostgreSQL and re-tested. Do not use a free database plan for important production history without checking its expiry, backup, connection, and sleep policies.

## GitHub-to-host configuration

For Render Web Service, connect the repository, set the build command to `pnpm install --frozen-lockfile && pnpm build`, set the start command to `pnpm start`, select Node, add the environment variables above, and configure the service's health check if desired. Render will redeploy from the linked branch. The service must remain a Web Service, not a Static Site, because the project has Express/tRPC API routes and scheduled refresh handling.

For Vercel, connect the repository and ensure the project is not treated as a static-only Vite site. Vercel can deploy Express as a Function, but this repository's current combined `server/_core/index.ts` starts a listener and also handles Vite/static serving. A Vercel adapter/entrypoint and routing configuration must be tested before using it in production. Configure the required environment variables in Vercel Project Settings, use Vercel's production build output, and add a `vercel.json` cron entry only after the refresh endpoint is exposed as a Vercel-compatible Function. Vercel Cron invokes an HTTP GET in UTC; the endpoint should validate a secret or provider header before mutating the cache.

## Scheduler alternatives

The current `/api/scheduled/refreshTechnocore` route is wired for the managed Heartbeat flow. On Vercel, use Vercel Cron plus a protected GET-compatible function. On Render Free, do not assume an always-running in-process timer: free services sleep and have no one-off job support. Use an external uptime/cron service that calls a protected refresh endpoint, or accept refresh-on-request with cached snapshots. Never expose an unauthenticated mutation endpoint.
