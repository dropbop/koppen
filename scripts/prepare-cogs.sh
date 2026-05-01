#!/usr/bin/env bash
set -euo pipefail

mkdir -p public/data/cogs

declare -A PERIODS=(
  ["1901-1930"]="koppen_geiger_tif/1901_1930/koppen_geiger_0p1.tif"
  ["1931-1960"]="koppen_geiger_tif/1931_1960/koppen_geiger_0p1.tif"
  ["1961-1990"]="koppen_geiger_tif/1961_1990/koppen_geiger_0p1.tif"
  ["1991-2020"]="koppen_geiger_tif/1991_2020/koppen_geiger_0p1.tif"
  ["2041-2070-ssp119"]="koppen_geiger_tif/2041_2070/ssp119/koppen_geiger_0p1.tif"
  ["2041-2070-ssp126"]="koppen_geiger_tif/2041_2070/ssp126/koppen_geiger_0p1.tif"
  ["2041-2070-ssp245"]="koppen_geiger_tif/2041_2070/ssp245/koppen_geiger_0p1.tif"
  ["2041-2070-ssp370"]="koppen_geiger_tif/2041_2070/ssp370/koppen_geiger_0p1.tif"
  ["2041-2070-ssp434"]="koppen_geiger_tif/2041_2070/ssp434/koppen_geiger_0p1.tif"
  ["2041-2070-ssp460"]="koppen_geiger_tif/2041_2070/ssp460/koppen_geiger_0p1.tif"
  ["2041-2070-ssp585"]="koppen_geiger_tif/2041_2070/ssp585/koppen_geiger_0p1.tif"
  ["2071-2099-ssp119"]="koppen_geiger_tif/2071_2099/ssp119/koppen_geiger_0p1.tif"
  ["2071-2099-ssp126"]="koppen_geiger_tif/2071_2099/ssp126/koppen_geiger_0p1.tif"
  ["2071-2099-ssp245"]="koppen_geiger_tif/2071_2099/ssp245/koppen_geiger_0p1.tif"
  ["2071-2099-ssp370"]="koppen_geiger_tif/2071_2099/ssp370/koppen_geiger_0p1.tif"
  ["2071-2099-ssp434"]="koppen_geiger_tif/2071_2099/ssp434/koppen_geiger_0p1.tif"
  ["2071-2099-ssp460"]="koppen_geiger_tif/2071_2099/ssp460/koppen_geiger_0p1.tif"
  ["2071-2099-ssp585"]="koppen_geiger_tif/2071_2099/ssp585/koppen_geiger_0p1.tif"
)

PERIOD_ORDER=(
  1901-1930
  1931-1960
  1961-1990
  1991-2020
  2041-2070-ssp119
  2041-2070-ssp126
  2041-2070-ssp245
  2041-2070-ssp370
  2041-2070-ssp434
  2041-2070-ssp460
  2041-2070-ssp585
  2071-2099-ssp119
  2071-2099-ssp126
  2071-2099-ssp245
  2071-2099-ssp370
  2071-2099-ssp434
  2071-2099-ssp460
  2071-2099-ssp585
)

for period_id in "${PERIOD_ORDER[@]}"; do
  input="${PERIODS[$period_id]}"
  output="public/data/cogs/${period_id}.tif"

  echo "Preparing ${output}"
  gdal_translate \
    -of COG \
    -co COMPRESS=LZW \
    -co PREDICTOR=2 \
    -co BLOCKSIZE=512 \
    -co OVERVIEWS=AUTO \
    "$input" \
    "$output"

  image_structure="$(gdalinfo -mdd IMAGE_STRUCTURE "$output")"
  if [[ "$image_structure" != *"LAYOUT=COG"* ]]; then
    echo "Expected ${output} to be a valid COG, but LAYOUT=COG was not reported." >&2
    exit 1
  fi
done

echo "COG conversion complete."
