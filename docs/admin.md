# ACT admin and self-hosted operations

The Node service serves the three-page English/Thai portfolio, `/admin`, `/api/v1`, and `/healthz` from one origin. SQLite stores content and expiring sessions at `/data/act.sqlite`. Use one running app instance. The source is ready for local testing; no production resource, registry credentials, domain, or deployment has been configured.

## Start locally

Use the pinned pnpm version and Node 24 for the production target. Install dependencies and build before running the compiled utilities:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm admin:hash
```

The hash command asks for at least 12 characters without echoing your password. It refuses password arguments and piped input. Copy the resulting scrypt hash into a local ignored `.env` file or Coolify's runtime secrets. Don't put a password in shell history. Create a session secret locally with `node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url')+'\n')"`; keep its output private.

For local Docker testing, copy `.env.example` to `.env`, fill `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`, and leave `PUBLIC_ORIGIN` empty. Stop any other server using port 3000 first.

```sh
docker compose config --quiet
docker compose up --build -d
curl --fail http://127.0.0.1:3000/healthz
```

Open `http://127.0.0.1:3000/admin` on your computer. Compose overrides `NODE_ENV=development` solely for loopback HTTP so local cookies work. The image itself defaults to `production`, where admin cookies are Secure and require HTTPS. Never deploy this local Compose configuration or expose its port to the LAN. Run `docker compose down` to stop it without deleting volumes. Don't use `down --volumes` unless you intend to erase the local data and backups.

You can also test the compiled app without Docker. Set runtime variables in your shell or use `node --env-file=.env dist-server/server/index.js` after changing `DATABASE_PATH` in your ignored local file to `./data/act.sqlite`. Leave `NODE_ENV` unset for local HTTP. `pnpm start` reads already-exported environment variables; it doesn't load `.env` automatically. Static `pnpm dev` has no backend and clearly reports that admin editing is unavailable.

## Edit factual content

Sign in at `/admin`. The sections cover bilingual site copy, the upcoming event, projects, and competitions. Both required translations must be present. The editor keeps founder history before ACT separate from ACT competition records. Don't publish ages, birthdays, school details, personal contacts, or private Discord content. Names and evidence still need the members' approval.

First boot seeds only the reviewed source defaults. Projects and both competition groups start empty. BSD The White Garden, Saraburi stays planned and not registered, with its existing dates and official link. Updating or restarting the app doesn't reseed over saved edits.

A save becomes visible on the next public request without rebuilding. If another editor session changes content, the server returns a stale-revision conflict and disables Save while keeping your draft visible. Choose **Reload latest content (discard drafts)** and confirm to load the current server version; this intentionally discards your draft. Reapply any wanted edits against the latest values before saving. Copy draft values you may need for a manual merge before reloading. Pagination stays disabled while a record draft is open. Signing out revokes the current session. Default sessions expire after eight hours.

## Coolify Dockerfile application

Create a source-based **Dockerfile application**, not a Docker Compose resource. Use this repository and root `Dockerfile`. The build stage installs the frozen pnpm lockfile and compiles SQLite's native module using build-only tools. The runtime runs as Node's `node` user, UID/GID 1000, and listens on `0.0.0.0:3000`. Set the application port to 3000 and health path to `/healthz`.

Choose your deployment server separately. Configure the builder's server role as **Builds only**, provide a full Docker image repository such as `ghcr.io/<your-owner>/act-team-portfolio`, and enable **Use a Build Server?** on the application. Use matching CPU architectures for build and deployment. Coolify's current docs say the build-server option isn't available for Compose applications. Disable the team's build-server fallback if builds must never run on the deployment server. [1]

Log into the registry through Coolify's server Registries settings for the configured SSH user. The builder needs push permission. The deployment server needs pull permission for a private registry. GHCR is the suggested registry, but don't assume a public source repository makes its image public. Keep registry tokens out of this repository, Dockerfile, build arguments, and frontend variables. [1]

Set `NODE_ENV=production` at runtime. Supply private `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`. Set `DATABASE_PATH=/data/act.sqlite`, `PORT=3000`, and optionally `SESSION_TTL_SECONDS` between 900 and 86400. Set `TRUST_PROXY_HOPS` to your verified proxy-hop count, not an arbitrary permissive value. Set `PUBLIC_ORIGIN` to the real HTTPS origin with no path, query, or fragment. The app rejects absent or malformed credentials before startup. Configure HTTPS in your own Coolify environment before using production login; this guide doesn't configure a domain or TLS.

