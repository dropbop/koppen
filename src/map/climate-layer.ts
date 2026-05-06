import WebGLTileLayer from 'ol/layer/WebGLTile';
import type { Style } from 'ol/layer/WebGLTile';
import GeoTIFF from 'ol/source/GeoTIFF';
import type { ZonesByValue } from '@/data/zones';

function variableName(value: number): string {
  return `z${value}`;
}

function buildStyleVariables(
  zones: ZonesByValue,
  visibleZones: Set<number>,
): Record<string, number> {
  const variables: Record<string, number> = {};
  for (const zone of Object.values(zones)) {
    variables[variableName(zone.value)] = visibleZones.has(zone.value) ? 1 : 0;
  }
  return variables;
}

function buildClimateStyle(
  zones: ZonesByValue,
  visibleZones: Set<number>,
): Style {
  const expression: unknown[] = ['match', ['band', 1]];
  for (const zone of Object.values(zones).sort((a, b) => a.value - b.value)) {
    const [r, g, b] = zone.rgb;
    expression.push(zone.value, [
      'array',
      r / 255,
      g / 255,
      b / 255,
      ['var', variableName(zone.value)],
    ]);
  }
  expression.push(['array', 0, 0, 0, 0]);
  // OpenLayers accepts runtime expression arrays here, but its Style type does
  // not model this match expression shape precisely.
  return {
    color: expression,
    variables: buildStyleVariables(zones, visibleZones),
  } as Style;
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

export function applyZoneVisibility(
  layer: WebGLTileLayer,
  zones: ZonesByValue,
  visibleZones: Set<number>,
): void {
  layer.updateStyleVariables(buildStyleVariables(zones, visibleZones));
}
