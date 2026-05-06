# Performance TODO

Goal: make the map feel smoother on mobile and mixed desktop hardware without changing the core static-site architecture unless measurements show the current approach has hit its ceiling.

Treat every item below as a hypothesis. Measure before and after each change, keep experiments isolated, and prefer small reversible patches over broad rewrites.

## Current User-Visible Symptoms

- Period changes take roughly 3 seconds before the new climate layer feels ready.
- Panning into new areas loads edge content slowly.
- Mouse-wheel zoom feels laggy and discrete instead of smoothly moving in and out.
- Clicking a location has a noticeable delay before the popup appears.

## Baseline Measurement Plan

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

## Ranked Optimization Matrix

Rank combines likely performance impact, implementation difficulty, bug risk, and how directly the item addresses reported symptoms.

| Rank | Idea | Helps | Expected boost | Difficulty | Bug risk | Notes |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Use immediate click handling instead of `singleclick` for popup display | Popup delay | High | Low-medium | Medium | Completed in `src/map/map.ts`; user-tested result is much snappier. |
| 2 | Cap map render pixel ratio | Pan and zoom smoothness | High on high-DPI/mobile/4K | Low | Low | Implemented with `MAX_MAP_PIXEL_RATIO = 1.5`; user-tested result is a bit smoother. |
| 3 | Tune `MouseWheelZoom` settings separately from other zoom interactions | Mouse-wheel zoom smoothness | Medium-high | Low | Low-medium | Test disabling default `mouseWheelZoom` and adding `MouseWheelZoom` with lower `timeout`, shorter `duration`, smaller `maxDelta`, and `constrainResolution: false`. This targets laggy, discrete wheel steps more directly than global `zoomDuration`. |
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

## Current PR Shortlist

For this PR, prefer high-reward, low-risk, low-effort changes that are easy to isolate and revert.

1. Keep the completed immediate popup handling and pixel-ratio cap if manual testing continues to agree.
2. Keep rotation disabled because it prevents accidental touch rotation without changing useful map behavior.
3. Next, test wheel-specific zoom tuning with OpenLayers' built-in `MouseWheelZoom` options before writing a custom interaction.
4. If wheel-specific tuning still feels discrete, consider a small custom wheel handler that applies each wheel event immediately with `view.adjustZoom()` and debounces `view.endInteraction()`.
5. Also test tile transition removal and one conservative cache/loading tweak if they improve the feeling of raster content catching up after zoom or pan.
6. Leave idle COG prefetch, whole-file COG reads, and UI compositing cleanup for follow-ups unless the smaller zoom/tile experiments do not move the feel enough.

## Suggested Work Sequence

1. Establish baseline measurements for the four reported symptoms.
2. Fix popup latency separately from raster rendering.
3. Test pixel-ratio caps on desktop high-DPI and mobile.
4. Test mouse-wheel zoom tuning with smaller `timeout`, `duration`, and `maxDelta` values.
5. Test tile transition removal and conservative tile/cache/preload settings using the same pan and zoom scripts.
6. Test whole-file COG loading/caching or idle COG prefetch against current range-read behavior.
7. Improve perceived period switching with old-layer retention or crossfade.
8. Strip or simplify expensive UI compositing and compare frame traces.
9. Defer larger data-pipeline changes until the measured ceiling is clear.

## Likely Hard Limits

- Runtime COG decoding and WebGL rendering will vary by browser GPU stack and device memory bandwidth.
- High-DPI displays multiply fragment work; full native pixel ratio may not be worth the visual gain.
- External basemap tile loading has network and provider latency outside this app's direct control.
- Browser caching, range-request behavior, and WebGL driver behavior differ across Chrome, Firefox, Safari, and mobile browsers.
- A static app can prefetch and cache aggressively, but it cannot eliminate first-load network cost without increasing initial payload.

## Measurement Log

Add dated entries here as experiments are run.

| Date | Branch/SHA | Device/browser | Experiment | Result | Decision |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Immediate popup on OpenLayers `click` instead of delayed `singleclick` | Popup feels much snappier | Keep change; move to pan/zoom smoothness next. |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Cap OpenLayers map render pixel ratio at `1.5` | Pan/zoom feels a bit smoother | Keep for now; continue tuning zoom feel. |
| 2026-05-06 | `codex/performance-strategies` | User manual test | Shorten OpenLayers default zoom animation to `150 ms` while disabling pinch/Alt+Shift rotation | No regression, but no worthwhile improvement to laggy, discrete mouse-wheel zoom feel | Revert zoom-duration tuning; keep rotation lock. Test wheel-specific settings or a custom continuous wheel handler next. |
