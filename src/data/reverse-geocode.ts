import { resolveAssetUrl } from '@/data/zones';

// Shape written by scripts/build-places.ts.
type PlacesFile = {
  coordScale: number;
  regions: [country: string, region: string, count: number][];
  names: string;
  coords: number[];
};

export type PlaceIndex = {
  nearest(lon: number, lat: number): string | null;
};

// Inside this distance the click is treated as "in" the town.
const NEAR_KM = 15;
// Past this distance a town name says more about the town than the click.
const MAX_KM = 300;
const EARTH_RADIUS_KM = 6371;
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

let loaded: PlaceIndex | null = null;
let loading: Promise<PlaceIndex> | null = null;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function wrapLonDelta(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(wrapLonDelta(lon2 - lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function compassDirection(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): string {
  const phi1 = toRadians(fromLat);
  const phi2 = toRadians(toLat);
  const dLon = toRadians(wrapLonDelta(toLon - fromLon));
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return COMPASS[Math.round((bearing + 360) / 45) % COMPASS.length];
}

function roundDistance(km: number): number {
  return km < 100 ? Math.round(km / 5) * 5 : Math.round(km / 10) * 10;
}

function buildIndex(file: PlacesFile): PlaceIndex {
  const names = file.names.split('\n');
  const count = names.length;
  const lats = new Float64Array(count);
  const lons = new Float64Array(count);
  const labels = new Array<string>(count);

  let lat = 0;
  let lon = 0;
  let i = 0;
  for (const [country, region, regionCount] of file.regions) {
    for (let end = i + regionCount; i < end; i += 1) {
      lat += file.coords[i * 2];
      lon += file.coords[i * 2 + 1];
      lats[i] = lat / file.coordScale;
      lons[i] = lon / file.coordScale;
      labels[i] = [...new Set([names[i], region, country])]
        .filter(Boolean)
        .join(', ');
    }
  }

  return {
    nearest(queryLon: number, queryLat: number): string | null {
      // A flat-earth distance is enough to rank ~30k candidates; the winner
      // gets a proper great-circle distance below.
      const lonScale = Math.cos(toRadians(queryLat)) ** 2;
      let best = -1;
      let bestScore = Infinity;
      for (let j = 0; j < count; j += 1) {
        const dLat = lats[j] - queryLat;
        const dLon = wrapLonDelta(lons[j] - queryLon);
        const score = dLat * dLat + dLon * dLon * lonScale;
        if (score < bestScore) {
          bestScore = score;
          best = j;
        }
      }
      if (best < 0) {
        return null;
      }

      const km = haversineKm(lats[best], lons[best], queryLat, queryLon);
      if (km > MAX_KM) {
        return null;
      }
      if (km <= NEAR_KM) {
        return labels[best];
      }
      const direction = compassDirection(
        lats[best],
        lons[best],
        queryLat,
        queryLon,
      );
      return `~${roundDistance(km)} km ${direction} of ${labels[best]}`;
    },
  };
}

export function getLoadedPlaces(): PlaceIndex | null {
  return loaded;
}

export function loadPlaces(): Promise<PlaceIndex> {
  if (loaded) {
    return Promise.resolve(loaded);
  }
  if (!loading) {
    loading = fetch(resolveAssetUrl('data/places.json'))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load places.json: ${response.status}`);
        }
        loaded = buildIndex((await response.json()) as PlacesFile);
        return loaded;
      })
      .finally(() => {
        // Clear on failure too, so a later click can retry.
        loading = null;
      });
  }
  return loading;
}
