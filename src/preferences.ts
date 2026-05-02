import type { AppState, Basemap, Theme } from '@/state';
import type { Manifest, Zone } from '@/data/zones';

const STORAGE_KEY = 'koppen-geiger-preferences';

type StoredPreferences = {
  period?: string;
  basemap?: Basemap;
  visibleZones?: number[];
  opacity?: number;
  theme?: Theme;
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
  const validPeriods = new Set(manifest.periods.map((period) => period.id));
  const validZones = new Set(zones.map((zone) => zone.value));
  const visibleZones = stored.visibleZones?.filter((zone) =>
    validZones.has(zone),
  );

  return {
    period:
      stored.period && validPeriods.has(stored.period)
        ? stored.period
        : undefined,
    basemap:
      stored.basemap === 'plain' || stored.basemap === 'satellite'
        ? stored.basemap
        : undefined,
    visibleZones: Array.isArray(stored.visibleZones)
      ? new Set(visibleZones)
      : undefined,
    opacity:
      typeof stored.opacity === 'number' &&
      stored.opacity >= 0.2 &&
      stored.opacity <= 1
        ? stored.opacity
        : undefined,
    theme:
      stored.theme === 'light' || stored.theme === 'dark'
        ? stored.theme
        : undefined,
  };
}

export function persistPreferences(state: Readonly<AppState>): void {
  try {
    const preferences: StoredPreferences = {
      period: state.period,
      basemap: state.basemap,
      visibleZones: Array.from(state.visibleZones),
      opacity: state.opacity,
      theme: state.theme,
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
