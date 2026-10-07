import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Inputs are unmodified GeoNames dump files from
// https://download.geonames.org/export/dump/ (cities5000.zip, unzipped, and
// admin1CodesASCII.txt). They are not committed; only the output is.
const sourceDir = 'geonames';
const citiesPath = join(sourceDir, 'cities5000.txt');
const admin1Path = join(sourceDir, 'admin1CodesASCII.txt');
const outputPath = join('public', 'data', 'places.json');

// Keep towns big enough to be recognizable, plus regional seats so sparse
// areas (Alaska, Siberia, the Australian interior) still have a nearby name.
const MIN_POPULATION = 15000;
const ALWAYS_KEEP_FEATURES = new Set(['PPLC', 'PPLA', 'PPLA2']);
// Sections of a larger city ("Manhattan", "Shibuya") read as noise next to
// the city itself.
const SKIP_FEATURES = new Set(['PPLX']);
const COORD_SCALE = 100;

type Place = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  region: string;
};

// Column layout: https://download.geonames.org/export/dump/readme.txt
function readCities(path: string, admin1: Map<string, string>): Place[] {
  const places: Place[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) {
      continue;
    }
    const columns = line.split('\t');
    const featureCode = columns[7];
    const population = Number(columns[14] || 0);
    if (SKIP_FEATURES.has(featureCode)) {
      continue;
    }
    if (population < MIN_POPULATION && !ALWAYS_KEEP_FEATURES.has(featureCode)) {
      continue;
    }
    const country = columns[8];
    places.push({
      name: columns[1],
      lat: Math.round(Number(columns[4]) * COORD_SCALE),
      lon: Math.round(Number(columns[5]) * COORD_SCALE),
      country,
      region: admin1.get(`${country}.${columns[10]}`) ?? '',
    });
  }
  return places;
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

const places = readCities(citiesPath, readAdmin1(admin1Path));
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
