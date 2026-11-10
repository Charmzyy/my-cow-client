import { reactive } from 'vue';

// The organisation (workspace) the app works in. Every API call sends its id as X-Organisation,
// so the farms, herd and charts on screen are that workspace's only (see ResolveOrganisation on the API).

export const ORG_ROLES = { owner: 'Owner', admin: 'Admin', member: 'Member' };
export const ORG_TYPES = { personal: 'My farms', coop: 'Co-operative', company: 'Company' };

function read() {
  try {
    return localStorage.getItem('org') || null;
  } catch {
    return null;
  }
}

function save(id) {
  try {
    if (id) localStorage.setItem('org', id);
    else localStorage.removeItem('org');
  } catch {
    /* private mode: remembered for this tab only */
  }
}

export const org = reactive({
  list: [],          // from /me: [{ id, name, type, my_role, holdings_count, members_count }]
  currentId: read(),
  get current() {
    return this.list.find((o) => o.id === this.currentId) || null;
  },
});

/** The saved workspace if it's still one of mine, else the first (the API lists my personal one first). */
export function pickCurrent(list, savedId) {
  if (!list?.length) return null;
  return list.some((o) => o.id === savedId) ? savedId : list[0].id;
}

/** Apply /me's organisations. Returns true when the current workspace changed. */
export function setOrganisations(list) {
  const before = org.currentId;
  org.list = list || [];
  org.currentId = pickCurrent(org.list, org.currentId);
  save(org.currentId);
  return before !== org.currentId;
}

export function switchOrg(id) {
  if (!org.list.some((o) => o.id === id)) return;
  org.currentId = id;
  save(id);
}

export function resetOrg() {
  org.list = [];
  org.currentId = null;
  save(null);
}

/** Owners and admins run a workspace: name, people, farms in it. Must match OrganisationMember::MANAGERS. */
export function canManageOrg(o) {
  return ['owner', 'admin'].includes(o?.my_role);
}

/** Admins manage members; only the owner manages admins (OrganisationController::authorizeRoleChange). */
export function canManageOrgMember(myRole, member) {
  if (!member || member.role === 'owner') return false;
  if (myRole === 'owner') return true;
  return myRole === 'admin' && member.role === 'member';
}
