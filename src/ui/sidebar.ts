import { getState, setState, subscribe } from '@/state';
import type { Theme } from '@/state';
import type { Manifest, Zone, ZonesByValue } from '@/data/zones';
import { zoneList } from '@/data/zones';

const groupOrder = ['A', 'B', 'C', 'D', 'E'];

function groupZones(zones: Zone[]): Map<string, Zone[]> {
  const grouped = new Map<string, Zone[]>();
  for (const zone of zones) {
    const list = grouped.get(zone.groupCode) ?? [];
    list.push(zone);
    grouped.set(zone.groupCode, list);
  }
  return grouped;
}

function isGroupChecked(group: Zone[], visibleZones: Set<number>): boolean {
  return group.every((zone) => visibleZones.has(zone.value));
}

function isGroupIndeterminate(
  group: Zone[],
  visibleZones: Set<number>,
): boolean {
  const checkedCount = group.filter((zone) =>
    visibleZones.has(zone.value),
  ).length;
  return checkedCount > 0 && checkedCount < group.length;
}

function renderZoneRow(zone: Zone, visibleZones: Set<number>): string {
  const [r, g, b] = zone.rgb;
  const checked = visibleZones.has(zone.value) ? 'checked' : '';
  return `
    <label class="zone-row">
      <input type="checkbox" data-zone="${zone.value}" ${checked} />
      <span class="zone-swatch" style="background-color: rgb(${r} ${g} ${b})"></span>
      <span class="zone-code">${zone.code}</span>
      <span class="zone-name">${zone.name}</span>
    </label>
  `;
}

function renderPeriodOptions(manifest: Manifest, period: string): string {
  const historical = manifest.periods.filter(
    (manifestPeriod) => manifestPeriod.kind === 'historical',
  );
  const scenarios = manifest.periods.filter(
    (manifestPeriod) => manifestPeriod.kind === 'scenario',
  );

  const renderOptions = (periods: typeof manifest.periods): string =>
    periods
      .map(
        (manifestPeriod) =>
          `<option value="${manifestPeriod.id}" ${manifestPeriod.id === period ? 'selected' : ''}>${manifestPeriod.label}</option>`,
      )
      .join('');

  return `
    <optgroup label="Historical">
      ${renderOptions(historical)}
    </optgroup>
    <optgroup label="Future scenarios">
      ${renderOptions(scenarios)}
    </optgroup>
  `;
}

function render(
  target: HTMLElement,
  manifest: Manifest,
  zones: Zone[],
  visibleZones: Set<number>,
  period: string,
  opacity: number,
  theme: Theme,
): void {
  const grouped = groupZones(zones);
  const groups = groupOrder
    .map((groupCode) => {
      const group = grouped.get(groupCode);
      if (!group) {
        return '';
      }
      const first = group[0];
      const checked = isGroupChecked(group, visibleZones) ? 'checked' : '';
      const rows = group
        .map((zone) => renderZoneRow(zone, visibleZones))
        .join('');
      return `
        <section class="zone-group">
          <label class="group-row">
            <input type="checkbox" data-group="${groupCode}" ${checked} />
            <span>${groupCode} - ${first.group}</span>
          </label>
          <div class="zone-group-list">${rows}</div>
        </section>
      `;
    })
    .join('');

  target.innerHTML = `
    <div class="sidebar-panel">
      <header class="sidebar-header">
        <div class="sidebar-title-row">
          <h1>Köppen-Geiger Climate Map</h1>
          <button type="button" data-action="toggle-theme" aria-label="Toggle dark mode">${theme === 'dark' ? 'Light' : 'Dark'}</button>
        </div>
        <p>Global historical and projected climate zones from Beck et al. V3.</p>
        <a href="https://www.gloh2o.org/koppen/" target="_blank" rel="noreferrer">Data source</a>
      </header>

      <section class="control-section">
        <label class="section-label" for="period-select">Period</label>
        <select id="period-select">
          ${renderPeriodOptions(manifest, period)}
        </select>
      </section>

      <section class="control-section">
        <div class="section-heading">
          <span>Climate Classes</span>
          <div>
            <button type="button" data-action="show-all">Show all</button>
            <button type="button" data-action="show-none">Show none</button>
          </div>
        </div>
        <div class="zone-list">${groups}</div>
      </section>

      <section class="control-section">
        <label class="section-label" for="opacity-slider">Layer opacity ${Math.round(opacity * 100)}%</label>
        <input id="opacity-slider" type="range" min="0.2" max="1" step="0.05" value="${opacity}" />
      </section>

      <footer>
        <p>Data source: <a href="https://www.gloh2o.org/koppen/" target="_blank" rel="noreferrer">gloh2o.org/koppen</a>.</p>
        <p>Place names from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> via Nominatim.</p>
        <p>License: CC BY 4.0. Freely use, adapt, and share these maps with attribution to Beck et al. (2023).</p>
        <p>Beck, H.E., T.R. McVicar, N. Vergopolan, A. Berg, N.J. Lutsko, A. Dufour, Z. Zeng, X. Jiang, A.I.J.M. van Dijk, D.G. Miralles. High-resolution (1 km) Köppen-Geiger maps for 1901-2099 based on constrained CMIP6 projections, Scientific Data 10, 724, doi:10.1038/s41597-023-02549-6 (2023).</p>
      </footer>
    </div>
  `;

  for (const checkbox of target.querySelectorAll<HTMLInputElement>(
    'input[data-group]',
  )) {
    const group = grouped.get(checkbox.dataset.group ?? '');
    checkbox.indeterminate = group
      ? isGroupIndeterminate(group, visibleZones)
      : false;
  }
}

export function mountSidebar(
  target: HTMLElement,
  manifest: Manifest,
  zonesByValue: ZonesByValue,
): void {
  const zones = zoneList(zonesByValue);
  target.className = 'sidebar';

  target.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;

    if (input.id === 'period-select') {
      setState({ period: input.value, popup: null });
      return;
    }

    if (input.id === 'opacity-slider') {
      setState({ opacity: Number(input.value) });
      return;
    }

    if (input.dataset.zone) {
      const value = Number(input.dataset.zone);
      const current = new Set(
        Array.from(
          document.querySelectorAll<HTMLInputElement>(
            'input[data-zone]:checked',
          ),
        ).map((checkbox) => Number(checkbox.dataset.zone)),
      );
      if (input.checked) {
        current.add(value);
      } else {
        current.delete(value);
      }
      setState({ visibleZones: current });
      return;
    }

    if (input.dataset.group) {
      const currentState = new Set(
        Array.from(
          document.querySelectorAll<HTMLInputElement>(
            'input[data-zone]:checked',
          ),
        ).map((checkbox) => Number(checkbox.dataset.zone)),
      );
      for (const zone of zones.filter(
        (candidate) => candidate.groupCode === input.dataset.group,
      )) {
        if (input.checked) {
          currentState.add(zone.value);
        } else {
          currentState.delete(zone.value);
        }
      }
      setState({ visibleZones: currentState });
    }
  });

  target.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      'button[data-action]',
    );
    if (!button) {
      return;
    }

    if (button.dataset.action === 'show-all') {
      setState({ visibleZones: new Set(zones.map((zone) => zone.value)) });
    }
    if (button.dataset.action === 'show-none') {
      setState({ visibleZones: new Set() });
    }
    if (button.dataset.action === 'toggle-theme') {
      setState({ theme: getState().theme === 'dark' ? 'light' : 'dark' });
    }
  });

  subscribe((state) => {
    render(
      target,
      manifest,
      zones,
      state.visibleZones,
      state.period,
      state.opacity,
      state.theme,
    );
  });
}
