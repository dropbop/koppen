import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PERIODS } from './periods.ts';

const sourceRoot = 'koppen_geiger_tif';
const outputDir = join('public', 'data', 'cogs');
const webMercatorExtent = [
  '-20037508.342789244',
  '-20037508.342789244',
  '20037508.342789244',
  '20037508.342789244',
];
const webMercatorSize = '4096';

mkdirSync(outputDir, { recursive: true });

for (const { id, source } of PERIODS) {
  const input = join(sourceRoot, source);
  const output = join(outputDir, `${id}.tif`);
  const reprojected = join(outputDir, `${id}.tmp-3857.tif`);

  console.log(`Preparing ${output}`);
  rmSync(reprojected, { force: true });

  try {
    execFileSync(
      'gdalwarp',
      [
        '-overwrite',
        '-t_srs',
        'EPSG:3857',
        '-te',
        ...webMercatorExtent,
        '-ts',
        webMercatorSize,
        webMercatorSize,
        '-r',
        'near',
        '-srcnodata',
        '0',
        '-dstnodata',
        '0',
        '-ot',
        'Byte',
        '-co',
        'TILED=YES',
        '-co',
        'COMPRESS=LZW',
        '-co',
        'PREDICTOR=2',
        '-co',
        'BLOCKXSIZE=512',
        '-co',
        'BLOCKYSIZE=512',
        input,
        reprojected,
      ],
      { stdio: 'inherit' },
    );

    rmSync(output, { force: true });
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
        '-co',
        'RESAMPLING=NEAREST',
        reprojected,
        output,
      ],
      { stdio: 'inherit' },
    );
  } finally {
    rmSync(reprojected, { force: true });
  }

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

console.log('EPSG:3857 COG conversion complete.');
