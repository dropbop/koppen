import { toLonLat } from 'ol/proj';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type WebGLTileLayer from 'ol/layer/WebGLTile';
import type { ZonesByValue } from '@/data/zones';
import { zoneByRgb } from '@/data/zones';

type PixelData = Uint8ClampedArray | Uint8Array | Float32Array | DataView;

function dataLength(data: PixelData): number {
  return data instanceof DataView ? data.byteLength : data.length;
}

function dataValue(data: PixelData, index: number): number {
  return data instanceof DataView ? data.getUint8(index) : Number(data[index]);
}

export function readClickedZone(
  event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  layer: WebGLTileLayer,
  zones: ZonesByValue,
): { lon: number; lat: number; classValue: number } | null {
  const data = layer.getData(event.pixel) as PixelData | null;
  if (!data || dataLength(data) === 0) {
    return null;
  }

  let classValue = dataValue(data, 0);
  if (!zones[String(classValue)] && dataLength(data) >= 3) {
    const zone = zoneByRgb(zones, [
      dataValue(data, 0),
      dataValue(data, 1),
      dataValue(data, 2),
    ]);
    classValue = zone?.value ?? 0;
  }

  if (!zones[String(classValue)]) {
    return null;
  }

  const [lon, lat] = toLonLat(event.coordinate);
  return { lon, lat, classValue };
}
