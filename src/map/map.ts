import Map from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls } from 'ol/control/defaults';
import { fromLonLat } from 'ol/proj';
import type WebGLTileLayer from 'ol/layer/WebGLTile';
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
import { readClickedZone } from './click-query';

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
    0.5,
  );
  let renderedPeriod = manifest.defaultPeriod;
  let renderedVisibleZones = initialVisibleZones;

  const map = new Map({
    target,
    layers: [basemaps.plain, basemaps.satellite, climateLayer],
    controls: defaultControls(),
    view: new View({
      center: fromLonLat([0, 18]),
      zoom: 2,
      minZoom: 1.4,
      maxZoom: 9,
    }),
  });

  map.on('singleclick', (event) => {
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
      .catch(() => {
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
  });

  subscribe((state) => {
    basemaps.plain.setVisible(state.basemap === 'plain');
    basemaps.satellite.setVisible(state.basemap === 'satellite');
    climateLayer.setOpacity(state.opacity);

    if (state.visibleZones !== renderedVisibleZones) {
      setClimateLayerStyle(climateLayer, zones, state.visibleZones);
      renderedVisibleZones = state.visibleZones;
    }

    if (state.period && state.period !== renderedPeriod) {
      climateLayer.setSource(
        createGeoTiffSource(cogForPeriod(manifest, state.period)),
      );
      renderedPeriod = state.period;
    }
  });

  return { map, climateLayer };
}

export function setBasemap(basemap: Basemap): void {
  setState({ basemap });
}
