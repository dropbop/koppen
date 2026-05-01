import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type GdalInfo = {
  size: [number, number];
  coordinateSystem?: {
    wkt?: string;
    dataAxisToSRSAxisMapping?: number[];
  };
  geoTransform?: [number, number, number, number, number, number];
};

const dataRoot = 'koppen_geiger_tif';

function findTifs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return findTifs(path);
    }
    return entry.isFile() && entry.name.toLowerCase().endsWith('.tif')
      ? [path]
      : [];
  });
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function projection(info: GdalInfo): string {
  const wkt = info.coordinateSystem?.wkt ?? '';
  const id = wkt.match(/ID\["EPSG",(\d+)\]/);
  if (id) {
    return `EPSG:${id[1]}`;
  }
  const name = wkt.match(/^(\w+)\["([^"]+)"/);
  return name?.[2] ?? 'unknown';
}

function inspectTif(path: string): string {
  const json = execFileSync('gdalinfo', ['-json', path], { encoding: 'utf8' });
  const info = JSON.parse(json) as GdalInfo;
  const [width, height] = info.size;
  const transform = info.geoTransform;
  const pixelSize = transform ? `${transform[1]}, ${transform[5]}` : 'unknown';
  const fileSize = formatBytes(statSync(path).size);
  return [
    relative('.', path),
    `  size: ${width} x ${height}`,
    `  pixel size: ${pixelSize}`,
    `  projection: ${projection(info)}`,
    `  file size: ${fileSize}`,
  ].join('\n');
}

const tifs = findTifs(dataRoot).sort();

console.log(`# GeoTIFF Inventory\n`);
console.log(`Found ${tifs.length} .tif files in ${dataRoot}.\n`);
for (const tif of tifs) {
  console.log(inspectTif(tif));
  console.log('');
}

console.log('# Legend\n');
console.log(readFileSync(join(dataRoot, 'legend.txt'), 'utf8'));
