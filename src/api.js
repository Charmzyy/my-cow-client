import { API_URL } from './config';
import { auth, clearSession } from './auth';

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

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  const options = { method, headers };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
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
    if (res.status >= 500) {
      console.error(`API ${method} ${path} failed`, data);
      throw new ApiError('Something went wrong on our side. Please try again in a moment.', res.status, data);
    }
    throw new ApiError(messageFrom(data) || `Request failed (${res.status}).`, res.status, data);
  }
  return data;
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
