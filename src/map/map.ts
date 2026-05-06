import Map from 'ol/Map';
import View from 'ol/View';
import { unByKey } from 'ol/Observable';
import { defaults as defaultControls } from 'ol/control/defaults';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import { fromLonLat } from 'ol/proj';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import type Source from 'ol/source/Source';
import type WebGLTileLayer from 'ol/layer/WebGLTile';
import { MAX_MAP_PIXEL_RATIO } from '@/config';
import type { Basemap } from '@/state';
import { getState, setState, subscribe } from '@/state';
import type { Manifest, ZonesByValue } from '@/data/zones';
import { resolveAssetUrl } from '@/data/zones';
import { reverseGeocode } from '@/data/reverse-geocode';
import { createBasemapLayers } from './basemaps';
import {
  createClimateLayer,
  createGeoTiffSource,
  setClimateLayerStyle,
} from './climate-layer';
import { createClickMarkerLayer, setClickMarker } from './click-marker';
import { readClickedZone } from './click-query';

export function whenSourceReady(source: Source): Promise<void> {
  const initial = source.getState();
  if (initial === 'ready') {
    return Promise.resolve();
  }
  if (initial === 'error') {
    return Promise.reject(new Error('GeoTIFF source failed to load'));
  }
  return new Promise<void>((resolve, reject) => {
    const key = source.on('change', () => {
      const next = source.getState();
      if (next === 'ready') {
        unByKey(key);
        resolve();
      } else if (next === 'error') {
        unByKey(key);
        reject(new Error('GeoTIFF source failed to load'));
      }
    });
  });
}

export type MapController = {
  map: Map;
  climateLayer: WebGLTileLayer;
};

function cogForPeriod(manifest: Manifest, periodId: string): string {
  const period = manifest.periods.find(
    (candidate) => candidate.id === periodId,
  );
  if (!period) {
    throw new Error(`Unknown period: ${periodId}`);
  }
  return resolveAssetUrl(period.cog);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function showPopupForClick(
  event: MapBrowserEvent<PointerEvent | KeyboardEvent | WheelEvent>,
  climateLayer: WebGLTileLayer,
  zones: ZonesByValue,
): void {
  const result = readClickedZone(event, climateLayer, zones);
  if (!result) {
    setState({ popup: null });
    return;
  }

  setState({ popup: { ...result, placeStatus: 'loading' } });
  void reverseGeocode(result.lon, result.lat)
    .then((placeName) => {
      const currentPopup = getState().popup;
      if (
        !currentPopup ||
        currentPopup.lon !== result.lon ||
        currentPopup.lat !== result.lat ||
        currentPopup.classValue !== result.classValue
      ) {
        return;
      }
      setState({
        popup: {
          ...currentPopup,
          placeName: placeName ?? undefined,
          placeStatus: 'ready',
        },
      });
    })
    .catch((error: unknown) => {
      if (isAbortError(error)) {
        return;
      }
      const currentPopup = getState().popup;
      if (
        !currentPopup ||
        currentPopup.lon !== result.lon ||
        currentPopup.lat !== result.lat ||
        currentPopup.classValue !== result.classValue
      ) {
        return;
      }
      setState({ popup: { ...currentPopup, placeStatus: 'error' } });
    });
}

export function mountMap(
  target: HTMLElement,
  manifest: Manifest,
  zones: ZonesByValue,
): MapController {
  const basemaps = createBasemapLayers();
  const initialVisibleZones = new Set(
    Object.values(zones).map((zone) => zone.value),
  );
  const climateLayer = createClimateLayer(
    cogForPeriod(manifest, manifest.defaultPeriod),
    zones,
    initialVisibleZones,
    getState().opacity,
  );
  const clickMarkerLayer = createClickMarkerLayer();
  let renderedPeriod = manifest.defaultPeriod;
  let renderedVisibleZones = initialVisibleZones;
  let renderedMarkerCoord: [number, number] | null = null;

  const map = new Map({
    target,
    pixelRatio: Math.min(window.devicePixelRatio, MAX_MAP_PIXEL_RATIO),
    layers: [basemaps.plain, basemaps.satellite, climateLayer, clickMarkerLayer],
    controls: defaultControls(),
    interactions: defaultInteractions({
      altShiftDragRotate: false,
      pinchRotate: false,
    }),
    view: new View({
      center: fromLonLat([0, 18]),
      zoom: 2,
      minZoom: 1.4,
      maxZoom: 9,
      enableRotation: false,
    }),
  });

  map.on('click', (event) => {
    showPopupForClick(event, climateLayer, zones);
  });

  map.on('dblclick', () => {
    setState({ popup: null });
  });

  subscribe((state) => {
    basemaps.plain.setVisible(state.basemap === 'plain');
    basemaps.satellite.setVisible(state.basemap === 'satellite');
    climateLayer.setOpacity(state.opacity);

    if (state.visibleZones !== renderedVisibleZones) {
      setClimateLayerStyle(climateLayer, zones, state.visibleZones);
      renderedVisibleZones = state.visibleZones;
    }

    const nextCoord = state.popup?.coordinate ?? null;
    if (nextCoord !== renderedMarkerCoord) {
      setClickMarker(clickMarkerLayer, nextCoord);
      renderedMarkerCoord = nextCoord;
    }

    if (state.period && state.period !== renderedPeriod) {
      const targetPeriod = state.period;
      renderedPeriod = targetPeriod;
      const nextSource = createGeoTiffSource(
        cogForPeriod(manifest, targetPeriod),
      );
      climateLayer.setSource(nextSource);
      setState({ loading: true });
      whenSourceReady(nextSource)
        .catch(() => undefined)
        .finally(() => {
          if (renderedPeriod === targetPeriod) {
            setState({ loading: false });
          }
        });
    }
  });

  return { map, climateLayer };
}

export function setBasemap(basemap: Basemap): void {
  setState({ basemap });
}
