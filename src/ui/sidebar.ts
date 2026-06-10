import { getState, setState, subscribe } from '@/state';
import type { ActivePanel } from '@/state';
import type { Manifest, Zone, ZonesByValue } from '@/data/zones';
import { zoneList } from '@/data/zones';
import { escapeHtml } from '@/utils/html';

const groupOrder = ['A', 'B', 'C', 'D', 'E'];
const SIDEBAR_WIDTH_STORAGE_KEY = 'koppen-geiger-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 336;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 560;

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

function maxSidebarWidth(): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, window.innerWidth - 320));
}

function clampSidebarWidth(width: number): number {
  return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), maxSidebarWidth());
}

function readStoredSidebarWidth(): number {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number(stored) : DEFAULT_SIDEBAR_WIDTH;
    return clampSidebarWidth(Number.isFinite(parsed) ? parsed : DEFAULT_SIDEBAR_WIDTH);
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function persistSidebarWidth(width: number): void {
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Width persistence is a convenience; storage failures should not block UI.
  }
}

function applySidebarWidth(target: HTMLElement, width: number): void {
  target.style.setProperty('--sidebar-width', `${clampSidebarWidth(width)}px`);
}

function renderPanelTabs(activePanel: ActivePanel, className: string): string {
  const panelButton = (panel: Exclude<ActivePanel, null>, label: string) => {
    const selected = activePanel === panel;
    return `
      <button
        type="button"
        data-action="open-panel"
        data-panel="${panel}"
        class="${selected ? 'is-active' : ''}"
        aria-pressed="${selected}"
      >
        ${label}
      </button>
    `;
  };

  return `
    <div class="${className}" role="group" aria-label="Map panels">
      ${panelButton('menu', 'Menu')}
      ${panelButton('about', 'About')}
    </div>
  `;
}

function renderMenuContent(
  manifest: Manifest,
  grouped: Map<string, Zone[]>,
  visibleZones: Set<number>,
  period: string,
  opacity: number,
): string {
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
            <span>${escapeHtml(groupCode)} - ${escapeHtml(first.group)}</span>
          </label>
          <div class="zone-group-list" id="${groupId}">${rows}</div>
        </section>
      `;
    })
    .join('');

  return `
    <div class="sidebar-intro">
      <p class="eyebrow">An atlas of climate · Beck et al. 2023</p>
      <h1>Köppen-Geiger Climate Map</h1>
      <p>Historical and projected Köppen-Geiger climate zones from 1901 through 2099.</p>
    </div>

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
        <p class="citation-paper">Beck, H. E., T. R. McVicar, N. Vergopolan, A. Berg, N. J. Lutsko, A. Dufour, Z. Zeng, X. Jiang, A. I. J. M. van Dijk, D. G. Miralles. <em>High-resolution (1 km) Köppen-Geiger maps for 1901-2099 based on constrained CMIP6 projections.</em> Scientific Data 10, 724 (2023). doi:10.1038/s41597-023-02549-6.</p>
      </div>
    </details>
  `;
}

function getAboutHtml(): string {
  const source = document.getElementById('map-guide');
  const sourceInner = source?.querySelector<HTMLElement>('.seo-content__inner');
  if (!source || !sourceInner) {
    return `
      <div class="seo-content__inner">
        <header class="seo-content__header">
          <div>
            <p class="seo-content__eyebrow">Interactive climate classification atlas</p>
            <h1>Köppen-Geiger Climate Map</h1>
            <p class="seo-content__lead">Explore global Köppen-Geiger climate zones from 1901-2020 and CMIP6 projections through 2099.</p>
          </div>
        </header>
      </div>
    `;
  }

  source.hidden = true;
  source.setAttribute('aria-hidden', 'true');

  const clone = sourceInner.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll('[data-map-guide-action], .seo-content__actions')
    .forEach((element) => element.remove());
  return clone.innerHTML;
}

function render(
  target: HTMLElement,
  manifest: Manifest,
  grouped: Map<string, Zone[]>,
  visibleZones: Set<number>,
  period: string,
  opacity: number,
  activePanel: ActivePanel,
): void {
  target.className = `sidebar ${activePanel ? 'is-open' : 'is-collapsed'} panel-${activePanel ?? 'none'}`;
  const panelContent =
    activePanel === 'about'
      ? getAboutHtml()
      : renderMenuContent(manifest, grouped, visibleZones, period, opacity);
  const panelLabel = activePanel === 'about' ? 'About' : 'Menu';

  target.innerHTML = `
    <div class="sidebar-panel" aria-hidden="${activePanel === null}">
      <header class="sidebar-panel-header">
        ${renderPanelTabs(activePanel, 'panel-tabs')}
        <button class="panel-close" type="button" data-action="close-panel" aria-label="Close ${panelLabel} panel">
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div class="sidebar-content ${activePanel === 'about' ? 'sidebar-content-about seo-content' : 'sidebar-content-menu'}" id="sidebar-panel-content">
        ${panelContent}
      </div>

      <div
        class="sidebar-resize-handle"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        tabindex="0"
        data-action="resize-sidebar"
      ></div>
    </div>

    <div class="desktop-panel-rail" role="group" aria-label="Open map panel">
      <button type="button" data-action="open-panel" data-panel="menu">Menu</button>
      <button type="button" data-action="open-panel" data-panel="about">About</button>
    </div>

    ${renderPanelTabs(activePanel, 'mobile-panel-tabs')}
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
  activePanel: ActivePanel;
  opacity: number;
};

