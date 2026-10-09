import { describe, expect, it } from 'vitest';
import { canManageFarm, canManageMember, farmPayload } from './farms';

// Must match FarmMember::ABILITIES / FarmMemberController::authorizeTeam on the API
describe('canManageFarm', () => {
  it('is for owners and managers only', () => {
    expect(canManageFarm({ my_role: 'owner' })).toBe(true);
    expect(canManageFarm({ my_role: 'manager' })).toBe(true);
    expect(canManageFarm({ my_role: 'worker' })).toBe(false);
    expect(canManageFarm({ my_role: 'vet' })).toBe(false);
    expect(canManageFarm(null)).toBe(false);
  });
});

describe('canManageMember', () => {
  it('never lets anyone remove the owner', () => {
    expect(canManageMember('owner', { role: 'owner' })).toBe(false);
    expect(canManageMember('manager', { role: 'owner' })).toBe(false);
  });

  it('lets the owner manage everyone else', () => {
    for (const role of ['manager', 'worker', 'vet']) expect(canManageMember('owner', { role })).toBe(true);
  });

  it('lets a manager manage workers but not other managers', () => {
    expect(canManageMember('manager', { role: 'worker' })).toBe(true);
    expect(canManageMember('manager', { role: 'manager' })).toBe(false);
  });

  it('gives workers no team powers', () => {
    expect(canManageMember('worker', { role: 'worker' })).toBe(false);
  });
});

describe('farmPayload', () => {
  it('trims text, turns blanks into null and rounds the GPS accuracy', () => {
    const out = farmPayload({ name: '  Kimani Farm ', county_id: 22, village: '', location_accuracy_m: 12.7, extra: 'ignored' });
    expect(out.name).toBe('Kimani Farm');
    expect(out.village).toBeNull();
    expect(out.location_accuracy_m).toBe(13);
    expect(out).not.toHaveProperty('extra');
  });
});
