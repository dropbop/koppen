# Repository Guidelines

## Multi-Agent Coordination

This repo is sometimes worked on by more than one AI agent (Claude Code and Codex) at the same time. **Worktree separation is required when two agents are making commits at the same time.** Each committing agent must use its own worktree and task branch, and must never reuse another agent's worktree, even temporarily. For sequential tasks, the implementing agent may use the primary checkout and switch branches through the lifecycle below. Review-only sessions that inspect GitHub through `gh pr view`, `gh pr diff`, or the GitHub API do not need a local worktree.

Recommended setup for concurrent implementation from the main repo:

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
6. **Do not run destructive cleanup commands unless the user explicitly asks.** That includes `git reset --hard`, `git clean -fd`, `git checkout -- .`, `git restore .`, force-deleting another agent's branch, and similar blunt instruments. Exception: after a PR is merged, deleting your own merged task branch locally and deleting its matching remote branch is part of the lifecycle below and does not require a second ask.
7. **Push new branches with upstream tracking.** Use `git push -u origin HEAD` for the first push of a branch.
8. **Only push commits, open PRs, mark PRs ready, or merge when the user explicitly asks.** Post-merge deletion of your own merged remote task branch is covered by lifecycle cleanup.

Standard task lifecycle:

1. In the checkout or worktree that will own the next task, start from an up-to-date `main`: `git fetch origin`, switch to `main`, then fast-forward with `git pull --ff-only`.
2. Create a fresh task branch from `main` using the agent prefix, for example `codex/<topic>` or `claude/<topic>`.
3. Do only the scoped task work on that branch.
4. When the user asks, push the branch with upstream tracking and open a draft PR.
5. Iterate on review feedback on the same task branch until the PR is complete.
6. After the PR is merged, switch back to `main`, fetch/pull, confirm the merged branch has no remaining diff from `main`, then delete the completed local branch and, if still present, the completed remote branch.
7. Start the next task from a new branch off the updated `main`; do not reuse a merged task branch.

Cross-agent review workflow:

- Expect a build/review cycle before merge. Run the relevant validation (`pnpm lint`, `pnpm build`, and manual checks when applicable) and record what was run in the PR.
- Use a different agent family for review than the authoring agent. Codex should review Claude PRs, and Claude should review Codex PRs.
- Do not have Claude review a Claude-authored PR, and do not have Codex review a Codex-authored PR, including subagents invoked by the same agent family. A Claude-spawned reviewer does not count as cross-agent review for Claude-authored work, and the same rule applies to Codex-authored work. The point is a genuinely different set of eyes.
- The authoring agent addresses review feedback on its task branch unless the user explicitly asks another agent to take over implementation.

This multi-agent coordination guidance is duplicated in `CLAUDE.md` and `AGENTS.md`. Keep both copies in sync when changing it.

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
