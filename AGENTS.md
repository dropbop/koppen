# Repository Guidelines

## Multi-Agent Coordination

This repo may be worked on by Claude Code and Codex at the same time. The safe default is **one agent per git worktree, one branch per task**. Do not run two agents in the same checkout or on the same branch unless the user explicitly asks for that.

Recommended setup from the main repo:

```bash
git fetch origin
git worktree add ../koppen-claude-<topic> -b claude/<topic> origin/main
git worktree add ../koppen-codex-<topic> -b codex/<topic> origin/main
```

Then start each agent from its own worktree directory. Keep the primary checkout for human use.

Rules for agents:

- Before any state-changing git action, run `git status -sb` and `git branch --show-current`.
- Use distinct branch prefixes: `claude/<topic>` for Claude Code and `codex/<topic>` for Codex.
- Never let two agents work on the same branch at once.
- Never commit directly to `main`.
- Do not stage, commit, revert, or “clean up” files you did not change. If unexpected edits appear, stop and report them.
- Push new branches with an upstream, e.g. `git push -u origin codex/<topic>`.
- Only push, open PRs, mark PRs ready, or merge when the user explicitly asks.

## Project Structure & Module Organization

This is a static Vite + TypeScript app for a Köppen-Geiger climate map. Runtime source lives in `src/`: `main.ts` bootstraps the app, `state.ts` holds shared UI/map state, `src/map/` contains OpenLayers map code, `src/ui/` contains DOM UI modules, and `src/data/` handles data loading and reverse geocoding. Global styles are in `src/styles.css`.

Data tooling lives in `scripts/`. `scripts/periods.ts` is the source of truth for historical periods and scenarios. Generated web data is committed under `public/data/`, including COG rasters in `public/data/cogs/`, `manifest.json`, and `zones.json`. Raw source TIFF archives belong in `koppen_geiger_tif/` and are not committed.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies using the pinned pnpm version.
- `pnpm dev`: start the Vite development server on all interfaces.
- `pnpm build`: run TypeScript checking, then build the static site.
- `pnpm preview`: serve the production build locally.
- `pnpm lint`: run ESLint over the repository.
- `pnpm format`: format files with Prettier.
- `pnpm prepare-data`: regenerate inventory, COGs, zones, and manifest. Requires GDAL tools and local raw TIFFs.

Use `BASE_PATH=/your-repo-name/ pnpm build` when building for a GitHub Pages path other than `/koppen/`.

## Coding Style & Naming Conventions

Use TypeScript modules and keep imports explicit. The project uses strict TypeScript, ES modules, and the `@/*` alias for `src/*`. Follow the existing style: two-space indentation, single quotes, semicolons, and kebab-case filenames such as `climate-layer.ts` or `basemap-toggle.ts`. Prefer focused modules for map behavior, UI behavior, and data access.

Run `pnpm format` before larger changes and `pnpm lint` before submitting. ESLint ignores generated data, `dist`, `node_modules`, and raw TIFF inputs.

## Testing Guidelines

There is currently no dedicated test runner or `pnpm test` script. For now, validate changes with `pnpm lint` and `pnpm build`, then manually check core flows in `pnpm dev`: map load, period/scenario switching, opacity changes, popups, basemap toggling, and antimeridian behavior. If adding tests, prefer colocated `*.test.ts` files and add a package script.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, for example `Fix climate layer antimeridian wrapping (#2)` and `Release v0.1 beta`. Keep commit subjects concise and action-oriented.

Pull requests should include a brief description, linked issue when applicable, screenshots or screen recordings for UI/map changes, and notes for any generated data changes. Include the validation commands you ran, especially `pnpm lint`, `pnpm build`, and any data preparation command.
