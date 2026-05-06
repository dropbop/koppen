import type { AppState, Basemap } from '@/state';
import type { Manifest, Zone } from '@/data/zones';

const STORAGE_KEY = 'koppen-geiger-preferences';

type StoredPreferences = {
  period?: string;
  basemap?: Basemap;
  visibleZones?: number[];
  opacity?: number;
};

let lastSerializedPreferences = '';

function readStoredPreferences(): StoredPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPreferences) : {};
  } catch {
    return {};
  }
}

export function loadPreferences(
  manifest: Manifest,
  zones: Zone[],
): Partial<AppState> {
  const stored = readStoredPreferences();
  const preferences: Partial<AppState> = {};
  const validPeriods = new Set(manifest.periods.map((period) => period.id));
  const validZones = new Set(zones.map((zone) => zone.value));
  const visibleZones = stored.visibleZones?.filter((zone) =>
    validZones.has(zone),
  );

  if (stored.period && validPeriods.has(stored.period)) {
    preferences.period = stored.period;
  }
  if (stored.basemap === 'plain' || stored.basemap === 'satellite') {
    preferences.basemap = stored.basemap;
  }
  if (Array.isArray(stored.visibleZones)) {
    preferences.visibleZones = new Set(visibleZones);
  }
  if (
    typeof stored.opacity === 'number' &&
    stored.opacity >= 0.2 &&
    stored.opacity <= 1
  ) {
    preferences.opacity = stored.opacity;
  }
  return preferences;
}

export function persistPreferences(state: Readonly<AppState>): void {
  try {
    const preferences: StoredPreferences = {
      period: state.period,
      basemap: state.basemap,
      visibleZones: Array.from(state.visibleZones),
      opacity: state.opacity,
    };
    const serialized = JSON.stringify(preferences);
    if (serialized === lastSerializedPreferences) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, serialized);
    lastSerializedPreferences = serialized;
  } catch {
    // Preferences are progressive enhancement; private browsing failures are safe.
  }
}

const PERSIST_DEBOUNCE_MS = 200;
let pendingPersistTimer: number | undefined;
let pendingState: Readonly<AppState> | null = null;

export function schedulePersist(state: Readonly<AppState>): void {
  pendingState = state;
  if (pendingPersistTimer !== undefined) {
    window.clearTimeout(pendingPersistTimer);
  }
  pendingPersistTimer = window.setTimeout(() => {
    pendingPersistTimer = undefined;
    const next = pendingState;
    pendingState = null;
    if (next) {
      persistPreferences(next);
    }
  }, PERSIST_DEBOUNCE_MS);
}

export function flushPendingPersist(): void {
  if (pendingPersistTimer !== undefined) {
    window.clearTimeout(pendingPersistTimer);
    pendingPersistTimer = undefined;
  }
  const next = pendingState;
  pendingState = null;
  if (next) {
    persistPreferences(next);
  }
}
