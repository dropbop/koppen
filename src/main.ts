import 'ol/ol.css';
import './styles.css';
import { LOADING_DELAY_MS, MOBILE_SIDEBAR_QUERY } from '@/config';
import { loadAppData, zoneList } from '@/data/zones';
import { setState, subscribe } from '@/state';
import { mountMap, whenSourceReady } from '@/map/map';
import { mountBasemapToggle } from '@/ui/basemap-toggle';
import { mountPopup } from '@/ui/popup';
import { mountSidebar } from '@/ui/sidebar';
import { loadPreferences, persistPreferences } from '@/preferences';

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
    const zonesList = zoneList(zones);
    const initialZones = new Set(zonesList.map((zone) => zone.value));
    const preferences = loadPreferences(manifest, zonesList);
    const mobileQuery = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    mobileQuery.addEventListener('change', (event) => {
      setState({ sidebarOpen: !event.matches });
    });
    setState({
      ...preferences,
      period: preferences.period ?? manifest.defaultPeriod,
      visibleZones: preferences.visibleZones ?? initialZones,
      loading: true,
      sidebarOpen: !mobileQuery.matches,
    });

    const controller = mountMap(mapTarget, manifest, zones);
    mountSidebar(sidebarTarget, manifest, zones);
    mountBasemapToggle(basemapTarget);
    mountPopup(popupTarget, controller.map, zones);
    let loadingTimer: number | undefined;
    subscribe((state) => {
      document.documentElement.classList.toggle(
        'dark-mode',
        state.theme === 'dark',
      );
      persistPreferences(state);

      if (state.loading) {
        if (
          loadingTimer === undefined &&
          loadingTarget.classList.contains('is-hidden')
        ) {
          loadingTimer = window.setTimeout(() => {
            loadingTimer = undefined;
            loadingTarget.classList.remove('is-hidden');
          }, LOADING_DELAY_MS);
        }
      } else {
        if (loadingTimer !== undefined) {
          window.clearTimeout(loadingTimer);
          loadingTimer = undefined;
        }
        loadingTarget.classList.add('is-hidden');
      }
    });

    const initialSource = controller.climateLayer.getSource();
    if (initialSource) {
      await whenSourceReady(initialSource).catch(() => undefined);
    }
    setState({ loading: false });
  } catch (error) {
    console.error(error);
    loadingTarget.classList.remove('is-hidden');
    loadingTarget.innerHTML = `
      <div class="loading-card loading-error">
        <strong>Unable to load the map data.</strong>
        <span>Run pnpm prepare-data, then restart the dev server.</span>
      </div>
    `;
  }
}

void main();
