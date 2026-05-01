export type Rgb = [number, number, number];

export type Zone = {
  value: number;
  code: string;
  rgb: Rgb;
  name: string;
  group: string;
  groupCode: string;
  groupDescription: string;
  description: string;
  examples: string;
};

export type ZonesByValue = Record<string, Zone>;

export type ManifestPeriod = {
  id: string;
  label: string;
  kind: 'historical' | 'scenario';
  cog: string;
};

export type Manifest = {
  defaultPeriod: string;
  periods: ManifestPeriod[];
};

const baseUrl = import.meta.env.BASE_URL;

function assetUrl(path: string): string {
  return `${baseUrl}${path}`.replace(/\/{2,}/g, '/');
}

export function resolveAssetUrl(path: string): string {
  return assetUrl(path);
}

export async function loadAppData(): Promise<{
  manifest: Manifest;
  zones: ZonesByValue;
}> {
  const [manifestResponse, zonesResponse] = await Promise.all([
    fetch(assetUrl('data/manifest.json')),
    fetch(assetUrl('data/zones.json')),
  ]);

  if (!manifestResponse.ok) {
    throw new Error(`Failed to load manifest.json: ${manifestResponse.status}`);
  }
  if (!zonesResponse.ok) {
    throw new Error(`Failed to load zones.json: ${zonesResponse.status}`);
  }

  const manifest = (await manifestResponse.json()) as Manifest;
  const zones = (await zonesResponse.json()) as ZonesByValue;
  return { manifest, zones };
}

export function zoneList(zones: ZonesByValue): Zone[] {
  return Object.values(zones).sort((a, b) => a.value - b.value);
}
