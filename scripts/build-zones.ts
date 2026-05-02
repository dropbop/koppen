import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PERIOD, PERIODS } from './periods.ts';

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

const manifest = {
  defaultPeriod: DEFAULT_PERIOD,
  periods: PERIODS.map(({ id, label, kind }) => ({
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
