# Agent Notes

This file is intentionally short. Use `README.md` for project setup and architecture, and use `TODO.md` for the v1.0 backlog. Treat TODO items as hypotheses to validate, not automatic instructions.

## Safety

- Before state-changing git actions, run `git branch --show-current` and `git status -sb`.
- Ask before committing, pushing, opening PRs, merging, deleting branches, or deleting files.
- Do not run destructive cleanup commands unless the user explicitly requests them.
- Do not stage local tool files, generated artifacts, or unrelated working-tree changes.

## Commands

- `pnpm install`: install dependencies using the pinned pnpm version.
- `pnpm dev`: start the Vite development server.
- `pnpm lint`: run ESLint.
- `pnpm build`: typecheck and build the static site.
- `pnpm preview`: serve the production build locally.
- `pnpm format`: format files with Prettier.
- `pnpm prepare-data`: regenerate inventory, COGs, zones, and manifest. Requires GDAL tools and local raw TIFFs; not needed for normal UI or docs work.

The default build targets `https://koppenmap.com/`. Use `BASE_PATH=/your-repo-name/ pnpm build` only for a GitHub Pages project path.

## Project Shape

Runtime source lives in `src/`: `main.ts` bootstraps the app, `state.ts` holds shared UI/map state, `src/map/` contains OpenLayers map code, `src/ui/` contains DOM UI modules, and `src/data/` handles data loading and reverse geocoding.

Data tooling lives in `scripts/`. `scripts/periods.ts` is the source of truth for historical periods and scenarios. Generated web data is committed under `public/data/`; raw source TIFF archives belong in `koppen_geiger_tif/` and are not committed.

## Conventions

Use strict TypeScript modules, explicit imports, two-space indentation, single quotes, semicolons, and kebab-case filenames. Keep map behavior, UI behavior, and data access in focused modules.

For validation, run `pnpm lint` and use `pnpm build` when runtime or build-facing behavior changes. There is no dedicated `pnpm test` script yet.
