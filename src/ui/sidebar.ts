import { getState, setState, subscribe } from '@/state';
import type { Manifest, Zone, ZonesByValue } from '@/data/zones';
import { zoneList } from '@/data/zones';
import { escapeHtml } from '@/utils/html';

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
  const label = `${zone.code} ${zone.name}`;
  return `
    <label class="zone-row">
      <input type="checkbox" data-zone="${zone.value}" aria-label="${escapeHtml(label)}" ${checked} />
      <span class="zone-swatch" style="background-color: rgb(${r} ${g} ${b})"></span>
      <span class="zone-code">${escapeHtml(zone.code)}</span>
      <span class="zone-name">${escapeHtml(zone.name)}</span>
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
          `<option value="${escapeHtml(manifestPeriod.id)}" ${manifestPeriod.id === period ? 'selected' : ''}>${escapeHtml(manifestPeriod.label)}</option>`,
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

function opacityLabel(opacity: number): string {
  return `Layer opacity ${Math.round(opacity * 100)}%`;
}

function updateOpacity(target: HTMLElement, opacity: number): void {
  const label = target.querySelector<HTMLLabelElement>(
    'label[for="opacity-slider"]',
  );
  if (label) {
    label.textContent = opacityLabel(opacity);
  }
  const slider = target.querySelector<HTMLInputElement>('#opacity-slider');
  if (slider && Number(slider.value) !== opacity) {
    slider.value = String(opacity);
  }
}

function render(
  target: HTMLElement,
  manifest: Manifest,
  zones: Zone[],
  visibleZones: Set<number>,
  period: string,
  opacity: number,
  sidebarOpen: boolean,
): void {
  target.className = `sidebar ${sidebarOpen ? 'is-open' : 'is-collapsed'}`;
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
      const groupId = `zone-group-${groupCode}`;
      return `
        <section class="zone-group">
          <label class="group-row">
            <input type="checkbox" data-group="${escapeHtml(groupCode)}" aria-controls="${groupId}" aria-label="Toggle ${escapeHtml(first.group)} climates" ${checked} />
            <span>${escapeHtml(groupCode)} — ${escapeHtml(first.group)}</span>
          </label>
          <div class="zone-group-list" id="${groupId}">${rows}</div>
        </section>
      `;
    })
    .join('');

  target.innerHTML = `
    <div class="sidebar-panel">
      <header class="sidebar-header">
        <div class="sidebar-title-row">
          <div>
            <p class="eyebrow">Köppen-Geiger · Beck V3</p>
            <h1>An Atlas of Climate</h1>
          </div>
          <div class="sidebar-actions">
            <button class="sidebar-toggle" type="button" data-action="toggle-sidebar" aria-controls="sidebar-controls" aria-expanded="${sidebarOpen}">${sidebarOpen ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <p>Historical and projected Köppen-Geiger climate zones from 1901 through 2099.</p>
      </header>

      <div class="sidebar-content" id="sidebar-controls">
        <section class="control-section">
          <label class="section-label" for="period-select">Period</label>
          <select id="period-select">
            ${renderPeriodOptions(manifest, period)}
          </select>
          <p class="scenario-help">SSP labels describe future emissions pathways. SSP1 is sustainable, SSP5 is fossil-fueled growth; the trailing number is the approximate 2100 radiative forcing in W/m².</p>
        </section>

        <section class="control-section">
          <div class="section-heading">
            <span>Climate Classes</span>
            <div>
              <button type="button" data-action="show-all">All</button>
              <button type="button" data-action="show-none">None</button>
            </div>
          </div>
          <div class="zone-list">${groups}</div>
        </section>

        <section class="control-section">
          <label class="section-label" for="opacity-slider">${opacityLabel(opacity)}</label>
          <input id="opacity-slider" type="range" min="0.2" max="1" step="0.05" value="${opacity}" />
        </section>

        <details class="sidebar-citation">
          <summary>About &amp; citation</summary>
          <div class="citation-body">
            <p><strong>Project code:</strong> <a href="https://github.com/dropbop/koppen/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT</a> · <a href="https://github.com/dropbop/koppen" target="_blank" rel="noreferrer">github.com/dropbop/koppen</a></p>
            <p><strong>Map data:</strong> Beck et al. (2023), <a href="https://www.gloh2o.org/koppen/" target="_blank" rel="noreferrer">gloh2o.org/koppen</a>, licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Free to use, adapt, and share with attribution to the authors.</p>
            <p><strong>Place names:</strong> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer">ODbL</a>, via Nominatim.</p>
            <p class="citation-paper">Beck, H. E., T. R. McVicar, N. Vergopolan, A. Berg, N. J. Lutsko, A. Dufour, Z. Zeng, X. Jiang, A. I. J. M. van Dijk, D. G. Miralles. <em>High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections.</em> Scientific Data 10, 724 (2023). doi:10.1038/s41597-023-02549-6.</p>
          </div>
        </details>
      </div>
    </div>
    <button class="sidebar-edge-tab" type="button" data-action="toggle-sidebar" aria-controls="sidebar-controls" aria-expanded="${sidebarOpen}" aria-label="Show sidebar">
      Show
    </button>
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

type SurgicalState = {
  visibleZones: Set<number>;
  period: string;
  sidebarOpen: boolean;
  opacity: number;
};

function applyUpdates(
  target: HTMLElement,
  grouped: Map<string, Zone[]>,
  state: SurgicalState,
): void {
  target.className = `sidebar ${state.sidebarOpen ? 'is-open' : 'is-collapsed'}`;

  const toggleButton = target.querySelector<HTMLButtonElement>(
    '.sidebar-toggle',
  );
  if (toggleButton) {
    toggleButton.textContent = state.sidebarOpen ? 'Hide' : 'Show';
  }
  for (const button of target.querySelectorAll<HTMLElement>(
    '[aria-controls="sidebar-controls"]',
  )) {
    button.setAttribute('aria-expanded', String(state.sidebarOpen));
  }

  const select = target.querySelector<HTMLSelectElement>('#period-select');
  if (select) {
    select.value = state.period;
  }

  for (const checkbox of target.querySelectorAll<HTMLInputElement>(
    'input[data-zone]',
  )) {
    const value = Number(checkbox.dataset.zone);
    checkbox.checked = state.visibleZones.has(value);
  }

  for (const checkbox of target.querySelectorAll<HTMLInputElement>(
    'input[data-group]',
  )) {
    const group = grouped.get(checkbox.dataset.group ?? '');
    if (!group) {
      continue;
    }
    checkbox.checked = isGroupChecked(group, state.visibleZones);
    checkbox.indeterminate = isGroupIndeterminate(group, state.visibleZones);
  }

  updateOpacity(target, state.opacity);
}

export function mountSidebar(
  target: HTMLElement,
  manifest: Manifest,
  zonesByValue: ZonesByValue,
): void {
  const zones = zoneList(zonesByValue);
  const grouped = groupZones(zones);
  target.className = 'sidebar';

  target.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === 'opacity-slider') {
      setState({ opacity: Number(input.value) });
    }
  });

  target.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;

    if (input.id === 'period-select') {
      setState({ period: input.value, popup: null });
      return;
    }

    if (input.dataset.zone) {
      const value = Number(input.dataset.zone);
      const current = new Set(getState().visibleZones);
      if (input.checked) {
        current.add(value);
      } else {
        current.delete(value);
      }
      setState({ visibleZones: current });
      return;
    }

    if (input.dataset.group) {
      const currentState = new Set(getState().visibleZones);
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
      return;
    }
    if (button.dataset.action === 'show-none') {
      setState({ visibleZones: new Set() });
      return;
    }
    if (button.dataset.action === 'toggle-sidebar') {
      setState({ sidebarOpen: !getState().sidebarOpen });
    }
  });

  let mounted = false;

  subscribe((state) => {
    if (!mounted) {
      render(
        target,
        manifest,
        zones,
        state.visibleZones,
        state.period,
        state.opacity,
        state.sidebarOpen,
      );
      mounted = true;
      return;
    }
    applyUpdates(target, grouped, state);
  });
}
