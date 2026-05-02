import WebGLTileLayer from 'ol/layer/WebGLTile';
import type { Style } from 'ol/layer/WebGLTile';
import GeoTIFF from 'ol/source/GeoTIFF';
import type { Zone, ZonesByValue } from '@/data/zones';

function colorExpression(zone: Zone, visibleZones: Set<number>): number[] {
  if (!visibleZones.has(zone.value)) {
    return [0, 0, 0, 0];
  }
  return [zone.rgb[0], zone.rgb[1], zone.rgb[2], 1];
}

export function createGeoTiffSource(url: string): GeoTIFF {
  return new GeoTIFF({
    sources: [{ url }],
    normalize: false,
    interpolate: false,
    convertToRGB: false,
    wrapX: true,
  });
}

export function buildClimateStyle(
  zones: ZonesByValue,
  visibleZones: Set<number>,
): Style {
  const expression: unknown[] = ['match', ['band', 1]];
  for (const zone of Object.values(zones).sort((a, b) => a.value - b.value)) {
    expression.push(zone.value, colorExpression(zone, visibleZones));
  }
  expression.push([0, 0, 0, 0]);
  return {
    color: expression,
  } as Style;
}

export function createClimateLayer(
  cogUrl: string,
  zones: ZonesByValue,
  visibleZones: Set<number>,
  opacity: number,
): WebGLTileLayer {
  return new WebGLTileLayer({
    source: createGeoTiffSource(cogUrl),
    style: buildClimateStyle(zones, visibleZones),
    opacity,
  });
}

export function setClimateLayerStyle(
  layer: WebGLTileLayer,
  zones: ZonesByValue,
  visibleZones: Set<number>,
): void {
  layer.setStyle(buildClimateStyle(zones, visibleZones));
}
