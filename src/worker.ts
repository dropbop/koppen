type AssetBinding = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type Env = {
  ASSETS: AssetBinding;
};

type ByteRange = {
  start: number;
  end: number;
  length: number;
};

const COG_PATH_PREFIX = '/data/cogs/';
const COG_CACHE_CONTROL = 'public, max-age=86400, must-revalidate';
const CANONICAL_HOST = 'koppenmap.com';
const WWW_HOST = 'www.koppenmap.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === WWW_HOST) {
      return redirectToCanonicalHost(url);
    }

    if (url.pathname.startsWith(COG_PATH_PREFIX)) {
      return serveCog(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
};

function redirectToCanonicalHost(url: URL): Response {
  url.protocol = 'https:';
  url.hostname = CANONICAL_HOST;
  return Response.redirect(url.toString(), 301);
}

async function serveCog(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD',
      },
    });
  }

  if (!isCogPath(url)) {
    return new Response('Not Found', { status: 404 });
  }

  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    return serveCogRange(request, env, url, rangeHeader);
  }

  const response = await env.ASSETS.fetch(request);
  return withCogHeaders(response);
}

async function serveCogRange(
  request: Request,
  env: Env,
  url: URL,
  rangeHeader: string,
): Promise<Response> {
  const asset = await fetchCogAsset(env, url);
  if (!asset.ok) {
    return asset;
  }

  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const range = parseByteRange(rangeHeader, size);
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${size}`,
      },
    });
  }

  const headers = createCogHeaders(asset.headers);
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.length));

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 206,
      headers,
    });
  }

  return new Response(body.slice(range.start, range.end + 1), {
    status: 206,
    headers,
  });
}

function isCogPath(url: URL): boolean {
  const key = decodeURIComponent(url.pathname.slice(COG_PATH_PREFIX.length));
  return /^[0-9]{4}-[0-9]{4}(?:-ssp[0-9]{3})?\.tif$/.test(key);
}

function createCogHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', COG_CACHE_CONTROL);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'image/tiff');
  headers.delete('Content-Encoding');
  return headers;
}

function withCogHeaders(response: Response): Response {
  const headers = createCogHeaders(response.headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function fetchCogAsset(env: Env, url: URL): Promise<Response> {
  return env.ASSETS.fetch(
    new Request(url, {
      method: 'GET',
    }),
  );
}

function parseByteRange(value: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || size < 1) {
    return null;
  }

  const [, startText, endText] = match;
  if (!startText && !endText) {
    return null;
  }

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) {
      return null;
    }

    const length = Math.min(suffixLength, size);
    const start = size - length;
    return {
      start,
      end: size - 1,
      length,
    };
  }

  const start = Number(startText);
  if (!Number.isSafeInteger(start) || start >= size) {
    return null;
  }

  const requestedEnd = endText ? Number(endText) : size - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
    return null;
  }

  const end = Math.min(requestedEnd, size - 1);
  return {
    start,
    end,
    length: end - start + 1,
  };
}
