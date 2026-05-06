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
- [x] **Test adaptive popup placement near viewport edges.** Validated result: keep the popup above the click when there is room, flip it below the click near the top edge, and keep OpenLayers pan-into-view as a fallback for side and bottom overflow.

## P0 — Build and CI

- [x] **Switch `vite.config.ts` `base` default to `/`** for the custom-domain build. Validated goal: default builds now target the `koppenmap.com` root path while `BASE_PATH` remains available for project-page builds.
- [x] **Drop `CNAME` into `public/`** (not repo root). Vite copies `public/` contents into the artifact verbatim.
- [x] **Remove redundant `Typecheck` step from `deploy.yml`** — `pnpm build` already runs `tsc && vite build`, so typecheck happens twice. Drop one.
- [x] **Add PR-level CI** — `deploy.yml` only triggers on push to main. Add `pull_request` trigger or split into `ci.yml` (lint + build on PRs) and `deploy.yml` (main only).
- [x] **Tighten ESLint** — current config is `js.recommended + tseslint.recommended`. Validated goal: explicitly enforce `@typescript-eslint/no-unused-vars` with underscore ignore patterns.
- [x] **Pin OL more conservatively** — `^10.6.1` allows minor bumps; OL has shipped breaking changes to `WebGLTile` style API in minor versions. Pinned to `~10.9.0`, matching the current lockfile resolution while allowing patch updates.

## P0 — Features for v1.0

Remaining P0 feature/deploy work is final DNS/HTTPS verification for `koppenmap.com`. The canonical domain is the apex host; `www.koppenmap.com` should redirect there through GitHub Pages.

- [x] **Pin/marker at click point.** Small accent-colored dot at the click coordinate. `src/map/click-marker.ts` exposes a Vector layer with one Point feature; geometry updates when `state.popup` changes and clears on null.
- [x] **Desktop-collapsible sidebar.** Desktop panels can now collapse offscreen and return through an edge tab. State intentionally resets on reload; see intentional behavior above.
- [x] **Static SEO content block** in `index.html`. Added a `<noscript>` fallback and visually-hidden `<section>` describing Köppen-Geiger, the app, periods/scenarios, and attribution.
- [x] **Improved meta tags.** Tightened `<meta name="description">` with target keywords. Added canonical URL, Open Graph URL, Twitter Card meta (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), and `<meta name="theme-color">`.
- [x] **Verify og-image.png is 1200×630.** Validated result: existing `public/og-image.png` is already 1200×630.
- [ ] **Consider re-encoding `og-image.png`** to JPEG/WebP to drop from 153 KiB to ~50 KiB. Deferred to the performance/public-launch pass.
- [x] **Add `robots.txt` and `sitemap.xml`** to `public/`.
- [x] **Add `404.html`** to `public/` so direct hits to non-existent paths don't show GitHub's default.
- [x] **Switch `vite.config.ts` `base` to `/`** for custom-domain build (covered in Build and CI section).
- [x] **Add `CNAME` file** to `public/` (covered in Build and CI section).
- [x] **When custom domain lands, update hard-coded GitHub Pages deployment references** in `index.html` (canonical, `og:url`, `og:image`, `twitter:image`), `public/404.html`, `public/robots.txt`, and `public/sitemap.xml`.
- [ ] **Verify DNS and GitHub Pages custom-domain settings.** User reports `koppenmap.com` and `www` records point to `dropbop.github.io`; confirm GitHub Pages is configured for `koppenmap.com` and redirects `www` to the apex.
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

Goal: make the map feel smoother on mobile and mixed desktop hardware without changing the core static-site architecture unless measurements show the current approach has hit its ceiling. Treat every item below as a hypothesis. Measure before and after each change, keep experiments isolated, and prefer small reversible patches over broad rewrites.

- [ ] Confirm gzip/brotli is being served for the 611 KiB main bundle. Should compress to ~180 KiB on the wire.
- [ ] Profile the climate-layer style rebuild on group-toggle. With "All"/"None" hitting up to 13 zones in succession via individual `setState` calls, that's potentially 13 WebGL style recompiles. If it stutters, switch to style variables (uniforms) so the shader compiles once.
- [ ] Investigate `manualChunks` in `vite.config.ts` to split OL out as a separate cache-friendly chunk.
- [ ] Keep old climate layer visible (or fade out) while new period loads, instead of going blank.
- [ ] Run a Lighthouse pass — captures SEO, performance, and a11y findings in one shot.

Current user-visible symptoms:

