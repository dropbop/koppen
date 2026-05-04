import Overlay from 'ol/Overlay';
import type Map from 'ol/Map';
import { setState, subscribe } from '@/state';
import type { PopupState } from '@/state';
import type { Zone, ZonesByValue } from '@/data/zones';
import { escapeHtml } from '@/utils/html';

function formatCoordinate(
  value: number,
  positive: string,
  negative: string,
): string {
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)} ${suffix}`;
}

function placeText(popup: PopupState): string {
  if (popup.placeStatus === 'error') {
    return 'Place lookup unavailable';
  }
  return popup.placeName ?? 'No nearby named place found';
}

function popupHtml(zone: Zone, popup: PopupState): string {
  const [r, g, b] = zone.rgb;
  const place =
    popup.placeStatus === 'loading'
      ? 'Looking up location...'
      : escapeHtml(placeText(popup));
  return `
    <article class="popup-card">
      <button class="popup-close" type="button" aria-label="Close popup"></button>
      <header class="popup-header" style="background-color: rgb(${r} ${g} ${b})">
        <span>${escapeHtml(zone.code)}</span>
      </header>
      <div class="popup-body">
        <h2>${escapeHtml(zone.name)}</h2>
        <p class="popup-group">${escapeHtml(zone.group)}, ${escapeHtml(zone.groupDescription)}</p>
        <p>${escapeHtml(zone.description)}</p>
        <p><strong>Found in:</strong> ${escapeHtml(zone.examples)}</p>
        <p class="popup-place"><strong>Approx. place:</strong> ${place}</p>
        <p class="popup-coordinates">${formatCoordinate(popup.lat, 'N', 'S')}, ${formatCoordinate(popup.lon, 'E', 'W')}</p>
      </div>
    </article>
  `;
}

export function mountPopup(
  target: HTMLElement,
  map: Map,
  zones: ZonesByValue,
): void {
  const overlay = new Overlay({
    element: target,
    positioning: 'bottom-center',
    stopEvent: true,
    offset: [0, -14],
    autoPan: {
      animation: {
        duration: 200,
      },
    },
  });
  map.addOverlay(overlay);

  target.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.popup-close')) {
      setState({ popup: null });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setState({ popup: null });
    }
  });

  subscribe((state) => {
    if (!state.popup) {
      target.innerHTML = '';
      overlay.setPosition(undefined);
      return;
    }

    const zone = zones[String(state.popup.classValue)];
    if (!zone) {
      target.innerHTML = '';
      overlay.setPosition(undefined);
      return;
    }

    target.innerHTML = popupHtml(zone, state.popup);
    overlay.setPosition(state.popup.coordinate);
  });
}
