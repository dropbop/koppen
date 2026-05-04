# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Multi-agent coordination

This repo is sometimes worked on by more than one AI agent (Claude Code and Codex) at the same time. **Each active AI session must have its own worktree and task branch. Never reuse another agent's worktree, even temporarily.**

Recommended setup from the main repo:

```bash
git fetch origin
git worktree add ../koppen-claude-<topic> -b claude/<topic> origin/main
git worktree add ../koppen-codex-<topic> -b codex/<topic> origin/main
```

Start each agent from its own worktree directory. Keep the primary checkout for human use.

Rules for any agent operating here:

1. **Verify branch and tree before any state-changing git action.** Run `git branch --show-current` and `git status -sb` before any of `commit`, `push`, `switch`/`checkout`, `branch`, `merge`, `rebase`, `reset`, or `clean`. Do not assume the branch you last set is still current — another agent may have moved it.
2. **Use separate branch prefixes.** Claude Code uses `claude/<short-topic>`; Codex uses `codex/<short-topic>`.
3. **Never let two agents work on the same branch at once.**
4. **Never commit directly to `main`.**
5. **Stop and surface to the user if the working tree contains files or edits you did not make.** Do not stage, commit, or revert blindly — the unexpected changes likely belong to the other agent's in-progress work.
6. **Do not run destructive cleanup commands unless the user explicitly asks.** That includes `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .`, force-deleting another agent's branch, and similar blunt instruments.
7. **Push new branches with upstream tracking.** Use `git push -u origin HEAD` for the first push of a branch.
8. **Only push, open PRs, mark PRs ready, or merge when the user explicitly asks.**

Standard task lifecycle:

1. Start from an up-to-date `main`: `git fetch origin`, switch to `main`, then fast-forward with `git pull --ff-only`.
2. Create a fresh task branch from `main` using the agent prefix, for example `codex/<topic>` or `claude/<topic>`.
3. Do only the scoped task work on that branch.
4. When the user asks, push the branch with upstream tracking and open a draft PR.
5. Iterate on review feedback on the same task branch until the PR is complete.
6. After the PR is merged, switch back to `main`, fetch/pull, confirm the merged branch has no remaining diff from `main`, then delete the completed local branch and, if still present, the completed remote branch.
7. Start the next task from a new branch off the updated `main`; do not reuse a merged task branch.

Cross-agent review workflow:

- Expect a build/review cycle before merge. Run the relevant validation (`pnpm lint`, `pnpm build`, and manual checks when applicable) and record what was run in the PR.
- Use a different agent for review than the authoring agent. Codex should review Claude PRs, and Claude should review Codex PRs.
- Do not have Claude review a Claude-authored PR, and do not have Codex review a Codex-authored PR. The point is a genuinely different set of eyes.
- The authoring agent addresses review feedback on its task branch unless the user explicitly asks another agent to take over implementation.

This multi-agent coordination guidance is duplicated in `CLAUDE.md` and `AGENTS.md`. Keep both copies in sync when changing it.

## Commands

- `pnpm dev` — Vite dev server, host 0.0.0.0.
- `pnpm build` — `tsc` typecheck then `vite build`. Used by CI.
- `pnpm preview` — serve the production build.
- `pnpm lint` — ESLint over the repo.
- `pnpm format` — Prettier write.
- `pnpm prepare-data` — runs `inventory-data`, `prepare-cogs`, `build-zones` in order. Requires GDAL (`gdalinfo`, `gdal_translate`) and a populated `koppen_geiger_tif/` archive locally. Do not run unless the user has the raw archive — `public/data/` already ships generated outputs.
- `BASE_PATH=/your-repo-name/ pnpm build` — when deploying to a GitHub Pages path other than `/koppen/`.

There is no test runner or `pnpm test` script. Validate changes with `pnpm lint`, `pnpm build`, then manual smoke-test in `pnpm dev` (period/scenario switching, opacity, popups, basemap toggle, antimeridian wrap).

## Architecture

Static Vite + TypeScript app with no backend. Renders Köppen-Geiger climate rasters via OpenLayers as Cloud Optimized GeoTIFFs (COGs).

**Data flow at runtime:** `loadAppData()` fetches `public/data/manifest.json` (period list + default) and `public/data/zones.json` (climate class metadata: value, code, RGB, names). Asset URLs are resolved through `resolveAssetUrl` so `BASE_URL` (set by Vite's `base`) is honored on GitHub Pages.

**State:** A single observable store in `src/state.ts` (`getState` / `setState` / `subscribe`). Every UI module subscribes; `setState` re-fires all subscribers synchronously. `src/main.ts` wires a subscriber that persists relevant fields to localStorage via `src/preferences.ts` (key `koppen-geiger-preferences`). Preferences are validated against the manifest/zones on load and silently dropped if invalid.

**Map module (`src/map/`):** `mountMap` builds a `WebGLTileLayer` from the period's COG. The climate layer's color is a `match` expression on band 1 (the climate class integer) → RGBA, rebuilt by `setClimateLayerStyle` whenever `visibleZones` changes (zeros-out hidden classes). Switching period creates a fresh `GeoTIFF` source and toggles `loading`; `whenSourceReady` resolves on `Source.getState() === 'ready'`. `singleclick` reads the underlying band value via `readClickedZone`, which also runs longitude through `normalizeLongitude` so popups stay pinned to the canonical world after antimeridian wraps (load-bearing — see commit `08b0048`). Place names come from `src/data/reverse-geocode.ts`, which serializes requests through an in-memory cache and a 1.1s-gap queue per Nominatim's usage policy; late results are only applied if the popup hasn't been replaced (lon/lat/classValue equality check).

**Adding a period or scenario:** add an entry to `scripts/periods.ts` and re-run `pnpm prepare-data`. That file is the single source of truth — both `prepare-cogs.ts` and `build-zones.ts` read it.

**Path alias:** `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

## Conventions

- Two-space indent, single quotes, semicolons, kebab-case filenames (e.g. `climate-layer.ts`).
- Strict TypeScript, ES modules, explicit imports. Keep modules focused: map behavior in `src/map/`, DOM/UI in `src/ui/`, data loading in `src/data/`.
- Any string interpolated into `innerHTML` must go through `escapeHtml` from `src/utils/html.ts`. Climate-class names, place names, and period labels are all routed through it — keep that invariant for new UI code.
- For icon-style indicators inside fixed-size boxes (close X, expand `+`/`–`, zoom `+`/`−`), draw shapes with pseudo-element rectangles or `linear-gradient` backgrounds rather than typing literal glyphs. Text glyphs sit at the font's math axis, not the geometric center of the em box, and visibly drift off-center even with `align-items: center`. See `.popup-close`, `.sidebar-citation summary::before`, and `.ol-zoom button` for the pattern.
- ESLint ignores `dist`, `node_modules`, `public/data` (generated), and `koppen_geiger_tif` (raw inputs).

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) lints, typechecks, builds, and deploys `dist/` to GitHub Pages on push to `main`. If generated COGs grow past ~50 MB total, switch to Git LFS or release assets rather than committing them.

## Open work

Known polish items, planned config changes (e.g. `BASE_PATH` default), partially-wired state, and v1.0 feature work all live in `TODO.md`. Read it before proposing refactors or "fixes" — many gaps are deliberate and already tracked.
