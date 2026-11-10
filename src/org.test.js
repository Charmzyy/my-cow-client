import { beforeEach, describe, expect, it } from 'vitest';
import { canManageOrg, canManageOrgMember, org, pickCurrent, resetOrg, setOrganisations, switchOrg } from './org';

const personal = { id: 'p', type: 'personal', my_role: 'owner' };
const coop = { id: 'c', type: 'coop', my_role: 'member' };

describe('pickCurrent', () => {
  it('keeps the saved workspace while it is still mine', () => {
    expect(pickCurrent([personal, coop], 'c')).toBe('c');
  });
  it('falls back to the first one (my own farms) when the saved one is gone', () => {
    expect(pickCurrent([personal, coop], 'gone')).toBe('p');
    expect(pickCurrent([personal], null)).toBe('p');
  });
  it('is empty for someone in no workspace yet', () => {
    expect(pickCurrent([], 'p')).toBe(null);
  });
});

describe('workspace store', () => {
  beforeEach(resetOrg);

  it('reports a change only when the current workspace moves', () => {
    expect(setOrganisations([personal, coop])).toBe(true);
    expect(setOrganisations([personal, coop])).toBe(false);
  });
  it('only switches to a workspace I am in', () => {
    setOrganisations([personal, coop]);
    switchOrg('someone-elses');
    expect(org.currentId).toBe('p');
    switchOrg('c');
    expect(org.current).toEqual(coop);
  });
});

// Must match OrganisationMember::MANAGERS / OrganisationController::authorizeRoleChange on the API
describe('permissions', () => {
  it('lets owners and admins run a workspace', () => {
    expect(canManageOrg({ my_role: 'owner' })).toBe(true);
    expect(canManageOrg({ my_role: 'admin' })).toBe(true);
    expect(canManageOrg({ my_role: 'member' })).toBe(false);
    expect(canManageOrg(null)).toBe(false);
  });
  it('never lets anyone remove the owner, and keeps admins for the owner', () => {
    expect(canManageOrgMember('owner', { role: 'owner' })).toBe(false);
    expect(canManageOrgMember('owner', { role: 'admin' })).toBe(true);
    expect(canManageOrgMember('admin', { role: 'admin' })).toBe(false);
    expect(canManageOrgMember('admin', { role: 'member' })).toBe(true);
    expect(canManageOrgMember('member', { role: 'member' })).toBe(false);
  });
});
