import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

export type BasemapLayers = {
  plain: TileLayer<XYZ>;
  satellite: TileLayer<XYZ>;
};

export function createBasemapLayers(): BasemapLayers {
  const plain = new TileLayer({
    source: new XYZ({
      url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attributions: '&copy; OpenStreetMap contributors &copy; CARTO',
      crossOrigin: 'anonymous',
      maxZoom: 20,
    }),
    visible: true,
  });

  const satellite = new TileLayer({
    source: new XYZ({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attributions:
        'Tiles &copy; Esri - Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      crossOrigin: 'anonymous',
      maxZoom: 19,
    }),
    visible: false,
  });

  return { plain, satellite };
}
