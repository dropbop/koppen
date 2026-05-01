# Köppen-Geiger Interactive Map — Build Spec

## 1. Goal

A static, single-page web app that displays the Beck et al. V3 Köppen-Geiger climate classification at global scale, with interactive features that improve on what's currently available online (most existing visualizers are static images or have minimal interactivity). The app must:

- Render the Köppen-Geiger raster crisply at any zoom level
- Toggle between a plain basemap and satellite imagery
- Filter visible climate zones by class (with grouping by main climate group)
- Show a popup with the climate classification and human-readable description on click
- Be polished enough to feel like a finished product — not a tech demo

Hosting target is GitHub Pages. No backend.

---

## 2. Tech Stack (locked decisions)

| Concern         | Choice                              | Why                                                                                                  |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Build tool      | **Vite**                            | Fast dev server, simple static build                                                                 |
| Language        | **TypeScript**                      | Type safety for zone metadata is worth it                                                            |
| UI              | **Vanilla TS** (no framework)       | App has ~4 UI elements; React/Svelte adds weight without payoff                                      |
| Styling         | **Tailwind CSS**                    | Speeds polish; small final bundle with JIT                                                           |
| Map library     | **OpenLayers 10+**                  | Native COG support via `ol/source/GeoTIFF`, WebGL renderer, exposes raw pixel values for click-query |
| Raster format   | **Cloud Optimized GeoTIFF (COG)**   | Static-hostable, byte-range fetched, integer values readable client-side                             |
| Package manager | **pnpm** (or npm if preferred)      | —                                                                                                    |
| Deployment      | **GitHub Pages** via GitHub Actions | —                                                                                                    |

Do **not** introduce: a tile server (titiler, terracotta, geoserver), a JS framework, a state management library, a CSS-in-JS solution, or server-side rendering. None are needed.

---

## 3. Data Preparation

The repo starts with a `koppen_geiger_tif/` folder containing the unzipped V3 figshare archive. First step before any frontend code: inspect this folder and prepare web-ready data.

### 3.1 Inventory step

Run a script (`scripts/inventory-data.ts`) that lists every `.tif` in `koppen_geiger_tif/` with its dimensions, pixel size, projection, and file size, plus the contents of `legend.txt`. Print this and stop. **Do not proceed until the agent has reviewed this output and confirmed the structure** — the V3 archive contains multiple resolutions and multiple periods/scenarios, and you need to pick which to ship.

### 3.2 What to ship in the MVP

Pick **one resolution** for the web app, prioritizing global coverage at reasonable file size over native fidelity:

- **First choice: the 0.1° (~10 km) global maps.** A single global COG at this resolution should be ~1–5 MB with LZW compression. Loads instantly.
- **Fallback: 0.5 km if 0.1° isn't in the archive,** but downsample it to ~0.05° before tiling.
- Do **not** ship the 1 km global as the primary layer — too large for static hosting at scale.

Periods to include (ordered by priority):

1. **1991–2020** (present-day historical) — ship in MVP, default selection
2. 1901–1930, 1931–1960, 1961–1990 (historical) — ship if straightforward
3. Future scenarios (SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5 × multiple periods) — out of scope for v1, but design the data manifest to support them later

### 3.3 COG conversion

For each selected GeoTIFF:

```bash
gdal_translate \
  -of COG \
  -co COMPRESS=LZW \
  -co PREDICTOR=2 \
  -co BLOCKSIZE=512 \
  -co OVERVIEWS=AUTO \
  input.tif public/data/cogs/<period>.tif
```

Verify with `gdalinfo` that overviews are present and the file is valid COG (`gdalinfo -mdd IMAGE_STRUCTURE` should show `LAYOUT=COG`).

### 3.4 Legend parsing

Write `scripts/build-zones.ts` that:

1. Reads `koppen_geiger_tif/legend.txt`. Beck V3 uses 30 classes mapped to specific RGB values. Parse out each line into `{ value: number, code: string, rgb: [r, g, b] }`.
2. Reads a hand-curated `data/zone-descriptions.json` (you will create this — see Appendix A) that maps each Köppen code to `{ name, group, groupCode, description, examples }`.
3. Merges them into `public/data/zones.json` keyed by numeric pixel value.
4. Writes `public/data/manifest.json` listing available periods and which COG file backs each.

