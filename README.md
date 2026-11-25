# Avoonger Competition Team (ACT)

ACT’s English/Thai portfolio introduces the team and gives its competitions and projects separate homes. It uses selective coral glass surfaces, deep-teal text, local fonts, keyboard navigation, reduced-motion and reduced-transparency fallbacks. There’s no backend, application form, or member database.

The exact main brand color is `#F35857`. The [coral palette](docs/color-palette.md) documents its 11-shade scale, semantic CSS tokens, and calculated contrast. Small white-text actions use a darker coral rather than the exact brand so their text meets AA contrast.

## Run locally

Use Node.js 22.22.2+ within 22.x, 24.15+ within 24.x, or 26+. These ranges cover the locked build and test tools. Use the pinned pnpm version.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open the local server on port 3000. The Manus project runs this command through its managed development process; don’t start a second server there.

```sh
pnpm test -- --run
pnpm build
pnpm test:static
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests expect the development server to already run on port 3000. `pnpm build` checks TypeScript, bundles the client, and generates meaningful English HTML for all three routes. Deploy `dist/` to a static host that supports directory index pages and the client’s missing-route fallback. Language switching and navigation remain interactive. No production deployment has been requested or made.

## Structure

`src/pages/` contains Home, Competitions, and Projects. `src/components/` owns shared navigation, safe Discord onboarding links, and record cards. `src/i18n/` contains typed English/Thai copy and the persisted `act-locale` preference. `src/data/` holds public, reviewed portfolio data. `src/types/` defines the record contracts. `src/styles/` holds tokens, layouts, and glass fallbacks. `src/prerender.tsx` and `scripts/prerender.mjs` generate static HTML using the actual React pages. `tests/` contains unit, static-output, and browser checks.

## Discord

Set only the public invite in `.env.local` or the deployment environment:

```dotenv
VITE_DISCORD_INVITE_URL=https://discord.gg/YOUR_ACT_INVITE
```

Only HTTPS `discord.gg/<invite>` and `discord.com/invite/<invite>` URLs become links. An empty or invalid value displays the translated “invite coming soon” message. `VITE_` values enter the browser bundle; never put tokens, passwords, or private channel details there. Rebuild after changing the invite.

The site can’t enforce Discord roles. Configure the actual server invite, welcome area, and permissions so newcomers can’t see private channels before approval. Confirm this with a newcomer account before launch.

## Add factual content

Keep production arrays empty until ACT supplies real records. Test fixtures are not portfolio content.

- `src/data/competitions.ts`: put founder experience only in `founderHistory` with `recordType: 'founder-pre-act'`. Put events entered as ACT only in `actHistory` with `recordType: 'act'`. Provide the event, year, approved participants, stage/result, contribution, and approved public evidence when available. A founder’s earlier result is not ACT’s result.
- `src/data/projects.ts`: add an actual project with `planned`, `in-progress`, or `completed` status. The current schema supports both language versions, the problem, summary, dates, business thinking, individual contributions, and supplied public links. Dedicated AI/sustainability focus fields and accessible project media still need a schema/card extension before ACT supplies them.
- `src/data/upcomingCompetition.ts`: BSD The White Garden, Saraburi is a planned target, not a submitted or accepted entry. Update its status only after ACT confirms a change. Keep the displayed English/Thai labels and verified dates aligned in `src/i18n/messages.ts`.

Use the exported TypeScript types rather than adding untyped objects. Supply HTTPS evidence/project URLs and useful media alternatives. Don’t add names without member agreement, or publish ages, birthdays, school details, personal contacts, or private Discord content. Run all checks after updates.

## Before launch

ACT still needs to provide approved display names, founders’ M.1 competition details and evidence, a real Discord invite, and English/Thai copy approval. Recheck ACT’s registration status and the organizer’s schedule at [futurecenter.ai/hackathon](https://futurecenter.ai/hackathon#talk). The current target schedule is January 16–17, 2027 in Saraburi, applications close January 10, and the final is January 23–24 at Paradise Park. These dates describe the event, not ACT’s qualification.

Production has no confirmed public origin yet. Canonical URLs and domain-based sharing addresses are intentionally omitted rather than guessed. Configure them from ACT’s real production domain before launching. Unknown client routes show a translated missing-page view; configure a real HTTP 404 on the chosen host rather than relying on an SPA’s 200 fallback for search indexing.

Only the sanitized source snapshot is intended for the public GitHub repository; private feature-development history is excluded. Website production publishing is separate and has not been performed.