function applyUpdates(
  target: HTMLElement,
  grouped: Map<string, Zone[]>,
  state: SurgicalState,
): void {
  target.className = `sidebar ${state.activePanel ? 'is-open' : 'is-collapsed'} panel-${state.activePanel ?? 'none'}`;

  for (const button of target.querySelectorAll<HTMLButtonElement>(
    '[data-action="open-panel"][data-panel]',
  )) {
    const selected = button.dataset.panel === state.activePanel;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  const panel = target.querySelector<HTMLElement>('.sidebar-panel');
  if (panel) {
    panel.setAttribute('aria-hidden', String(state.activePanel === null));
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
  const aboutSource = document.getElementById('map-guide');
  if (aboutSource) {
    aboutSource.hidden = true;
    aboutSource.setAttribute('aria-hidden', 'true');
  }
  target.className = 'sidebar';
  applySidebarWidth(target, readStoredSidebarWidth());

  window.addEventListener('resize', () => {
    const currentWidth = Number.parseFloat(
      getComputedStyle(target).getPropertyValue('--sidebar-width'),
    );
    applySidebarWidth(
      target,
      Number.isFinite(currentWidth) ? currentWidth : readStoredSidebarWidth(),
    );
  });

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
    if (button.dataset.action === 'close-panel') {
      setState({ activePanel: null });
      return;
    }
    if (button.dataset.action === 'open-panel') {
      const panel = button.dataset.panel as Exclude<ActivePanel, null>;
      setState({
        activePanel: getState().activePanel === panel ? null : panel,
      });
    }
  });

  target.addEventListener('keydown', (event) => {
    const resizeHandle = (event.target as HTMLElement).closest<HTMLElement>(
      '.sidebar-resize-handle',
    );
    if (!resizeHandle || !window.matchMedia('(min-width: 768px)').matches) {
      return;
    }

    const step = event.shiftKey ? 32 : 16;
    const currentWidth = Number.parseFloat(
      getComputedStyle(target).getPropertyValue('--sidebar-width'),
    );
    const baseWidth = Number.isFinite(currentWidth)
      ? currentWidth
      : DEFAULT_SIDEBAR_WIDTH;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextWidth = clampSidebarWidth(
        baseWidth + (event.key === 'ArrowRight' ? step : -step),
      );
      applySidebarWidth(target, nextWidth);
      persistSidebarWidth(nextWidth);
    }
  });

  target.addEventListener('pointerdown', (event) => {
    const resizeHandle = (event.target as HTMLElement).closest<HTMLElement>(
      '.sidebar-resize-handle',
    );
    if (
      !resizeHandle ||
      event.button !== 0 ||
      !window.matchMedia('(min-width: 768px)').matches
    ) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const currentWidth = Number.parseFloat(
      getComputedStyle(target).getPropertyValue('--sidebar-width'),
    );
    const startWidth = Number.isFinite(currentWidth)
      ? currentWidth
      : DEFAULT_SIDEBAR_WIDTH;

    document.body.classList.add('sidebar-resizing');

    const onPointerMove = (moveEvent: PointerEvent): void => {
      applySidebarWidth(target, startWidth + moveEvent.clientX - startX);
    };
    const onPointerUp = (upEvent: PointerEvent): void => {
      const nextWidth = clampSidebarWidth(startWidth + upEvent.clientX - startX);
      applySidebarWidth(target, nextWidth);
      persistSidebarWidth(nextWidth);
      document.body.classList.remove('sidebar-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
    const onPointerCancel = (): void => {
      applySidebarWidth(target, startWidth);
      document.body.classList.remove('sidebar-resizing');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  });

  target.addEventListener('mousedown', (event) => {
    const resizeHandle = (event.target as HTMLElement).closest<HTMLElement>(
      '.sidebar-resize-handle',
    );
    if (
      !resizeHandle ||
      event.button !== 0 ||
      document.body.classList.contains('sidebar-resizing') ||
      !window.matchMedia('(min-width: 768px)').matches
    ) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const currentWidth = Number.parseFloat(
      getComputedStyle(target).getPropertyValue('--sidebar-width'),
    );
    const startWidth = Number.isFinite(currentWidth)
      ? currentWidth
      : DEFAULT_SIDEBAR_WIDTH;

    document.body.classList.add('sidebar-resizing');

    const onMouseMove = (moveEvent: MouseEvent): void => {
      applySidebarWidth(target, startWidth + moveEvent.clientX - startX);
    };
    const onMouseUp = (upEvent: MouseEvent): void => {
      const nextWidth = clampSidebarWidth(startWidth + upEvent.clientX - startX);
      applySidebarWidth(target, nextWidth);
      persistSidebarWidth(nextWidth);
      document.body.classList.remove('sidebar-resizing');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });

  let mounted = false;
  let lastActivePanel: ActivePanel | undefined;

  subscribe((state) => {
    if (!mounted || state.activePanel !== lastActivePanel) {
      render(
        target,
        manifest,
        grouped,
        state.visibleZones,
        state.period,
        state.opacity,
        state.activePanel,
      );
      mounted = true;
      lastActivePanel = state.activePanel;
      return;
    }
    applyUpdates(target, grouped, state);
  });
}
