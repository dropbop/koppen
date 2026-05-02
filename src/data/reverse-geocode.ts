type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  locality?: string;
  county?: string;
  state?: string;
  country?: string;
};

type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

const cache = new Map<string, string | null>();
// Nominatim usage policy asks clients to stay at or below one request per second.
const MIN_REQUEST_GAP_MS = 1100;

let queue: Promise<unknown> = Promise.resolve();
let lastDispatch = 0;

function schedule<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const wait = Math.max(0, lastDispatch + MIN_REQUEST_GAP_MS - Date.now());
    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    lastDispatch = Date.now();
    return work();
  });
  queue = result.catch(() => undefined);
  return result;
}

function cacheKey(lon: number, lat: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function compactPlaceName(response: NominatimResponse): string | null {
  const address = response.address;
  if (address) {
    const localName =
      address.city ??
      address.town ??
      address.village ??
      address.hamlet ??
      address.municipality ??
      address.locality ??
      address.county ??
      address.state;
    const region =
      address.state && address.state !== localName ? address.state : undefined;
    const parts = [localName, region, address.country].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  if (!response.display_name) {
    return null;
  }

  return response.display_name
    .split(',')
    .slice(0, 3)
    .map((part) => part.trim())
    .join(', ');
}

export async function reverseGeocode(
  lon: number,
  lat: number,
): Promise<string | null> {
  const key = cacheKey(lon, lat);
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  return schedule(async () => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'en');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Nominatim lookup failed: ${response.status}`);
    }

    const placeName = compactPlaceName(
      (await response.json()) as NominatimResponse,
    );
    cache.set(key, placeName);
    return placeName;
  });
}
