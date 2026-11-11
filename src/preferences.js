import { reactive } from 'vue';
import { api } from './api';
import { org } from './org';
import { applyTheme } from './theme';

// The signed-in person's settings (App\Support\Preferences on the API): theme, accent colour,
// chart colours and each chart card's saved choices. A copy is kept on the phone so the right
// theme paints at start-up, before /me answers, and so charts remember their choices offline.

export const DEFAULTS = Object.freeze({ theme: 'light', accent: null, chart_palette: 'farm', dashboards: {} });
const CACHE = 'mc-prefs';

export const prefs = reactive(structuredClone(DEFAULTS));

function cache() {
  try {
    localStorage.setItem(CACHE, JSON.stringify(prefs));
  } catch {
    /* private mode: settings still apply for this visit */
  }
}

function assign(next) {
  const clean = { ...structuredClone(DEFAULTS), ...(next || {}) };
  for (const key of Object.keys(DEFAULTS)) prefs[key] = clean[key];
  if (!prefs.dashboards || Array.isArray(prefs.dashboards)) prefs.dashboards = {};   // PHP sends [] for an empty map
}

/** Paints the app: the workspace's brand colour (if it has one) wins over the person's accent. */
export function applyCurrentTheme() {
  const brand = org.current && org.current.type !== 'personal' ? org.current.brand_color : null;
  applyTheme({ theme: prefs.theme, accent: prefs.accent, brand });
}

/** At start-up: the settings saved on this phone. */
export function loadCachedPrefs() {
  try {
    assign(JSON.parse(localStorage.getItem(CACHE)));
  } catch {
    assign(null);
  }
  applyCurrentTheme();
}

/** From /me. */
export function setPrefs(next) {
  assign(next);
  cache();
  applyCurrentTheme();
}

/** Signed out: back to the defaults (the next person on this phone has their own). */
export function resetPrefs() {
  assign(null);
  try {
    localStorage.removeItem(CACHE);
  } catch {
    /* ignore */
  }
  applyCurrentTheme();
}

let pending = {};
let timer = null;

/**
 * Change settings now (the screen updates at once) and save them shortly after; quick changes
 * (dragging through colours, flipping chart options) are sent as one request.
 * `dashboards` is merged per card; a card set to null is forgotten.
 */
export function savePrefs(patch, { delay = 600 } = {}) {
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'dashboards') {
      const cards = { ...prefs.dashboards };
      for (const [id, choice] of Object.entries(value)) {
        if (choice === null) delete cards[id];
        else cards[id] = choice;
      }
      prefs.dashboards = cards;
      pending.dashboards = { ...(pending.dashboards || {}), ...value };
    } else {
      prefs[key] = value;
      pending[key] = value;
    }
  }
  cache();
  applyCurrentTheme();

  clearTimeout(timer);
  return new Promise((resolve, reject) => {
    waiters.push({ resolve, reject });   // every caller in the batch hears how the one save went
    timer = setTimeout(async () => {
      const body = pending;
      const batch = waiters;
      pending = {};
      waiters = [];
      try {
        const res = await api('/me/preferences', { method: 'PUT', body });
        batch.forEach((w) => w.resolve(res.preferences));
      } catch (e) {
        batch.forEach((w) => w.reject(e));
      }
    }, delay);
  });
}

let waiters = [];
