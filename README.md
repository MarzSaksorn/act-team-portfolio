# Avoonger Competition Team (ACT)

ACT's English/Thai portfolio has separate Home, Competitions, and Projects pages, plus a private `/admin` editor. One Node.js service renders live SQLite content and serves the API and client assets. The static build still works without a backend. This isn't a member database or public registration system.

The design retains the coral glass surfaces, deep-teal text, local fonts, keyboard navigation, and reduced-motion/transparency fallbacks. The exact brand color is `#F35857`, with a decorative `#669BBC` touch. See the [palette](docs/color-palette.md) and [typography notes](docs/typography.md).

## Static development

Use the pinned `pnpm@11.25.0`. The Docker production target is Node 24. The existing locked tools also run on Node 22.22.2+ within 22.x, Node 24.15+ within 24.x, or Node 26+.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The Manus Preview runs this static development command on port 3000. Don't start another server on that port there. `/admin` explains that its backend is unavailable in static Preview; it doesn't pretend to save edits. Manus-managed server/database features and Auto Publish stay off.

## Run the full app

Read [admin and Coolify operations](docs/admin.md) for local setup, runtime secrets, storage permissions, backup/restore, and the external-builder handoff.

```sh
pnpm build
pnpm admin:hash
# Set private runtime environment variables first.
pnpm start
```

`pnpm start` runs `node dist-server/server/index.js` and reads already-exported variables. Local Compose is another test path: copy `.env.example` to `.env`, fill its private runtime values, and use `docker compose up --build`. It binds only `127.0.0.1:3000` and keeps `/data` and `/backups` in different named volumes. Its development-mode override supports local HTTP only; don't deploy the Compose file to production.

For Coolify, use one source-based Dockerfile application with its dedicated build server, registry push/pull access, and persistent mounts. The image runs as non-root, defaults to production, and requires HTTPS for admin cookies. Run one app instance. Production resources, credentials, domain, and deployment remain manual and haven't been configured.

## Verification

```sh
pnpm exec vitest run
pnpm exec vitest run --config vitest.server.config.ts --coverage
pnpm build
pnpm test:static
pnpm exec playwright install chromium
pnpm test:e2e
pnpm exec redocly lint docs/openapi.yaml
node scripts/container-smoke.mjs
```

Browser suites launch the compiled runtime on isolated port 3100 with fake credentials. Admin and public suites run sequentially with fresh databases so mutations can't leak into default-content checks. They don't reuse Preview. The build checks frontend and server TypeScript, creates client assets, compiles the runtime and utilities, and prerenders the static fallback.

Docker isn't available in the implementation Sandbox. The real image build, Compose validation, and container smoke test still need a Docker-enabled machine before deployment. The native tests don't prove the image starts.

## Content and privacy

Sign in at `/admin` to update bilingual site copy, the upcoming event, projects, and competition records. Required fields need English and Thai. Saves appear on the next public request without rebuilding. Stale revisions return a conflict while preserving your unsaved draft.

First boot seeds the reviewed source defaults only. Projects and founder/ACT competition groups stay empty until ACT supplies facts. Founder experience before ACT belongs only to founder history; it isn't ACT's result. BSD The White Garden, Saraburi remains planned and not registered, with the existing January 2027 schedule and official link. Recheck organizer dates and ACT's real registration status before launch.

Don't publish ages, birthdays, school details, personal contacts, or private Discord information. Get agreement for member names and approved evidence. A volume isn't a backup. Use the consistent online backup utility, keep copies off-host, and test restore.

## Discord

The optional public `VITE_DISCORD_INVITE_URL` remains a build-time setting for static development. Set it in ignored `.env.local` only after ACT supplies a reviewed welcome-area invite. Only HTTPS `discord.gg/<invite>` and `discord.com/invite/<invite>` values become links. Invalid or empty values show the translated invite-coming-soon state.

Docker excludes all `.env` files, and runtime `VITE_` variables won't change the already-built browser bundle. The current image therefore keeps the safe invite-coming-soon fallback. Don't put tokens, passwords, or private channels in frontend settings. Configure Discord roles separately and check with an unapproved newcomer account.

## Structure

`src/pages/`, `src/components/`, `src/i18n/`, and `src/styles/` own the public interface. `src/admin/` contains the bilingual editor and same-origin API client. `src/types/` holds Zod contracts; `src/data/` holds safe seed/static defaults. `server/db/` handles migrations and transactional storage, `server/routes/` the versioned API, `server/auth/` sessions and scrypt, and `server/runtime.ts` startup/shutdown. `server/scripts/` contains operational utilities. Tests cover UI, SQLite, API, rendering, native runtime, static output, and browsers. The [OpenAPI contract](docs/openapi.yaml) describes `/api/v1`.

ACT still needs approved public names and history/evidence, a real invite, bilingual copy approval, and a real production origin before launch. Only reviewed source belongs in the public GitHub repository. Source handoff and website deployment are separate; production remains unpublished.
