import { reactive } from 'vue';

// One reactive source of truth for "who is signed in", so the header, tab bar and
// router guards all update the moment someone logs in or out.

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
  // sessions saved before the role key existed: derive it from the user record
  role: storedToken ? read('role') || (storedUser ? (storedUser.role == 1 ? 'admin' : 'user') : null) : null,
  get isAdmin() {
    return !!this.token && this.role === 'admin';
  },
  get isUser() {
    return !!this.token && this.role === 'user';
  },
});

// Accepts the /login response ({ token, user, role: ['admin'] }) or the /register one ({ token, user }).
export function setSession({ token, user, role }) {
  auth.token = token;
  auth.user = user;
  auth.role = Array.isArray(role) ? role[0] : user?.role == 1 ? 'admin' : 'user';
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

export function homePath() {
  if (auth.isAdmin) return '/admin/AdminDashboard';
  if (auth.isUser) return '/user/userpost';
  return '/';
}

export function firstName() {
  return (auth.user?.fullname || auth.user?.name || '').trim().split(/\s+/)[0] || '';
}
