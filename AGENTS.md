Build/lint/test:
- Dev: `npm run dev` (runs scripts/dev.ts orchestration).
- UI dev server: `npm run dev:ui` (React Router dev on :3000).
- Build: `npm run build`; Start: `npm run start`.
- Typecheck: `npm run typecheck` (react-router typegen + tsc).
- Lint/format: `npx biome check .` / `npx biome format .`.
- Tests: no test runner configured; no `tests/` dir. For a single test, add a runner (or use `node --test path` if applicable).

Architecture:
- React Router v7 app; routes live in `app/routes` (file-based routing).
- UI components in `app/components`, utilities in `app/lib`, emails in `app/components/email`.
- Database: PostgreSQL + Drizzle ORM schemas in `app/db/schema`, migrations in `database/migrations`.
- Sync layer: Zero; config + generated schema in `zero/` and `zero/schema.ts`.
- Scripts/live dev orchestration in `scripts/`; PWA service worker in `app/service-worker.ts` (Vite PWA).

Code style:
- Biome formatter/linter; tabs for indent and double quotes.
- Organize imports on save; keep imports sorted and grouped.
- Tailwind classes should be sorted (Biome `useSortedClasses`, with `clsx`/`cva`).
- TypeScript strict; path alias `~/*` maps to `app/*`.
- Prefer small, typed utilities and explicit error messages (see `app/lib/utils/must`).

Repo rules:
- No Cursor/Claude/Windsurf/Cline/Goose/Copilot instruction files found.
