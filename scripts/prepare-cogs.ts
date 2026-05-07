import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PERIODS } from './periods.ts';

const sourceRoot = 'koppen_geiger_tif';
const outputDir = join('public', 'data', 'cogs');

// Full Web Mercator world extent in meters. Using meters (not degrees) keeps
// pixel edges aligned with OpenLayers' default global EPSG:3857 tile grid; if
// alignment drifts, OL resamples on read and undoes the optimization.
const WEB_MERCATOR_HALF_EXTENT_M = 20037508.342789244;

mkdirSync(outputDir, { recursive: true });

const tempDir = mkdtempSync(join(tmpdir(), 'koppen-cogs-'));

try {
  for (const { id, source } of PERIODS) {
    const input = join(sourceRoot, source);
    const warped = join(tempDir, `${id}.warped.tif`);
    const output = join(outputDir, `${id}.tif`);

    console.log(`Reprojecting ${input} -> ${warped}`);
    execFileSync(
      'gdalwarp',
      [
        '-t_srs',
        'EPSG:3857',
        '-te',
        String(-WEB_MERCATOR_HALF_EXTENT_M),
        String(-WEB_MERCATOR_HALF_EXTENT_M),
        String(WEB_MERCATOR_HALF_EXTENT_M),
        String(WEB_MERCATOR_HALF_EXTENT_M),
        '-te_srs',
        'EPSG:3857',
        '-tr',
        '4000',
        '4000',
        // Nearest neighbor is mandatory: these are categorical class IDs and
        // any interpolation invents fractional class numbers that break the
        // match expression in src/map/climate-layer.ts.
        '-r',
        'near',
        '-dstnodata',
        '0',
        '-wo',
        'NUM_THREADS=ALL_CPUS',
        '-multi',
        '-co',
        'TILED=YES',
        '-co',
        'COMPRESS=LZW',
        '-overwrite',
        input,
        warped,
      ],
      { stdio: 'inherit' },
    );

    console.log(`Preparing ${output}`);
    execFileSync(
      'gdal_translate',
      [
        '-of',
        'COG',
        '-co',
        'COMPRESS=LZW',
        '-co',
        'PREDICTOR=2',
        '-co',
        'BLOCKSIZE=512',
        '-co',
        'OVERVIEWS=AUTO',
        warped,
        output,
      ],
      { stdio: 'inherit' },
    );

    const info = execFileSync(
      'gdalinfo',
      ['-mdd', 'IMAGE_STRUCTURE', output],
      { encoding: 'utf8' },
    );
    if (!info.includes('LAYOUT=COG')) {
      console.error(
        `Expected ${output} to be a valid COG, but LAYOUT=COG was not reported.`,
      );
      process.exit(1);
    }
  }

  console.log('COG conversion complete.');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
