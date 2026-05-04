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
let activeController: AbortController | null = null;

function abortError(): DOMException {
  return new DOMException('Reverse geocode request was aborted.', 'AbortError');
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw abortError();
  }
}

function waitForGap(ms: number, signal: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      window.clearTimeout(timeout);
      reject(abortError());
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function schedule<T>(
  work: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const result = queue.then(async () => {
    throwIfAborted(signal);
    const wait = Math.max(0, lastDispatch + MIN_REQUEST_GAP_MS - Date.now());
    if (wait > 0) {
      await waitForGap(wait, signal);
    }
    lastDispatch = Date.now();
    return work(signal);
  });
  queue = result.catch(() => undefined);
  return result;
}

function cancelActiveLookup(): void {
  activeController?.abort();
  activeController = null;
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
  cancelActiveLookup();
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const controller = new AbortController();
  activeController = controller;

  return schedule(async (signal) => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    throwIfAborted(signal);

    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'en');

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Nominatim lookup failed: ${response.status}`);
    }

    const placeName = compactPlaceName(
      (await response.json()) as NominatimResponse,
    );
    cache.set(key, placeName);
    return placeName;
  }, controller.signal).finally(() => {
    if (activeController === controller) {
      activeController = null;
    }
  });
}