- Period changes take roughly 3 seconds before the new climate layer feels ready.
- Panning into new areas loads edge content slowly.
- Mouse-wheel zoom feels laggy and discrete instead of smoothly moving in and out.
- Clicking a location has a noticeable delay before the popup appears.

Baseline measurement plan:

Record results on production builds whenever possible. Dev-server timings are still useful for local iteration, but final comparisons should use `pnpm build` plus `pnpm preview`.

| Flow | Primary metric | Secondary signals | Notes |
| --- | ---: | --- | --- |
| Cold app load | Navigation start to first complete climate render | JS parse time, font wait, default COG timing | Run with empty HTTP cache. |
| Warm app load | Reload to first complete climate render | Cached asset use, long tasks | Separates network from render/decode cost. |
| Period switch | Select change to stable map render | COG requests, tile decode time, blank-layer duration | Main target for the 3 second symptom. |
| Rapid period switches | Final select change to stable render | Aborted/stale work, loading indicator correctness | Catches wasted old-period work. |
| Pan one viewport | Pan end to newly exposed edge filled | Tile count, range requests, long tasks | Use same start/end extent each run. |
| Wheel/pinch zoom | Frame time and dropped frames | GPU/compositor activity, tile churn | Subjective smoothness needs frame data. |
| Click popup | Pointer/click event to popup DOM visible | Reverse-geocode timing, map hit query timing | OpenLayers `singleclick` adds an intentional delay. |
| Zone filtering | Checkbox click to climate layer restyled | Shader/style recompiles, focus preservation | Includes "All" and "None". |
| Five-minute map session | Memory growth and cache behavior | Network reuse, stale tile behavior | Needed before raising caches/preload. |

Suggested instrumentation:

- Add optional `performance.mark()` / `performance.measure()` calls behind a dev flag.
- Listen for map render events around period changes and panning.
- Use Chrome DevTools Performance traces for frame timing and long tasks.
- Use Playwright for repeatable desktop flows once the manual baseline is clear.
- Keep a small measurement log with device/browser, viewport, network mode, and build SHA.

Ranked optimization matrix:

Rank combines likely performance impact, implementation difficulty, bug risk, and how directly the item addresses reported symptoms.

| Rank | Idea | Helps | Expected boost | Difficulty | Bug risk | Notes |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Use immediate click handling instead of `singleclick` for popup display | Popup delay | High | Low-medium | Medium | Completed in `src/map/map.ts`; user-tested result is much snappier. |
| 2 | Cap map render pixel ratio | Pan and zoom smoothness | High on high-DPI/mobile/4K | Low | Low | Implemented with `MAX_MAP_PIXEL_RATIO = 1.5`; user-tested result is a bit smoother. |
| 3 | Tune `MouseWheelZoom` settings separately from other zoom interactions | Mouse-wheel zoom smoothness | Medium-high | Low | Low-medium | Implemented by disabling default `mouseWheelZoom` and adding `MouseWheelZoom` with `timeout: 20`, `duration: 80`, `maxDelta: 0.4`, and `constrainResolution: false`; user-tested result is a little better. |
| 4 | Disable or shorten tile opacity transitions | Edge loading and zoom feel | Medium | Low | Low | Test `transition: 0` on the climate raster path if supported; compare against default fade because fades can make content feel like it trails behind zoom/pan. |
| 5 | Tune tile and GeoTIFF caches/loading | Edge loading and zoom | Medium-high | Low-medium | Medium | Test conservative `maxTilesLoading`, `WebGLTile cacheSize`, `preload`, and GeoTIFF `sourceOptions.cacheSize` values. Watch memory. |
| 6 | Idle-prefetch likely/all period COGs after initial load | Period switch | High after warmup | Low-medium | Low-medium | Total committed COG payload is about 5.6 MiB. Gate for connection quality if needed and do not block initial render. |
| 7 | Reduce compositor-heavy UI styles over the map | Pan and zoom smoothness | Medium | Low | Low | Test removing/reducing `backdrop-filter`, large shadows, and translucent fixed panels, especially on mobile. Needs visual review. |
| 8 | Cache whole COG files or allow full-file reads | Period switch and edge loading | High | Medium | Medium | Current COGs are only about 310-327 KiB each, so many range reads may cost more than whole-file fetch/decode. Broader than the smallest polish fixes. |
| 9 | Keep old climate layer visible until new period is ready | Perceived period switching | Medium-high perceived | Medium | Medium | Does not reduce raw load time by itself, but avoids blank/partial transitions. |
| 10 | Avoid full sidebar `innerHTML` rerenders for routine interactions | Zone filtering and keyboard feel | Low-medium | Medium | Medium | Also helps accessibility by preserving focus. |
| 11 | Split OpenLayers into a separate production chunk | Initial and repeat loads | Low-medium | Low | Low | Helps caching and parse attribution, but does not solve runtime smoothness. |
| 12 | Use a lighter basemap strategy | Edge loading | Medium | Medium | Medium | External basemap latency is independent from climate layer performance. |
| 13 | Generate dedicated web map tiles or PMTiles instead of runtime COG decoding | All raster interactions | Potentially high | High | High | Data-pipeline rewrite; only pursue if smaller changes fail. |

