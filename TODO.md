# TODO — v0.8 → v1.0

Overview: The MVP for this project is complete, but it needs polish before I'm willing to serve it on a custom domain. The following list of tasks should be addressed prior to shipping. 

## Intentional behavior (not bugs)

- **`sidebarOpen` is not persisted in preferences.** State resets to the default on every reload (open on desktop, collapsed bottom-sheet on mobile). Decision: the first-paint view should communicate "this is what the app does." Restoring a previously-collapsed sidebar would hide the controls from a returning visitor, and the assumption is most users don't visit often enough to care about preserving the collapsed state across sessions.

## P0 — Bugs and dead code

- [ ] **Remove unused `theme` field** from `AppState` (`src/state.ts`) and `preferences.ts`, OR implement dark mode. Currently it's persisted but never read.
- [ ] **Re-attach mobile scrollbar styling.** The desktop-collapsible-sidebar refactor moved `scrollbar-width: thin; scrollbar-color: …` and the `::-webkit-scrollbar` rules from `.sidebar` to `.sidebar-panel`. On mobile the scrollable region is `.sidebar-content` (in the `@media (max-width: 767px)` block), which now has no custom scrollbar styling. Re-attach those rules to `.sidebar-content` (or a shared selector that covers both).
- [ ] **Add `AbortController` to reverse-geocode** (`src/data/reverse-geocode.ts`). Rapid clicks queue up Nominatim requests that nobody needs; abort previous in-flight when a new click comes in.
- [ ] **Reserve vertical space in popup** for the place row to eliminate layout shift when async geocode lands. Either show a "Looking up location…" placeholder during the loading state or fix the row height.
- [ ] **Refactor sidebar zone-toggle handlers** to derive new state from `getState().visibleZones` instead of querying the DOM (`target.querySelectorAll('input[data-zone]:checked')`). Current approach is fragile to programmatic state changes mid-render.
- [ ] **Audit the `as Style` cast** in `src/map/climate-layer.ts`. Either tighten the type or add a comment explaining why it's bypassed.
- [ ] **Verify the `event.preventDefault()` call** in `src/ui/popup.ts` is actually needed given `stopEvent: true` on the Overlay. Remove if redundant.

## P0 — Build and CI

- [ ] **Switch `vite.config.ts` `base` default to `/`** for the custom-domain build, OR set `BASE_PATH=/` env in `deploy.yml`'s build step. Currently defaults to `/koppen/`, which will break asset URLs on a custom domain.
- [ ] **Drop `CNAME` into `public/`** (not repo root). Vite copies `public/` contents into the artifact verbatim.
- [ ] **Remove redundant `Typecheck` step from `deploy.yml`** — `pnpm build` already runs `tsc && vite build`, so typecheck happens twice. Drop one.
- [ ] **Add PR-level CI** — `deploy.yml` only triggers on push to main. Add `pull_request` trigger or split into `ci.yml` (lint + build on PRs) and `deploy.yml` (main only).
- [ ] **Tighten ESLint** — current config is `js.recommended + tseslint.recommended`. Add `@typescript-eslint/no-unused-vars` (or upgrade to `tseslint.configs.strict`) to catch dead code like the `theme` field automatically.
- [ ] **Pin OL more conservatively** — `^10.6.1` allows minor bumps; OL has shipped breaking changes to `WebGLTile` style API in minor versions. Consider `~10.6.1` (patch only).

## P0 — Features for v1.0

