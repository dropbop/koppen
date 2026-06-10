import { DEFAULT_OPACITY } from '@/config';

export type Basemap = 'plain' | 'satellite';
export type ActivePanel = 'menu' | 'about' | null;

export type PopupState = {
  lon: number;
  lat: number;
  coordinate: [number, number];
  classValue: number;
  placeName?: string;
  placeStatus?: 'loading' | 'ready' | 'error';
};

export type AppState = {
  period: string;
  basemap: Basemap;
  visibleZones: Set<number>;
  popup: PopupState | null;
  loading: boolean;
  opacity: number;
  activePanel: ActivePanel;
};

const state: AppState = {
  period: '',
  basemap: 'plain',
  visibleZones: new Set(),
  popup: null,
  loading: true,
  opacity: DEFAULT_OPACITY,
  activePanel: 'menu',
};

const subscribers = new Set<(nextState: Readonly<AppState>) => void>();

export function getState(): Readonly<AppState> {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  Object.assign(state, patch);
  for (const subscriber of subscribers) {
    subscriber(state);
  }
}

export function subscribe(
  fn: (nextState: Readonly<AppState>) => void,
): () => void {
  subscribers.add(fn);
  fn(state);
  return () => subscribers.delete(fn);
}