Mount persistent storage at the container destination `/data`, and a separate backup mount at `/backups`. Ensure UID/GID 1000 can write both mounts. Fresh named volumes inherit the image directory ownership; bind mounts and existing volumes need explicit host-side ownership checks. Storage is local to the deployment server and is not a backup. Don't attach the live writable `/data` directory to multiple app instances. [2]

Use stop-first or a maintenance-window deployment. Avoid rolling overlaps with two app instances sharing this SQLite volume. Keep a verified image digest and an off-host backup before upgrades. Don't configure this app as a Manus-managed backend: server/database capabilities and Auto Publish remain off.

## Make a consistent backup

A filesystem copy of a live SQLite file can miss WAL transactions. The supplied utility uses SQLite's online backup mechanism, reserves a new destination, writes with mode `0600`, and verifies its integrity. It refuses overwrite and destinations under the source database directory or `/data`, including symlink aliases. Create the backup parent directory before running it.

On a host with the source build and runtime environment:

```sh
pnpm db:backup -- /backups/act-YYYY-MM-DD.sqlite
```

Inside a built container, call Node directly because the slim runtime doesn't include pnpm:

```sh
docker compose exec app node dist-server/server/scripts/backup-database.js /backups/act-YYYY-MM-DD.sqlite
```

In Coolify, run the same Node command in the application's terminal. Copy the completed file off-host to access-controlled storage. For local Compose, `docker compose cp app:/backups/act-YYYY-MM-DD.sqlite ./backups/` works after creating your ignored local `backups/` directory. Keep backup files private because they include session hashes and public-content drafts. Separate volumes on the same server don't protect against host loss.

Set up backup scheduling in your own infrastructure when you deploy. No schedule or unattended service has been installed by this implementation.

## Restore safely

Stop the application first. Keep the current data directory, including `act.sqlite`, `act.sqlite-wal`, and `act.sqlite-shm`, as a private rollback copy. Verify the backup's `PRAGMA integrity_check` returns `ok` and `PRAGMA foreign_key_check` returns no rows. Don't copy files into `/data` while the app is running.

For local Compose, this example restores a selected backup after you replace its filename. It removes the old live files, so keep the rollback copy first:

```sh
docker compose stop app
docker compose run --rm --no-deps --entrypoint node app -e '
const fs = require("node:fs");
const Database = require("better-sqlite3");
const source = "/backups/act-YYYY-MM-DD.sqlite";
const backup = new Database(source, { readonly: true, fileMustExist: true });
if (backup.pragma("integrity_check", { simple: true }) !== "ok" || backup.pragma("foreign_key_check").length) throw new Error("Invalid backup");
backup.close();
for (const suffix of ["", "-wal", "-shm"]) fs.rmSync("/data/act.sqlite" + suffix, { force: true });
fs.copyFileSync(source, "/data/act.sqlite");
fs.chmodSync("/data/act.sqlite", 0o600);
const restored = new Database("/data/act.sqlite");
restored.exec("DELETE FROM admin_sessions");
restored.close();
'
docker compose start app
curl --fail http://127.0.0.1:3000/healthz
```

Use the equivalent stop, offline verification, restore, ownership check, and restart steps on your own Coolify deployment server. Clearing sessions prevents an older backup from reviving previously revoked logins. Verify saved English/Thai content, both attribution groups, login, and `/healthz` after restoring. Test the procedure on disposable data before relying on it.

For rollback, run the previous image against a schema it supports. If a future migration changes compatibility, restore its matching pre-upgrade backup while stopped; this intentionally discards newer edits. Don't assume downgrading an image reverses database migrations.

## Verification and known gap

```sh
pnpm exec vitest run
pnpm exec vitest run --config vitest.server.config.ts --coverage
pnpm build
pnpm test:static
pnpm test:e2e
pnpm exec redocly lint docs/openapi.yaml
node scripts/container-smoke.mjs
```

The smoke script builds a disposable local image unless you supply an image tag. It creates only its own temporary volumes and a loopback container, then verifies health, login, live saving, restart persistence, and backup restore. It removes only those disposable resources afterward. It uses fake credentials and local HTTP; production Secure-cookie behavior is covered separately by API tests.

Docker CLI/Engine isn't available in the implementation Sandbox. Image building, real `docker compose config`, and container smoke testing have **not** run here. Parsed Compose, ignore-policy, native runtime, password-entry, and database tests don't replace that final check. Run the smoke test on a Docker-enabled machine with the same CPU architecture before deployment.

## References

[1]: https://coolify.io/docs/core/infrastructure/servers/build-servers "Coolify Build servers"
[2]: https://coolify.io/docs/applications/configuration/persistent-storage "Coolify Configure persistent storage"
