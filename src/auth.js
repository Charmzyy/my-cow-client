import { reactive } from 'vue';

// One reactive source of truth for "who is signed in", so the header, tab bar and
// router guards all update the moment someone logs in or out.

// Roles match the API: farmer | officer | org_admin | admin
export const ROLES = ['farmer', 'officer', 'org_admin', 'admin'];

// Older API versions / saved sessions used 1 / 0 and 'user'
function normaliseRole(role) {
  if (role === 1 || role === '1') return 'admin';
  if (role === 0 || role === '0' || role === 'user') return 'farmer';
  return ROLES.includes(role) ? role : null;
}

function read(key) {
  try {
    const value = localStorage.getItem(key);
    return value && value !== 'undefined' && value !== 'null' ? value : null;
  } catch {
    return null;
  }
}

function readUser() {
  try {
    return JSON.parse(read('user')) || null;
  } catch {
    return null; // a corrupt value must never stop the app from mounting
  }
}

const storedUser = readUser();
const storedToken = read('token');

export const auth = reactive({
  token: storedToken,
  user: storedUser,
  role: storedToken ? normaliseRole(read('role') ?? storedUser?.role) : null,
  get isAdmin() {
    return !!this.token && this.role === 'admin';
  },
  get isFarmer() {
    return !!this.token && this.role === 'farmer';
  },
  get isOfficer() {
    return !!this.token && this.role === 'officer';
  },
});

// Accepts the /login response ({ token, user, role: ['admin'] }) or the /register one ({ token, user }).
export function setSession({ token, user, role }) {
  auth.token = token;
  auth.user = user;
  auth.role = normaliseRole(Array.isArray(role) ? role[0] : user?.role) || 'farmer';
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('role', auth.role);
  } catch {
    /* private mode: session lasts for this tab only */
  }
}

export function clearSession() {
  auth.token = null;
  auth.user = null;
  auth.role = null;
  try {
    ['token', 'user', 'role'].forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

// Organisation screens arrive later; until then that role lands on the home page.
export function homePath() {
  if (auth.isAdmin) return '/admin/AdminDashboard';
  if (auth.isOfficer) return '/officer';
  if (auth.isFarmer) return '/herd';
  return '/';
}

// Apply a fresh /me response (role may have changed, e.g. officer application approved)
export function refreshSession({ user, role }) {
  if (!auth.token) return false;
  const next = normaliseRole(Array.isArray(role) ? role[0] : user?.role);
  const changed = next !== auth.role;
  setSession({ token: auth.token, user, role: next ? [next] : role });
  return changed;
}

export function roleLabel(role = auth.role) {
  return { farmer: 'Farmer', officer: 'Officer', org_admin: 'Organisation', admin: 'Admin' }[role] || '';
}

export function firstName() {
  return (auth.user?.fullname || auth.user?.name || '').trim().split(/\s+/)[0] || '';
}
