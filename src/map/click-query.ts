import { toLonLat } from 'ol/proj';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type WebGLTileLayer from 'ol/layer/WebGLTile';
import type { ZonesByValue } from '@/data/zones';

function normalizeLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

export function readClickedZone(
  event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  layer: WebGLTileLayer,
  zones: ZonesByValue,
): {
  lon: number;
  lat: number;
  coordinate: [number, number];
  classValue: number;
} | null {
  const data = layer.getData(event.pixel);
  if (!data) {
    return null;
  }

  const classValue =
    data instanceof DataView ? data.getUint8(0) : Number(data[0]);
  if (!zones[String(classValue)]) {
    return null;
  }

  const [lon, lat] = toLonLat(event.coordinate);
  return {
    lon: normalizeLongitude(lon),
    lat,
    coordinate: [event.coordinate[0], event.coordinate[1]],
    classValue,
  };
}
