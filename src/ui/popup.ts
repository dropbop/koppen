import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import type Map from 'ol/Map';
import { setState, subscribe } from '@/state';
import type { PopupState } from '@/state';
import type { Zone, ZonesByValue } from '@/data/zones';

function formatCoordinate(
  value: number,
  positive: string,
  negative: string,
): string {
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)} ${suffix}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function placeText(popup: PopupState): string {
  if (popup.placeStatus === 'loading') {
    return 'Looking up nearby place...';
  }
  if (popup.placeStatus === 'error') {
    return 'Place lookup unavailable';
  }
  return popup.placeName ?? 'No nearby named place found';
}

function popupHtml(zone: Zone, popup: PopupState): string {
  const [r, g, b] = zone.rgb;
  return `
    <article class="popup-card">
      <button class="popup-close" type="button" aria-label="Close popup">&times;</button>
      <header class="popup-header" style="background-color: rgb(${r} ${g} ${b})">
        <span>${zone.code}</span>
      </header>
      <div class="popup-body">
        <h2>${zone.name}</h2>
        <p class="popup-group">${zone.group}, ${zone.groupDescription}</p>
        <p>${zone.description}</p>
        <p><strong>Found in:</strong> ${zone.examples}</p>
        <p class="popup-place"><strong>Approx. place:</strong> ${escapeHtml(placeText(popup))}</p>
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

  map.on('click', (event) => {
    if (!target.contains(event.originalEvent.target as Node)) {
      return;
    }
    event.preventDefault();
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
    overlay.setPosition(fromLonLat([state.popup.lon, state.popup.lat]));
  });
}
