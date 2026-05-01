import 'ol/ol.css';
import './styles.css';
import { loadAppData, zoneList } from '@/data/zones';
import { setState, subscribe } from '@/state';
import { mountMap, whenSourceReady } from '@/map/map';
import { mountBasemapToggle } from '@/ui/basemap-toggle';
import { mountPopup } from '@/ui/popup';
import { mountSidebar } from '@/ui/sidebar';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}`);
  }
  return element as T;
}

async function main(): Promise<void> {
  const mapTarget = requiredElement<HTMLDivElement>('map');
  const sidebarTarget = requiredElement<HTMLElement>('sidebar');
  const basemapTarget = requiredElement<HTMLDivElement>('basemap-toggle');
  const popupTarget = requiredElement<HTMLDivElement>('popup');
  const loadingTarget = requiredElement<HTMLDivElement>('loading');

  try {
    const { manifest, zones } = await loadAppData();
    const initialZones = new Set(zoneList(zones).map((zone) => zone.value));
    setState({
      period: manifest.defaultPeriod,
      visibleZones: initialZones,
      loading: true,
    });

    const controller = mountMap(mapTarget, manifest, zones);
    mountSidebar(sidebarTarget, manifest, zones);
    mountBasemapToggle(basemapTarget);
    mountPopup(popupTarget, controller.map, zones);
    subscribe((state) => {
      document.documentElement.classList.toggle(
        'dark-mode',
        state.theme === 'dark',
      );
      loadingTarget.classList.toggle('is-hidden', !state.loading);
    });

    const initialSource = controller.climateLayer.getSource();
    if (initialSource) {
      await whenSourceReady(initialSource).catch(() => undefined);
    }
    setState({ loading: false });
  } catch (error) {
    console.error(error);
    loadingTarget.innerHTML = `
      <div class="loading-card loading-error">
        <strong>Unable to load the map data.</strong>
        <span>Run pnpm prepare-data, then restart the dev server.</span>
      </div>
    `;
  }
}

void main();
