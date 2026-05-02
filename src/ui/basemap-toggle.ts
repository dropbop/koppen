import type { Basemap } from '@/state';
import { setState, subscribe } from '@/state';

export function mountBasemapToggle(target: HTMLElement): void {
  target.className = 'basemap-toggle';
  target.innerHTML = `
    <button type="button" data-basemap="plain" aria-pressed="false">Map</button>
    <button type="button" data-basemap="satellite" aria-pressed="false">Satellite</button>
  `;

  target.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-basemap]',
    );
    if (!button) {
      return;
    }
    setState({ basemap: button.dataset.basemap as Basemap });
  });

  subscribe((state) => {
    for (const button of target.querySelectorAll<HTMLButtonElement>(
      'button[data-basemap]',
    )) {
      button.classList.toggle(
        'is-active',
        button.dataset.basemap === state.basemap,
      );
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.basemap === state.basemap),
      );
    }
  });
}
