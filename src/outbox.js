import { reactive } from 'vue';
import { api } from './api';
import { auth } from './auth';
import { org } from './org';

// Records made with no signal (milkings, deliveries, health records) wait here, on the phone, and
// are sent in the order they were made as soon as there is a connection. Every record carries
// its own id or typing time, so sending one twice (the reply got lost) never makes a copy
// (see the API's MilkLedger, MilkDeliveryController::store, AnimalEventController::store).
//
// Item: { id, kind: milk|delivery|event, path, body, orgId, userId, farmId, label, createdAt,
//         status: waiting|failed, error }
// Failed = the server refused it (e.g. the cow was removed): it stays until someone reads why
// and discards it, so nothing typed is ever lost silently.

const KEY = 'mc-outbox';
const RETRY_MS = 30000;

function read() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export const outbox = reactive({
  items: read(),
  sending: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  get mine() {
    return this.items.filter((i) => i.userId === auth.user?.id);
  },
  get waiting() {
    return this.mine.filter((i) => i.status === 'waiting');
  },
  get failed() {
    return this.mine.filter((i) => i.status === 'failed');
  },
});

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(outbox.items));
  } catch {
    /* storage full or private mode: items still live for this visit */
  }
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  // Older phones: RFC 4122 version 4 from Math.random (fine as a record id)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function enqueue({ kind, path, body, farmId = null, label }) {
  const item = {
    id: newId(), kind, path, body, farmId, label,
    orgId: org.currentId, userId: auth.user?.id || null,
    createdAt: new Date().toISOString(), status: 'waiting', error: '',
  };
  outbox.items.push(item);
  persist();
  return item;
}

/**
 * Save now if there's signal, else keep it on the phone. Returns { data } when the server saved it,
 * { queued: item } when it waits here. Refusals from the server (wrong values etc.) throw as usual,
 * so the form can show them while the person is still there.
 */
export async function send(path, { body, kind, farmId = null, label }) {
  if (!outbox.online) return { queued: enqueue({ kind, path, body, farmId, label }) };
  try {
    return { data: await api(path, { method: 'POST', body }) };
  } catch (e) {
    if (e.status === 0) {   // no connection after all
      outbox.online = false;
      return { queued: enqueue({ kind, path, body, farmId, label }) };
    }
    throw e;
  }
}

/** Send whatever is waiting, oldest first. Stops at the first connection problem and tries again later. */
export async function flush() {
  if (outbox.sending || !auth.token) return;
  outbox.sending = true;
  try {
    for (const item of [...outbox.waiting]) {
      try {
        await api(item.path, { method: 'POST', body: item.body, orgId: item.orgId });
        outbox.items = outbox.items.filter((i) => i.id !== item.id);
        persist();
        outbox.online = true;
      } catch (e) {
        if (e.status === 0) {
          outbox.online = false;
          break;
        }
        if (e.status === 401 || e.status === 429 || e.status >= 500) break;   // signed out, busy or down: later
        Object.assign(item, { status: 'failed', error: e.message });        // refused: needs a person
        persist();
      }
    }
  } finally {
    outbox.sending = false;
  }
}

export function discard(id) {
  outbox.items = outbox.items.filter((i) => i.id !== id);
  persist();
}

export function retry(id) {
  const item = outbox.items.find((i) => i.id === id);
  if (item) Object.assign(item, { status: 'waiting', error: '' });
  persist();
  flush();
}

/** Waiting items of one kind that match, for showing "waiting to send" next to saved records. */
export function waitingWhere(kind, match = () => true) {
  return outbox.waiting.filter((i) => i.kind === kind && match(i));
}

// Send as soon as the phone reconnects, and keep trying every 30 s while anything waits
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    outbox.online = true;
    flush();
  });
  window.addEventListener('offline', () => {
    outbox.online = false;
  });
  setInterval(() => {
    if (outbox.waiting.length) flush();
  }, RETRY_MS);
}