The output `zones.json` is the single source of truth at runtime. Do not hardcode colors or class definitions anywhere in the frontend.

---

## 4. Repository Structure

```
/
├── koppen_geiger_tif/              # provided, raw data — do not modify
├── data/
│   └── zone-descriptions.json      # hand-curated metadata (see Appendix A)
├── scripts/
│   ├── inventory-data.ts           # one-shot: print archive contents
│   ├── prepare-cogs.sh             # GDAL pipeline for COG conversion
│   └── build-zones.ts              # legend.txt + descriptions → zones.json
├── public/
│   └── data/
│       ├── cogs/                   # generated COGs
│       ├── zones.json              # generated
│       └── manifest.json           # generated
├── src/
│   ├── main.ts                     # entry, wires everything together
│   ├── state.ts                    # app state + subscribe pattern
│   ├── map/
│   │   ├── map.ts                  # OL map setup
│   │   ├── basemaps.ts             # OSM + Esri World Imagery sources
│   │   ├── climate-layer.ts        # WebGL tile layer from COG, dynamic style
│   │   └── click-query.ts          # pixel-value readout
│   ├── ui/
│   │   ├── sidebar.ts              # filter + period dropdown
│   │   ├── popup.ts                # click result card
│   │   └── basemap-toggle.ts       # plain/satellite switch
│   ├── data/
│   │   └── zones.ts                # loads + types zones.json
│   └── styles.css                  # Tailwind directives + custom overrides
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .github/workflows/deploy.yml    # GitHub Pages action
└── README.md
```

---

## 5. Build & Tooling Setup

- `vite.config.ts`: set `base: '/<repo-name>/'` if deploying to a project page (user will provide repo name; default to a placeholder and document in README).
- `tsconfig.json`: strict mode on. Path alias `@/` → `src/`.
- ESLint + Prettier with sensible defaults. Don't over-configure.
- Add `prepare-data` npm script that runs the inventory + COG conversion + zones build in sequence. Document in README that this must run before first dev or build.

---

## 6. Application Architecture

### 6.1 State

Single state object in `src/state.ts`:

```ts
type AppState = {
  period: string; // e.g., "1991-2020"
  basemap: 'plain' | 'satellite';
  visibleZones: Set<number>; // numeric class values currently shown
  popup: { lon: number; lat: number; classValue: number } | null;
  loading: boolean;
};
```

Implement a tiny pub/sub:

```ts
const state: AppState = { ... };
const subscribers = new Set<(s: AppState) => void>();
export function getState(): Readonly<AppState> { return state; }
export function setState(patch: Partial<AppState>): void { /* merge + notify */ }
export function subscribe(fn): () => void { /* return unsubscribe */ }
```

Every UI component subscribes and re-renders its slice on change. This is enough; no Redux/Zustand.

### 6.2 Initialization flow

1. Fetch `manifest.json` and `zones.json` in parallel
2. Build initial `visibleZones` = all class values from zones.json
3. Mount the map with the default period's COG
4. Mount each UI component, passing initial state
5. Wire click handler

Show a simple full-screen loading spinner until step 3 completes.

---

## 7. Map Layer

### 7.1 Köppen layer

Use `ol/source/GeoTIFF` with the COG URL. Set `normalize: false` and `interpolate: false` — we need raw integer class values and nearest-neighbor sampling for crisp categorical boundaries.

```ts
const source = new GeoTIFF({
  sources: [{ url: cogUrl }],
  normalize: false,
  interpolate: false,
});
```

Wrap in a `WebGLTileLayer`. Build the style's `color` expression as a `['match', ['band', 1], ...]` cascade generated from `zones.json`. For each class:

- If `visibleZones.has(value)` → return its RGB color
- Else → return `[0, 0, 0, 0]` (transparent)

Default fallback (no-data / unmatched) → transparent.

