import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Rgb = [number, number, number];

type ZoneDescription = {
  name: string;
  group: string;
  groupCode: string;
  groupDescription: string;
  description: string;
  examples: string;
};

type LegendZone = {
  value: number;
  code: string;
  rgb: Rgb;
};

const legendPath = join('koppen_geiger_tif', 'legend.txt');
const descriptionsPath = join('data', 'zone-descriptions.json');
const outputDir = join('public', 'data');

function parseLegend(text: string): LegendZone[] {
  const linePattern =
    /^\s*(\d+):\s+([A-Z][A-Za-z]{0,2})\s+.+\[(\d+)\s+(\d+)\s+(\d+)\]\s*$/gm;
  const zones: LegendZone[] = [];
  for (const match of text.matchAll(linePattern)) {
    zones.push({
      value: Number(match[1]),
      code: match[2],
      rgb: [Number(match[3]), Number(match[4]), Number(match[5])],
    });
  }
  return zones;
}

const legendZones = parseLegend(readFileSync(legendPath, 'utf8'));
const descriptions = JSON.parse(
  readFileSync(descriptionsPath, 'utf8'),
) as Record<string, ZoneDescription>;

const missingDescriptions = legendZones
  .filter((zone) => !descriptions[zone.code])
  .map((zone) => zone.code);

if (missingDescriptions.length > 0) {
  throw new Error(
    `Missing descriptions for: ${missingDescriptions.join(', ')}`,
  );
}

const zones = Object.fromEntries(
  legendZones.map((zone) => [
    String(zone.value),
    {
      ...zone,
      ...descriptions[zone.code],
    },
  ]),
);

const periodEntries = [
  ['1991-2020', '1991-2020', 'historical'],
  ['1961-1990', '1961-1990', 'historical'],
  ['1931-1960', '1931-1960', 'historical'],
  ['1901-1930', '1901-1930', 'historical'],
  ['2041-2070-ssp119', '2041-2070 SSP1-1.9', 'scenario'],
  ['2041-2070-ssp126', '2041-2070 SSP1-2.6', 'scenario'],
  ['2041-2070-ssp245', '2041-2070 SSP2-4.5', 'scenario'],
  ['2041-2070-ssp370', '2041-2070 SSP3-7.0', 'scenario'],
  ['2041-2070-ssp434', '2041-2070 SSP4-3.4', 'scenario'],
  ['2041-2070-ssp460', '2041-2070 SSP4-6.0', 'scenario'],
  ['2041-2070-ssp585', '2041-2070 SSP5-8.5', 'scenario'],
  ['2071-2099-ssp119', '2071-2099 SSP1-1.9', 'scenario'],
  ['2071-2099-ssp126', '2071-2099 SSP1-2.6', 'scenario'],
  ['2071-2099-ssp245', '2071-2099 SSP2-4.5', 'scenario'],
  ['2071-2099-ssp370', '2071-2099 SSP3-7.0', 'scenario'],
  ['2071-2099-ssp434', '2071-2099 SSP4-3.4', 'scenario'],
  ['2071-2099-ssp460', '2071-2099 SSP4-6.0', 'scenario'],
  ['2071-2099-ssp585', '2071-2099 SSP5-8.5', 'scenario'],
] as const;

const manifest = {
  defaultPeriod: '1991-2020',
  periods: periodEntries.map(([id, label, kind]) => ({
    id,
    label,
    kind,
    cog: `data/cogs/${id}.tif`,
  })),
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  join(outputDir, 'zones.json'),
  `${JSON.stringify(zones, null, 2)}\n`,
);
writeFileSync(
  join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Wrote ${legendZones.length} zones to public/data/zones.json`);
console.log(
  `Wrote ${manifest.periods.length} periods to public/data/manifest.json`,
);
