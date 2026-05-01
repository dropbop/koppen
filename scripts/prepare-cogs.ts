import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PERIODS } from './periods.ts';

const sourceRoot = 'koppen_geiger_tif';
const outputDir = join('public', 'data', 'cogs');

mkdirSync(outputDir, { recursive: true });

for (const { id, source } of PERIODS) {
  const input = join(sourceRoot, source);
  const output = join(outputDir, `${id}.tif`);

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
      input,
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