Current PR shortlist:

For this PR, prefer high-reward, low-risk, low-effort changes that are easy to isolate and revert.

1. Keep the completed immediate popup handling and pixel-ratio cap if manual testing continues to agree.
2. Keep rotation disabled because it prevents accidental touch rotation without changing useful map behavior.
3. Keep wheel-specific zoom tuning if reviewer validation agrees it improves mouse-wheel feel without hurting trackpad, double-click, pinch zoom, popup clicks, or panning.
4. If wheel-specific tuning still feels discrete, consider a small custom wheel handler that applies each wheel event immediately with `view.adjustZoom()` and debounces `view.endInteraction()`.
5. Also test tile transition removal and one conservative cache/loading tweak if they improve the feeling of raster content catching up after zoom or pan.
6. Leave idle COG prefetch, whole-file COG reads, and UI compositing cleanup for follow-ups unless the smaller zoom/tile experiments do not move the feel enough.

Suggested work sequence:

1. Establish baseline measurements for the four reported symptoms.
2. Fix popup latency separately from raster rendering.
3. Test pixel-ratio caps on desktop high-DPI and mobile.
4. Test mouse-wheel zoom tuning with smaller `timeout`, `duration`, and `maxDelta` values.
5. Test tile transition removal and conservative tile/cache/preload settings using the same pan and zoom scripts.
6. Test whole-file COG loading/caching or idle COG prefetch against current range-read behavior.
7. Improve perceived period switching with old-layer retention or crossfade.
8. Strip or simplify expensive UI compositing and compare frame traces.
9. Defer larger data-pipeline changes until the measured ceiling is clear.

Likely hard limits:

- Runtime COG decoding and WebGL rendering will vary by browser GPU stack and device memory bandwidth.
- High-DPI displays multiply fragment work; full native pixel ratio may not be worth the visual gain.
- External basemap tile loading has network and provider latency outside this app's direct control.
- Browser caching, range-request behavior, and WebGL driver behavior differ across Chrome, Firefox, Safari, and mobile browsers.
- A static app can prefetch and cache aggressively, but it cannot eliminate first-load network cost without increasing initial payload.

Measurement log:

| Date | Branch/SHA | Device/browser | Experiment | Result | Decision |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Immediate popup on OpenLayers `click` instead of delayed `singleclick` | Popup feels much snappier | Keep change; move to pan/zoom smoothness next. |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Cap OpenLayers map render pixel ratio at `1.5` | Pan/zoom feels a bit smoother | Keep for now; continue tuning zoom feel. |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Shorten OpenLayers default zoom animation to `150 ms` while disabling pinch/Alt+Shift rotation | No regression, but no worthwhile improvement to laggy, discrete mouse-wheel zoom feel | Revert zoom-duration tuning; keep rotation lock. Test wheel-specific settings or a custom continuous wheel handler next. |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Replace default wheel zoom with `MouseWheelZoom` using `timeout: 20`, `duration: 80`, `maxDelta: 0.4`, and `constrainResolution: false` | Mouse-wheel zoom seems a little better | Keep for reviewer validation; verify trackpad, double-click, pinch zoom, popup clicks, and panning before merging. |

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
- [x] **Multi-favicon sizes** — 16, 32, 48, 192, 512 px PNGs for various contexts.
- [ ] **Print stylesheet** — people do print maps.
- [ ] **Privacy-friendly analytics** (Plausible, Umami, or skip).
- [ ] **JSON-LD structured data** — `WebApplication` or `Dataset` block for SEO.
- [ ] **Keyboard-accessible coordinate lookup form** for screen-reader users — type lat/lon, get the climate class.
- [ ] **Animated transitions across historical periods** (already in spec future-work list).
- [ ] **Split-screen / swipe comparison** between periods (already in spec future-work list).
- [ ] **Aggregate queries** — "what % of land is Cfa?" by period.
