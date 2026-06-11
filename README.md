# Köppen-Geiger Interactive Map

A static Vite + TypeScript app for exploring the Beck et al. V3 Köppen-Geiger climate classification rasters. It uses OpenLayers with Cloud Optimized GeoTIFFs, no backend, and deploys as Cloudflare Workers Static Assets.

## Requirements

- Node.js 24+
- pnpm 10+
- GDAL 3.1+ command line tools (`gdalinfo`, `gdalwarp`, `gdal_translate`)

## Setup

```bash
pnpm install
pnpm dev
```

The beta repo includes web-ready data in `public/data/`, so GDAL is not required for normal development or static deployment.

The Vite config defaults to `base: '/'` for the custom-domain deployment at `https://koppenmap.com/`. For a non-root static deployment, set `BASE_PATH` when building:

```bash
BASE_PATH=/your-repo-name/ pnpm build
```

## Data Pipeline

The raw archive in `koppen_geiger_tif/` is not committed because it is much larger than the generated web data. If you have the raw archive locally, `pnpm prepare-data` performs three steps:

1. Prints an inventory of every source TIFF and the legend.
2. Reprojects the selected 0.1 degree historical and future scenario rasters to EPSG:3857 and writes COGs in `public/data/cogs/`.
3. Builds `public/data/zones.json` and `public/data/manifest.json`.

The manifest ships these historical periods:

- `1991-2020` default
- `1961-1990`
- `1931-1960`
- `1901-1930`

It also ships future scenario layers for `2041-2070` and `2071-2099`:

- SSP1-1.9
- SSP1-2.6
- SSP2-4.5
- SSP3-7.0
- SSP4-3.4
- SSP4-6.0
- SSP5-8.5

## Data Source And License

Source: <https://www.gloh2o.org/koppen/>

Raw TIFF archives are published with the Scientific Data article on figshare:
<https://doi.org/10.6084/m9.figshare.21789074>

Approximate place names in popups are provided by OpenStreetMap through Nominatim reverse geocoding.

License: Freely use, adapt, and share these maps under CC BY 4.0, with attribution to Beck et al. (2023).

The data and code are provided under the Creative Commons Attribution 4.0 International (CC BY 4.0) license, allowing use, adaptation, and sharing for both commercial and non-commercial purposes. You must properly attribute the source by citing Beck et al. (2023) in any publication that uses the maps.

Beck, H.E., T.R. McVicar, N. Vergopolan, A. Berg, N.J. Lutsko, A. Dufour, Z. Zeng, X. Jiang, A.I.J.M. van Dijk, D.G. Miralles. High-resolution (1 km) Köppen-Geiger maps for 1901-2099 based on constrained CMIP6 projections, Scientific Data 10, 724, doi:10.1038/s41597-023-02549-6 (2023).

## Adding Periods Or Scenarios

Period definitions live in a single file: `scripts/periods.ts`. Add an entry there with the desired `id`, `label`, `kind`, and source path under `koppen_geiger_tif/`, then run `pnpm prepare-data` to regenerate the EPSG:3857 COG and manifest.

Use the existing `0p1` source files unless there is a deliberate reason to ship a heavier layer.

## Deployment

The included GitHub Actions workflow builds the static site and deploys it to Cloudflare Workers Static Assets on pushes to `main`. The production custom domain is `koppenmap.com`, with `www.koppenmap.com` redirected to the apex domain through Cloudflare.

Deployment requires these GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Use a Cloudflare API token scoped to edit Workers for the target account. Add DNS edit permissions only for workflows or operators that will manage custom-domain records or redirect rules through the API.

Before switching production DNS, deploy and validate a Worker preview or `workers.dev` hostname. The critical check is that Cloud Optimized GeoTIFF byte-range requests return `206 Partial Content`, for example:

```bash
curl -sI -H "Range: bytes=0-1023" https://HOST/data/cogs/1991-2020.tif
```

After `koppenmap.com` is verified healthy on Cloudflare, disable the `workers.dev` public hostname to avoid a duplicate indexed host, then decommission GitHub Pages and remove the rollback-only `public/CNAME` file.

If generated COGs remain small, they can be committed directly. If future data pushes the generated assets above roughly 50 MB total, switch to Git LFS or publish data as release assets.

## Future Work

- Split-screen or swipe comparison between periods
- Permalinks for map view and filters
- Aggregate queries by class or region
- Full-resolution 1 km layer
- Animated transitions across historical periods