When `visibleZones` changes, regenerate the style and call `layer.updateStyleVariables()` or replace the style entirely. Verify the agent picks the right OL API for hot-updating WebGL styles in the version they install — OL's API here has changed across versions.

The Köppen layer should default to ~70% opacity so the basemap shows through. Make opacity adjustable via a slider in the sidebar (nice-to-have, low priority).

### 7.2 Basemaps

- **Plain**: Carto Positron (`https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) — cleaner than raw OSM, doesn't fight the climate colors. Attribution: `© OpenStreetMap contributors © CARTO`.
- **Satellite**: Esri World Imagery (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`). Attribution: `Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community`.

Both are key-free. Swap the basemap layer when state.basemap changes. Make sure attribution updates accordingly — OL's `ol/control/Attribution` handles this automatically if attributions are set on the source.

### 7.3 Click-to-query

On `map.on('singleclick', ...)`:

1. Get the clicked coordinate in EPSG:4326 (lon/lat).
2. Read the climate raster value at that pixel. With `WebGLTileLayer`, use `layer.getData(pixel)` which returns a `Uint8Array` / typed array with the band values. Index 0 is the class number.
3. If the value is 0 / out-of-range / not in zones.json → don't show popup (clicked on ocean or no-data area).
4. Otherwise, set `state.popup = { lon, lat, classValue }`.

Map projection note: OL renders in EPSG:3857 by default. The V3 GeoTIFFs are EPSG:4326. OL's `GeoTIFF` source handles reprojection transparently, but verify by testing that a click on a known location (e.g., Houston → should be Cfa) returns the right class.

---

## 8. UI Components

The layout: full-bleed map, fixed sidebar on the left (~320px wide, collapsible on narrow screens), basemap toggle in the top-right corner of the map, popup as a floating card anchored to the click point.

### 8.1 Sidebar (`src/ui/sidebar.ts`)

Sections, top to bottom:

1. **Header**: app title + a one-line tagline. Small Köppen-Geiger reference link.
2. **Period selector**: dropdown of available periods from the manifest. Defaults to 1991–2020.
3. **Climate filter**: hierarchical checkbox list grouped by main climate group:
   - **A — Tropical** (master toggle + Af, Am, Aw, As if present)
   - **B — Arid** (BWh, BWk, BSh, BSk)
   - **C — Temperate** (Cfa, Cfb, Cfc, Cwa, Cwb, Cwc, Csa, Csb, Csc)
   - **D — Continental** (Dfa, Dfb, Dfc, Dfd, Dwa, Dwb, Dwc, Dwd, Dsa, Dsb, Dsc, Dsd)
   - **E — Polar** (ET, EF)

   Each row shows a small color swatch (filled square) using the legend RGB. Master toggle per group selects/deselects all subzones in that group. Add a "Show all" / "Show none" pair at the top of the filter section.

   Order subzones by their numeric value from the legend, not alphabetically — this matches the standard Beck visualization.

4. **Opacity slider** (optional, nice-to-have): controls the climate layer opacity. Default 70%.
5. **Footer**: small attribution to Beck et al. with link to the figshare DOI/paper.

### 8.2 Popup (`src/ui/popup.ts`)

Shown when `state.popup` is non-null. A floating card, ~280px wide, with a subtle drop shadow and rounded corners. Positioned via OL's `Overlay` anchored to the clicked coordinate.

Content:

- **Header bar**: colored stripe in the zone's color, with the code (e.g., "Cfa") large and white.
- **Full name**: e.g., "Humid subtropical climate"
- **Group**: e.g., "Temperate, no dry season, hot summer"
- **Description**: 1–2 sentence paragraph from zones.json.
- **Examples**: "Found in: SE United States, eastern China, parts of Argentina"
- **Coordinates**: "32.74°N, 95.30°W" in small, muted text.
- **Close button** in the top-right.

Clicking outside the popup or pressing Escape should close it.

### 8.3 Basemap toggle (`src/ui/basemap-toggle.ts`)

