import { API_URL } from './config';
import { auth, clearSession } from './auth';
import { org, resetOrg } from './org';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// The Laravel API returns errors in several shapes: { errors: {field: [msg]} },
// { message } / { Message }, or a bare ["msg"] array (sometimes with HTTP 200).
export function messageFrom(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.find((x) => typeof x === 'string') || '';
  if (data.errors) return Object.values(data.errors).flat()[0] || '';
  return data.message || data.Message || '';
}

// Signed-in calls carry the token and the chosen workspace. { org: false } asks across all of them
// (e.g. listing every farm I own when moving one between workspaces).
function authHeaders(withOrg = true, orgId = null) {
  const headers = { Accept: 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const workspace = orgId || org.currentId;
  if (auth.token && withOrg && workspace) headers['X-Organisation'] = workspace;
  return headers;
}

// orgId: send under a given workspace (the outbox replays entries in the workspace they were made in)
export async function api(path, { method = 'GET', body, org: withOrg = true, orgId = null } = {}) {
  const headers = authHeaders(withOrg, orgId);

  const options = { method, headers };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  // The offline cache (service worker) keys answers by address only, so reads name their workspace
  // in the address too: otherwise, offline, one workspace's farms could show inside another's.
  let url = `${API_URL}${path}`;
  if (method === 'GET' && headers['X-Organisation']) {
    url += `${url.includes('?') ? '&' : '?'}_ws=${encodeURIComponent(headers['X-Organisation'])}`;
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Expired or revoked token: sign out and send the person to the login page
    if (res.status === 401 && data?.message === 'Unauthenticated.') {
      clearSession();
      window.location.assign('/login');
    }
    // Removed from the workspace (or a stale one from another account): forget it and start again
    if (res.status === 403 && data?.message === 'You are not a member of this organisation.') {
      resetOrg();
      window.location.assign('/');
    }
    // 500 = unexpected crash: hide the details. 503 etc. carry a message meant for people.
    if (res.status === 500 || (res.status > 500 && !messageFrom(data))) {
      console.error(`API ${method} ${path} failed`, data);
      throw new ApiError('Something went wrong on our side. Please try again in a moment.', res.status, data);
    }
    throw new ApiError(messageFrom(data) || `Request failed (${res.status}).`, res.status, data);
  }
  return data;
}

// Download a file (e.g. a certificate PDF) that needs the auth token, so a plain <a href> won't do.
export async function apiDownload(path, filename) {
  const headers = authHeaders(); // errors still come back as JSON

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status >= 500) console.error(`Download ${path} failed`, data);
    throw new ApiError(res.status >= 500 ? 'Something went wrong on our side. Please try again in a moment.' : messageFrom(data) || `Download failed (${res.status}).`, res.status, data);
  }

  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// The admin list endpoints answer 404 when a list is empty; treat that as "no items".
export async function apiList(path, key) {
  try {
    const data = await api(path);
    return (key ? data?.[key] : data) || [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

export function form(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}
