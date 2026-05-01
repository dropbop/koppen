import { toLonLat } from 'ol/proj';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type WebGLTileLayer from 'ol/layer/WebGLTile';
import type { ZonesByValue } from '@/data/zones';

export function readClickedZone(
  event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  layer: WebGLTileLayer,
  zones: ZonesByValue,
): { lon: number; lat: number; classValue: number } | null {
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
  return { lon, lat, classValue };
}
