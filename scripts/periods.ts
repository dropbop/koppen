export type PeriodKind = 'historical' | 'scenario';

export type PeriodSpec = {
  id: string;
  label: string;
  kind: PeriodKind;
  source: string;
};

export const DEFAULT_PERIOD = '1991-2020';

export const PERIODS: readonly PeriodSpec[] = [
  {
    id: '1991-2020',
    label: '1991-2020',
    kind: 'historical',
    source: '1991_2020/koppen_geiger_0p1.tif',
  },
  {
    id: '1961-1990',
    label: '1961-1990',
    kind: 'historical',
    source: '1961_1990/koppen_geiger_0p1.tif',
  },
  {
    id: '1931-1960',
    label: '1931-1960',
    kind: 'historical',
    source: '1931_1960/koppen_geiger_0p1.tif',
  },
  {
    id: '1901-1930',
    label: '1901-1930',
    kind: 'historical',
    source: '1901_1930/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp119',
    label: '2041-2070 SSP1-1.9',
    kind: 'scenario',
    source: '2041_2070/ssp119/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp126',
    label: '2041-2070 SSP1-2.6',
    kind: 'scenario',
    source: '2041_2070/ssp126/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp245',
    label: '2041-2070 SSP2-4.5',
    kind: 'scenario',
    source: '2041_2070/ssp245/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp370',
    label: '2041-2070 SSP3-7.0',
    kind: 'scenario',
    source: '2041_2070/ssp370/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp434',
    label: '2041-2070 SSP4-3.4',
    kind: 'scenario',
    source: '2041_2070/ssp434/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp460',
    label: '2041-2070 SSP4-6.0',
    kind: 'scenario',
    source: '2041_2070/ssp460/koppen_geiger_0p1.tif',
  },
  {
    id: '2041-2070-ssp585',
    label: '2041-2070 SSP5-8.5',
    kind: 'scenario',
    source: '2041_2070/ssp585/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp119',
    label: '2071-2099 SSP1-1.9',
    kind: 'scenario',
    source: '2071_2099/ssp119/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp126',
    label: '2071-2099 SSP1-2.6',
    kind: 'scenario',
    source: '2071_2099/ssp126/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp245',
    label: '2071-2099 SSP2-4.5',
    kind: 'scenario',
    source: '2071_2099/ssp245/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp370',
    label: '2071-2099 SSP3-7.0',
    kind: 'scenario',
    source: '2071_2099/ssp370/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp434',
    label: '2071-2099 SSP4-3.4',
    kind: 'scenario',
    source: '2071_2099/ssp434/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp460',
    label: '2071-2099 SSP4-6.0',
    kind: 'scenario',
    source: '2071_2099/ssp460/koppen_geiger_0p1.tif',
  },
  {
    id: '2071-2099-ssp585',
    label: '2071-2099 SSP5-8.5',
    kind: 'scenario',
    source: '2071_2099/ssp585/koppen_geiger_0p1.tif',
  },
];
