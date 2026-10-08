// Farm (holding) helpers shared by the wizard and the Farms page.
import { api } from './api';

export const blankFarm = () => ({
  name: '', county_id: '', sub_county: '', ward: '', village: '',
  latitude: null, longitude: null, location_source: null, location_accuracy_m: null,
});

export function farmPayload(farm) {
  const out = {};
  Object.keys(blankFarm()).forEach((k) => {
    const v = typeof farm[k] === 'string' ? farm[k].trim() : farm[k];
    out[k] = v === '' || v === undefined ? null : v;
  });
  if (out.location_accuracy_m != null) out.location_accuracy_m = Math.min(65000, Math.round(out.location_accuracy_m));
  return out;
}

export function saveFarm(farm) {
  return farm.id
    ? api(`/holdings/${farm.id}`, { method: 'PUT', body: farmPayload(farm) })
    : api('/holdings', { method: 'POST', body: farmPayload(farm) });
}

export function farmPlace(farm) {
  return [farm.village, farm.sub_county, farm.county?.name].filter(Boolean).join(', ');
}
