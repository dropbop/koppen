import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';

const MARKER_STYLE = new Style({
  image: new CircleStyle({
    radius: 5.5,
    fill: new Fill({ color: '#b04a2f' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
});

export function createClickMarkerLayer(): VectorLayer<VectorSource> {
  return new VectorLayer({
    source: new VectorSource(),
    style: MARKER_STYLE,
    zIndex: 100,
  });
}

export function setClickMarker(
  layer: VectorLayer<VectorSource>,
  coordinate: [number, number] | null,
): void {
  const source = layer.getSource();
  if (!source) {
    return;
  }
  source.clear();
  if (coordinate) {
    source.addFeature(new Feature({ geometry: new Point(coordinate) }));
  }
}
