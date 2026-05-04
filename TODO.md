# TODO — v0.8 → v1.0

Overview: The MVP for this project is complete, but it needs polish before I'm willing to serve it on a custom domain. The following list of tasks should be addressed prior to shipping.

Before implementing any item, validate the underlying goal and decide whether the listed change is still the right way to achieve it. This TODO list includes AI-generated review notes, so treat it as a hypothesis queue rather than an instruction queue.

## Intentional behavior (not bugs)

- **`sidebarOpen` is not persisted in preferences.** State resets to the default on every reload (open on desktop, collapsed bottom-sheet on mobile). Decision: the first-paint view should communicate "this is what the app does." Restoring a previously-collapsed sidebar would hide the controls from a returning visitor, and the assumption is most users don't visit often enough to care about preserving the collapsed state across sessions.

## P0 — Bugs and dead code

- [x] **Remove unused `theme` field** from `AppState` (`src/state.ts`) and preferences. Validated goal: remove dead state instead of implementing unplanned dark mode.
- [x] **Add `AbortController` to reverse-geocode** (`src/data/reverse-geocode.ts`). Validated goal: keep only the latest uncached Nominatim lookup active while preserving request spacing and cache behavior.
- [x] **Reserve vertical space in popup** for the place row. Validated goal: keep popup height stable by showing a loading row while reverse geocoding runs.
- [x] **Refactor sidebar zone-toggle handlers** to derive new state from `getState().visibleZones` instead of querying the DOM (`target.querySelectorAll('input[data-zone]:checked')`).
- [x] **Audit the `as Style` cast** in `src/map/climate-layer.ts`. Validated result: keep the cast, with a local comment explaining the OpenLayers expression typing gap.
- [x] **Verify the `event.preventDefault()` call** in `src/ui/popup.ts` is actually needed given `stopEvent: true` on the Overlay. Validated result: redundant overlay click prevention removed.
- [ ] **Test adaptive popup placement near viewport edges.** Current popups open above the click; near the top of the map they can extend into inaccessible space. Compare alternate placement/auto-pan approaches manually before choosing behavior.

## P0 — Build and CI

- [ ] **Switch `vite.config.ts` `base` default to `/`** for the custom-domain build, OR set `BASE_PATH=/` env in `deploy.yml`'s build step. Currently defaults to `/koppen/`, which will break asset URLs on a custom domain.
- [ ] **Drop `CNAME` into `public/`** (not repo root). Vite copies `public/` contents into the artifact verbatim.
- [ ] **Remove redundant `Typecheck` step from `deploy.yml`** — `pnpm build` already runs `tsc && vite build`, so typecheck happens twice. Drop one.
- [ ] **Add PR-level CI** — `deploy.yml` only triggers on push to main. Add `pull_request` trigger or split into `ci.yml` (lint + build on PRs) and `deploy.yml` (main only).
- [x] **Tighten ESLint** — current config is `js.recommended + tseslint.recommended`. Validated goal: explicitly enforce `@typescript-eslint/no-unused-vars` with underscore ignore patterns.
- [ ] **Pin OL more conservatively** — `^10.6.1` allows minor bumps; OL has shipped breaking changes to `WebGLTile` style API in minor versions. Consider `~10.6.1` (patch only).

## P0 — Features for v1.0

Next implementation PR scope: SEO/static assets. Keep that PR focused on `index.html` SEO prose and metadata, crawler/static files in `public/`, `og-image.png` verification or re-encoding, README raw-data download notes, and TODO ownership notes. Leave DNS/HTTPS and build/deploy workflow changes for the deploy-readiness PR unless the canonical domain is finalized during that work.

- [x] **Pin/marker at click point.** Small accent-colored dot at the click coordinate. `src/map/click-marker.ts` exposes a Vector layer with one Point feature; geometry updates when `state.popup` changes and clears on null.
- [x] **Desktop-collapsible sidebar.** Desktop panels can now collapse offscreen and return through an edge tab. State intentionally resets on reload; see intentional behavior above.
- [x] **Static SEO content block** in `index.html`. Added a `<noscript>` fallback and visually-hidden `<section>` describing Köppen-Geiger, the app, periods/scenarios, and attribution.
- [x] **Improved meta tags.** Tightened `<meta name="description">` with target keywords. Added canonical URL, Open Graph URL, Twitter Card meta (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), and `<meta name="theme-color">`.
- [x] **Verify og-image.png is 1200×630.** Validated result: existing `public/og-image.png` is already 1200×630.
- [ ] **Consider re-encoding `og-image.png`** to JPEG/WebP to drop from 153 KiB to ~50 KiB. Deferred to the performance/public-launch pass.
- [x] **Add `robots.txt` and `sitemap.xml`** to `public/`.
- [x] **Add `404.html`** to `public/` so direct hits to non-existent paths don't show GitHub's default.
- [ ] **Switch `vite.config.ts` `base` to `/`** for custom-domain build (covered in Build and CI section).
- [ ] **Add `CNAME` file** to `public/` (covered in Build and CI section).
- [ ] **When custom domain lands, update hard-coded `dropbop.github.io/koppen` references** in `index.html` (canonical, `og:url`, `og:image`, `twitter:image`), `public/404.html`, `public/robots.txt`, and `public/sitemap.xml`.
- [ ] **Configure DNS** (A records to GitHub IPs or CNAME to `<user>.github.io`). Pick apex vs www as canonical, redirect the other.
- [ ] **Verify HTTPS provisioning** completes after DNS propagates (Let's Encrypt via GitHub).
- [x] **Document raw data download** in README — link to the figshare DOI so contributors know where to get `koppen_geiger_tif/` from.

## P1 — Cross-browser and device testing

Existing coverage: 1440p Chrome/Firefox on Windows, Firefox on Android.

Timing and ownership: run this section after most P0/P1 improvements are in place. Codex/Claude should handle repeatable desktop automation, viewport screenshots, throttled-network simulation, and mocked COG failure/loading cases when explicitly scoped. Human-owned rows below require real hardware/browser testing or subjective visual/touch review; agents should not worry about completing those unless asked to help prepare a checklist.

- [ ] **Human-owned:** Safari desktop (macOS) — WebGL behavior, COG byte-range fetch
- [ ] **Human-owned:** Edge desktop final check. Codex/Claude can do Chromium-family automation as a proxy, but real Edge validation should be visual.
- [ ] **Human-owned:** iOS Safari (iPhone) — pinch zoom, sidebar bottom sheet, popup positioning, 100dvh behavior
- [ ] **Human-owned:** iOS Chrome (still WebKit underneath)
- [ ] **Human-owned:** Android Chrome
- [ ] **Human-owned:** Android Samsung Internet (default for many Samsung users)
- [ ] **Human-owned:** iPad Safari (different from iPhone Safari for layout)
- [ ] **Agentic first pass, human final review:** Throttled network test: Chrome DevTools "Slow 3G" preset (~400 kbps, 2s RTT). Walk through full UX flow.
- [ ] **Agentic:** Verify behavior when COG fetch fails or stalls partway — does the layer hang, error gracefully, or render empty?
- [ ] **Agentic:** Verify behavior on period change while previous COG is still loading.
- [ ] **Agentic first pass, human final review:** Test at 1080p, 4K, and ultrawide (3440×1440) resolutions.

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
