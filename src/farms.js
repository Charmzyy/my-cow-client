// Farm (holding) helpers shared by the wizard and the Farms page.
import { api } from './api';

export const blankFarm = () => ({
  name: '', county_id: '', sub_county: '', ward: '', village: '',
  latitude: null, longitude: null, location_source: null, location_accuracy_m: null, milkings_per_day: 2,
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

// Roles on a farm (FarmMember on the API) and what they may do there: keep in step with FarmMember::ABILITIES
export const FARM_ROLES = { owner: 'Owner', manager: 'Manager', worker: 'Worker', vet: 'Vet' };

export function canManageFarm(farm) {
  return farm?.my_role === 'owner' || farm?.my_role === 'manager';
}

/** Owners manage everyone; managers manage workers (and vets), not other managers or the owner. */
export function canManageMember(myRole, member) {
  if (member.role === 'owner') return false;
  if (myRole === 'owner') return true;
  return myRole === 'manager' && member.role !== 'manager';
}

export function farmPlace(farm) {
  return [farm.village, farm.sub_county, farm.county?.name].filter(Boolean).join(', ');
}