Top-right corner of the map, below OL's default zoom controls. Two-button segmented control: `Map` / `Satellite`. Active button has a filled background.

---

## 9. Styling

Tailwind for everything. No custom design system — use Tailwind's defaults with a single accent color (suggest a desaturated blue, e.g., `slate-700` for text and `blue-600` for accents). Round corners (`rounded-lg`), subtle shadows (`shadow-md`), generous padding.

The app should feel **calm**. The map's color information is already busy; the chrome around it should be quiet. Avoid:

- Gradients on UI elements
- Drop shadows heavier than `shadow-md`
- Saturated UI accent colors that compete with the map
- Animated transitions longer than 150ms

Use system fonts (`font-sans` in Tailwind = system stack). No custom web fonts — keeps the bundle lean and the feel native.

Mobile responsive baseline: sidebar collapses to a bottom sheet on screens < 768px wide. This is nice-to-have for v1 — if it complicates things, ship desktop-only and note in the README.

---

## 10. Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml`:

- Trigger on push to `main`
- Run `pnpm install`, then `pnpm prepare-data` (or document that COGs are committed and skip), then `pnpm build`
- Use `actions/upload-pages-artifact` and `actions/deploy-pages@v4`

**Important on COGs and Git LFS**: a 5 MB COG × 4 periods is 20 MB, fine for regular Git. If the agent ends up with anything >50 MB total, switch to Git LFS or check the COGs into a release artifact and have the workflow download them at build time.

Ensure the Vite `base` config matches the repo path. If unclear, build, then `python -m http.server` from `dist/` and verify all assets resolve.

---

## 11. Out of Scope (note in README under "Future")

- Multi-period comparison (split-screen / swipe)
- Permalinks encoding map view + filters in the URL
- Future SSP scenario layers
- Aggregate queries (e.g., "what % of land is Cfa?")
- 1 km full-resolution layer
- Animated transitions across historical periods

---

## Appendix A: Starter zone descriptions

Create `data/zone-descriptions.json` keyed by Köppen code. Each entry needs:

```json
{
  "name": "Humid subtropical",
  "group": "Temperate",
  "groupCode": "C",
  "groupDescription": "No dry season, hot summer",
  "description": "Hot, humid summers and mild to cool winters with significant precipitation year-round and no pronounced dry season.",
  "examples": "SE United States, eastern China, southern Brazil, eastern Argentina, NE India"
}
```

Two more examples to anchor the tone:

```json
"Af": {
  "name": "Tropical rainforest",
  "group": "Tropical",
  "groupCode": "A",
  "groupDescription": "Hot year-round",
  "description": "Hot temperatures every month (>18°C) and significant precipitation in every month (>60 mm). No dry season.",
  "examples": "Amazon basin, Congo basin, Indonesia, Malaysia, southern India"
},
"BWh": {
  "name": "Hot desert",
  "group": "Arid",
  "groupCode": "B",
  "groupDescription": "Desert, hot",
  "description": "Annual precipitation less than half the threshold for a dry climate, with mean annual temperature above 18°C. Extreme aridity and high heat.",
  "examples": "Sahara, Arabian Peninsula, central Australia, SW United States"
}
```

The agent should fill out all 30 classes following the standard Köppen-Geiger system. Reference the Wikipedia "Köppen climate classification" article for canonical definitions and example regions, but write descriptions in the agent's own words — keep them to 1–2 sentences. Make sure every class actually present in the V3 legend has an entry.

---

## Acceptance Criteria

The build is done when:

1. `pnpm install && pnpm prepare-data && pnpm dev` works from a fresh clone
2. The map loads at world view in <2 seconds on a normal connection
3. Toggling between Map and Satellite swaps cleanly, with correct attribution
4. Filter checkboxes show/hide their classes immediately (<100ms)
5. Clicking any land point shows a popup with the correct climate class for that location (sanity-check Houston → Cfa, Phoenix → BWh, Reykjavík → ET, Singapore → Af)
6. The deployed GitHub Pages site is fully functional with no console errors
7. README documents how to add new periods/scenarios by dropping a TIF and re-running `prepare-data`
