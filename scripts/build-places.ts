import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Inputs are unmodified GeoNames dump files from
// https://download.geonames.org/export/dump/ (cities500.zip and AQ.zip,
// unzipped, plus admin1CodesASCII.txt). They are not committed; only the
// output is.
const sourceDir = 'geonames';
const citiesPath = join(sourceDir, 'cities500.txt');
const antarcticaPath = join(sourceDir, 'AQ.txt');
const admin1Path = join(sourceDir, 'admin1CodesASCII.txt');
const outputPath = join('public', 'data', 'places.json');

// Every town big enough to be recognizable, plus capitals.
const MIN_POPULATION = 15000;
const ALWAYS_KEEP_FEATURES = new Set(['PPLC', 'PPLA']);
// Where none of those exist, keep the largest place in each cell of roughly
// this size so sparse areas (Siberia, the Sahara, the Canadian Arctic) still
// get a nearby name without loading every village in Europe.
const GAP_CELL_DEGREES = 1;
// Sections of a larger city ("Manhattan", "Shibuya") read as noise next to
// the city itself; historical, abandoned, and destroyed places are not useful
// landmarks.
const SKIP_FEATURES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);
// Research stations are the only named settlements in Antarctica.
const ANTARCTIC_STATION_FEATURE = 'STNB';
const COORD_SCALE = 100;

type Place = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  region: string;
};

type GeoNamesRow = {
  name: string;
  lat: number;
  lon: number;
  featureCode: string;
  country: string;
  admin1: string;
  population: number;
};

// Column layout: https://download.geonames.org/export/dump/readme.txt
function readGeoNames(path: string): GeoNamesRow[] {
  const rows: GeoNamesRow[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const columns = line.split('\t');
    if (columns.length < 15) {
      continue;
    }
    rows.push({
      name: columns[1],
      lat: Number(columns[4]),
      lon: Number(columns[5]),
      featureCode: columns[7],
      country: columns[8],
      admin1: columns[10],
      population: Number(columns[14] || 0),
    });
  }
  return rows;
}

// Cells widen toward the poles so they cover a similar ground distance.
function gapCell(row: GeoNamesRow): string {
  const lonDegrees =
    GAP_CELL_DEGREES / Math.max(Math.cos((row.lat * Math.PI) / 180), 0.2);
  return `${Math.floor(row.lat / GAP_CELL_DEGREES)}:${Math.floor(row.lon / lonDegrees)}`;
}

function selectCities(rows: GeoNamesRow[]): GeoNamesRow[] {
  const candidates = rows.filter((row) => !SKIP_FEATURES.has(row.featureCode));
  const selected = candidates.filter(
    (row) =>
      row.population >= MIN_POPULATION ||
      ALWAYS_KEEP_FEATURES.has(row.featureCode),
  );
  const coveredCells = new Set(selected.map(gapCell));
  const largestInGap = new Map<string, GeoNamesRow>();
  for (const row of candidates) {
    const cell = gapCell(row);
    if (coveredCells.has(cell)) {
      continue;
    }
    const current = largestInGap.get(cell);
    if (!current || row.population > current.population) {
      largestInGap.set(cell, row);
    }
  }
  return dropCityDistricts([...selected, ...largestInGap.values()]);
}

// Numbered city districts ("Paris 04 Hôtel-de-Ville", "Marseille 09") are
// listed as separate towns; prefer the city they belong to.
const DISTRICT_NAME = /^(.+?) [\d(]/;
const DISTRICT_MAX_KM = 25;

function dropCityDistricts(rows: GeoNamesRow[]): GeoNamesRow[] {
  const byName = new Map<string, GeoNamesRow[]>();
  for (const row of rows) {
    byName.set(row.name, [...(byName.get(row.name) ?? []), row]);
  }
  return rows.filter((row) => {
    const parentName = DISTRICT_NAME.exec(row.name)?.[1];
    const parents = parentName ? (byName.get(parentName) ?? []) : [];
    return !parents.some((parent) => approxKm(parent, row) <= DISTRICT_MAX_KM);
  });
}

function approxKm(a: GeoNamesRow, b: GeoNamesRow): number {
  const kmPerDegree = 111.2;
  const dLat = a.lat - b.lat;
  const dLon = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon) * kmPerDegree;
}

function toPlace(row: GeoNamesRow, admin1: Map<string, string>): Place {
  return {
    name: row.name,
    lat: Math.round(row.lat * COORD_SCALE),
    lon: Math.round(row.lon * COORD_SCALE),
    country: row.country,
    region: admin1.get(`${row.country}.${row.admin1}`) ?? '',
  };
}

function readAdmin1(path: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const [code, name] = line.split('\t');
    if (code && name) {
      names.set(code, name);
    }
  }
  return names;
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const admin1 = readAdmin1(admin1Path);
const stations = readGeoNames(antarcticaPath).filter(
  (row) => row.featureCode === ANTARCTIC_STATION_FEATURE,
);
const places = [...selectCities(readGeoNames(citiesPath)), ...stations].map(
  (row) => toPlace(row, admin1),
);
places.sort(
  (a, b) =>
    a.country.localeCompare(b.country) ||
    a.region.localeCompare(b.region) ||
    a.lat - b.lat ||
    a.lon - b.lon,
);

// Places are grouped into consecutive runs per region so each place does not
// repeat its region, and coordinates are delta-encoded to compress well.
const regions: [string, string, number][] = [];
const coords: number[] = [];
let previousLat = 0;
let previousLon = 0;
for (const place of places) {
  const last = regions.at(-1);
  const country = countryName(place.country);
  if (last && last[0] === country && last[1] === place.region) {
    last[2] += 1;
  } else {
    regions.push([country, place.region, 1]);
  }
  coords.push(place.lat - previousLat, place.lon - previousLon);
  previousLat = place.lat;
  previousLon = place.lon;
}

const output = {
  attribution: 'GeoNames (geonames.org), CC BY 4.0',
  coordScale: COORD_SCALE,
  regions,
  names: places.map((place) => place.name).join('\n'),
  coords,
};

mkdirSync(join('public', 'data'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output)}\n`);

console.log(`Wrote ${places.length} places to ${outputPath}`);