- [ ] **Pin/marker at click point.** Add a Vector layer with a Point feature, styled as a small dot or pin. Update geometry when `state.popup` changes, hide when null. ~30 lines, behaves correctly under pan/zoom.
- [ ] **Desktop-collapsible sidebar.** Remove `display: none` on `.sidebar-toggle` outside mobile. Define `.sidebar.is-collapsed` for desktop with `transform: translateX(-100%)` + transition. Add a small persistent tab/chevron to bring it back. Persist state in preferences.
- [ ] **Static SEO content block** in `index.html`. Add a `<noscript>` and visually-hidden `<section>` with 200–400 words of prose: what Köppen-Geiger is, what the app does, periods/scenarios available, attribution.
- [ ] **Improved meta tags.** Tighten `<meta name="description">` to 150–160 chars with target keywords. Add Twitter Card meta (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`). Add `<meta name="theme-color">`.
- [ ] **Verify og-image.png is 1200×630** and consider re-encoding to JPEG/WebP to drop from 153 KiB to ~50 KiB.
- [ ] **Add `robots.txt` and `sitemap.xml`** to `public/`.
- [ ] **Add `404.html`** to `public/` so direct hits to non-existent paths don't show GitHub's default.
- [ ] **Switch `vite.config.ts` `base` to `/`** for custom-domain build (covered in Build and CI section).
- [ ] **Add `CNAME` file** to `public/` (covered in Build and CI section).
- [ ] **Configure DNS** (A records to GitHub IPs or CNAME to `<user>.github.io`). Pick apex vs www as canonical, redirect the other.
- [ ] **Verify HTTPS provisioning** completes after DNS propagates (Let's Encrypt via GitHub).
- [ ] **Document raw data download** in README — link to the figshare DOI so contributors know where to get `koppen_geiger_tif/` from.

## P1 — Cross-browser and device testing

Existing coverage: 1440p Chrome/Firefox on Windows, Firefox on Android.

- [ ] Safari desktop (macOS) — WebGL behavior, COG byte-range fetch
- [ ] Edge desktop
- [ ] iOS Safari (iPhone) — pinch zoom, sidebar bottom sheet, popup positioning, 100dvh behavior
- [ ] iOS Chrome (still WebKit underneath)
- [ ] Android Chrome
- [ ] Android Samsung Internet (default for many Samsung users)
- [ ] iPad Safari (different from iPhone Safari for layout)
- [ ] Throttled network test: Chrome DevTools "Slow 3G" preset (~400 kbps, 2s RTT). Walk through full UX flow.
- [ ] Verify behavior when COG fetch fails or stalls partway — does the layer hang, error gracefully, or render empty?
- [ ] Verify behavior on period change while previous COG is still loading.
- [ ] Test at 1080p, 4K, and ultrawide (3440×1440) resolutions.

## P1 — Accessibility

- [ ] Run WebAIM contrast check on `--ink-muted` (`#76695c` on `#f5efe2`). Adjust if below AA at small sizes.
- [ ] Add `aria-live="polite"` region for popup announcements.
- [ ] Don't full-`innerHTML`-rewrite the sidebar on every state change — preserves keyboard focus during checkbox interaction.
- [ ] Add `role="group"` to the basemap toggle wrapper.
- [ ] Verify keyboard navigation through sidebar checklist works smoothly.
- [ ] Verify visible focus rings on all interactive elements.

## P1 — Performance

- [ ] Confirm gzip/brotli is being served for the 611 KiB main bundle. Should compress to ~180 KiB on the wire.
- [ ] Profile the climate-layer style rebuild on group-toggle. With "All"/"None" hitting up to 13 zones in succession via individual `setState` calls, that's potentially 13 WebGL style recompiles. If it stutters, switch to style variables (uniforms) so the shader compiles once.
- [ ] Investigate `manualChunks` in `vite.config.ts` to split OL out as a separate cache-friendly chunk.
- [ ] Keep old climate layer visible (or fade out) while new period loads, instead of going blank.
- [ ] Run a Lighthouse pass — captures SEO, performance, and a11y findings in one shot.

## P1 — Repo hygiene before going public

- [ ] Decide: clean up existing repo and rename, OR private dev + public `KoppenMap` fork. Recommend single repo unless there's a specific reason to split.
- [ ] Squash or `git filter-repo` any embarrassing commit history.
- [ ] Verify `LICENSE` is what you intend (currently MIT per the sidebar citation).
- [ ] Confirm `.codex`, `.claude/`, and `AGENTS.md` are gitignored — they are per `.gitignore`, but double-check none have been accidentally committed in history.
- [ ] Audit for any committed secrets, API keys, or local paths.
- [ ] Add `.nvmrc` with `24` for local dev consistency.
- [ ] Add `engines` field to `package.json` (`node: ">=24"`, `pnpm: ">=10.33.2"`) to fail fast on wrong env.
- [ ] Add `.github/dependabot.yml` for automated dep updates once public.
- [ ] Enable GitHub's free CodeQL / security scanning on the public repo.
- [ ] Update `AGENTS.md` to reflect the new `BASE_PATH` default once custom domain switch lands.
- [ ] Bump `package.json` version from `0.1.0` → `0.8.0` for staging, then `1.0.0` at launch.
- [ ] Start a `CHANGELOG.md`.

## P2 — Stretch goals

- [ ] **Permalinks** — encode `period`, `visibleZones`, map center, zoom in URL params. Single biggest feature for shareability ("look at climate change in 2099" with a pre-loaded view).
- [ ] **About / methodology blurb** in sidebar, separate from the citation collapse. One-paragraph "what am I looking at" for first-time visitors.
- [ ] **Multi-favicon sizes** — 16, 32, 48, 192, 512 px PNGs for various contexts.
- [ ] **Print stylesheet** — people do print maps.
- [ ] **Privacy-friendly analytics** (Plausible, Umami, or skip).
- [ ] **JSON-LD structured data** — `WebApplication` or `Dataset` block for SEO.
- [ ] **Keyboard-accessible coordinate lookup form** for screen-reader users — type lat/lon, get the climate class.
- [ ] **Animated transitions across historical periods** (already in spec future-work list).
- [ ] **Split-screen / swipe comparison** between periods (already in spec future-work list).
- [ ] **Aggregate queries** — "what % of land is Cfa?" by period.

