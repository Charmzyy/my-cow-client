<script setup>
// Personal settings for every account: name and phone, theme, the app's colour, chart colours.
// Appearance changes apply the moment they're tapped and save in the background
// (preferences.js); the preview shows them on real pieces of the app.
import { computed, reactive, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import DataChart from '../ui/DataChart.vue';
import { api } from '../../api';
import { auth, setSession } from '../../auth';
import { org } from '../../org';
import { prefs, savePrefs } from '../../preferences';
import { DEFAULT_ACCENT, THEMES, contrast, isHex, okForWhiteText, themeState } from '../../theme';
import { PALETTES, slotColor } from '../../chartPalette';

const TABS = { appearance: 'Appearance', profile: 'Profile' };
const tab = ref('appearance');

// Accent colours that all pass 4.5:1 with white text
const SWATCHES = [
  { hex: DEFAULT_ACCENT, name: 'MyCow green' },
  { hex: '#0f766e', name: 'Teal' },
  { hex: '#1d4ed8', name: 'Blue' },
  { hex: '#6d28d9', name: 'Purple' },
  { hex: '#8a2f35', name: 'Red ochre' },
  { hex: '#374151', name: 'Charcoal' },
];

const brandOrg = computed(() => (org.current && org.current.type !== 'personal' && org.current.brand_color ? org.current : null));
const accent = computed(() => prefs.accent || DEFAULT_ACCENT);
const custom = ref(isHex(prefs.accent) && !SWATCHES.some((s) => s.hex === prefs.accent) ? prefs.accent : '#2e5e8a');
const customRatio = computed(() => contrast(custom.value, '#ffffff'));
const saveError = ref('');

function save(patch) {
  saveError.value = '';
  savePrefs(patch).catch((e) => { saveError.value = `Not saved: ${e.message}`; });
}

function pickAccent(hex) {
  save({ accent: hex === DEFAULT_ACCENT ? null : hex });
}

function useCustom() {
  if (okForWhiteText(custom.value)) pickAccent(custom.value);
}

// Example data for the chart preview (clearly marked as an example on screen)
const sample = computed(() => {
  void themeState.version;
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    labels,
    series: [
      { label: 'Co-op', values: [42, 45, 41, 47, 44, 46, 43], color: slotColor(prefs.chart_palette, themeState.mode, 0) },
      { label: 'Local sale', values: [6, 4, 7, 5, 6, 8, 5], color: slotColor(prefs.chart_palette, themeState.mode, 1) },
      { label: 'Home use', values: [3, 3, 2, 3, 3, 4, 3], color: slotColor(prefs.chart_palette, themeState.mode, 2) },
    ],
  };
});

// ---- Profile -------------------------------------------------------------------------------
const profile = reactive({ fullname: auth.user?.fullname || '', phone: auth.user?.phone || '' });
const errors = ref({});
const savingProfile = ref(false);

async function saveProfile() {
  if (savingProfile.value) return;
  savingProfile.value = true;
  errors.value = {};
  try {
    const { user } = await api('/', { method: 'PUT', body: { fullname: profile.fullname.trim(), phone: profile.phone.trim() || null } });
    setSession({ token: auth.token, user, role: [auth.role] });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Profile saved', showConfirmButton: false, timer: 2000 });
  } catch (e) {
    errors.value = e.data?.errors ? Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]])) : {};
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t save', text: e.message });
  } finally {
    savingProfile.value = false;
  }
}
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 820px">
      <header class="mc-page-head">
        <span class="mc-eyebrow">Settings</span>
        <h1>Your settings</h1>
        <p>These follow your account to any phone you sign in on.</p>
      </header>

      <div class="seg mb-4" role="tablist" aria-label="Settings sections">
        <button v-for="(label, key) in TABS" :key="key" type="button" role="tab" :aria-selected="tab === key" :class="{ on: tab === key }" @click="tab = key">{{ label }}</button>
      </div>

      <div v-if="saveError" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ saveError }}</div>

      <!-- Appearance -->
      <template v-if="tab === 'appearance'">
        <section class="mc-card p-3 p-sm-4 mb-3">
          <h2 class="h5 mb-1">Theme</h2>
          <p class="small text-secondary">Light reads best in sunlight. Dark is easier on the eyes at night.</p>
          <div class="st-choices" role="radiogroup" aria-label="Theme">
            <label v-for="(label, key) in THEMES" :key="key" class="choice" :class="{ on: prefs.theme === key }">
              <input type="radio" name="theme" class="visually-hidden" :value="key" :checked="prefs.theme === key" @change="save({ theme: key })" />
              <span class="st-theme-dot" :class="`st-${key}`" aria-hidden="true"></span>{{ label }}
            </label>
          </div>
        </section>

        <section class="mc-card p-3 p-sm-4 mb-3">
          <h2 class="h5 mb-1">App colour</h2>
          <p class="small text-secondary">Buttons, links and highlights.</p>
          <div v-if="brandOrg" class="mc-alert mc-alert-info mb-3">
            <Icon name="alert" :size="18" />
            <span>While you work in <b>{{ brandOrg.name }}</b>, the app uses its colour. Yours applies in your other workspaces.</span>
          </div>
          <div class="st-swatches" role="radiogroup" aria-label="App colour">
            <label v-for="s in SWATCHES" :key="s.hex" class="st-swatch" :class="{ on: accent === s.hex }" :title="s.name">
              <input type="radio" name="accent" class="visually-hidden" :checked="accent === s.hex" @change="pickAccent(s.hex)" />
              <span class="st-swatch-dot" :style="{ background: s.hex }" aria-hidden="true"><Icon v-if="accent === s.hex" name="check" :size="18" /></span>
              <span class="st-swatch-name">{{ s.name }}</span>
            </label>
          </div>
          <div class="st-custom">
            <label for="st-custom" class="form-label mb-0">Your own colour</label>
            <input id="st-custom" v-model="custom" type="color" class="form-control form-control-color" />
            <button type="button" class="btn btn-outline btn-sm" :disabled="!okForWhiteText(custom)" @click="useCustom">Use this colour</button>
            <span v-if="!okForWhiteText(custom)" class="small st-warn"><Icon name="alert" :size="15" /> Too light for white text ({{ customRatio }}:1, needs 4.5:1). Pick a darker shade.</span>
          </div>
        </section>

        <section class="mc-card p-3 p-sm-4 mb-3">
          <h2 class="h5 mb-1">Chart colours</h2>
          <p class="small text-secondary">Every chart also has a legend and a <b>Show as table</b> view.</p>
          <div class="st-palettes" role="radiogroup" aria-label="Chart colours">
            <label v-for="(p, key) in PALETTES" :key="key" class="st-palette" :class="{ on: prefs.chart_palette === key }">
              <input type="radio" name="palette" class="visually-hidden" :checked="prefs.chart_palette === key" @change="save({ chart_palette: key })" />
              <span class="st-palette-row" aria-hidden="true">
                <span v-for="c in (themeState.mode === 'dark' ? p.dark : p.light)" :key="c" :style="{ background: c }"></span>
              </span>
              <strong>{{ p.label }}</strong>
              <small>{{ p.hint }}</small>
            </label>
          </div>
        </section>

        <!-- Live preview on real pieces of the app -->
        <section class="mc-card p-3 p-sm-4 mb-3">
          <h2 class="h5 mb-3">Preview</h2>
          <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
            <button type="button" class="btn btn-primary btn-sm">Record milking</button>
            <button type="button" class="btn btn-outline btn-sm">Deliveries</button>
            <span class="mc-chip mc-chip-green"><Icon name="check" :size="13" /> In milk</span>
            <span class="mc-chip mc-chip-gold"><Icon name="clock" :size="13" /> Due</span>
            <a href="#" @click.prevent>A link</a>
          </div>
          <p class="small text-secondary mb-1">Example chart (made-up numbers)</p>
          <DataChart type="stacked" :labels="sample.labels" :series="sample.series" title="Example: where the milk went this week" :format="(v) => `${v} l`" height="180px" />
        </section>
      </template>

      <!-- Profile -->
      <form v-else class="mc-card p-3 p-sm-4" novalidate @submit.prevent="saveProfile">
        <div class="form-grid">
          <div class="span-2">
            <label class="form-label" for="p-name">Full name</label>
            <input id="p-name" v-model="profile.fullname" class="form-control" :class="{ 'is-invalid': errors.fullname }" maxlength="255" autocomplete="name" />
            <div v-if="errors.fullname" class="invalid-feedback">{{ errors.fullname }}</div>
          </div>
          <div>
            <label class="form-label" for="p-phone">Phone</label>
            <input id="p-phone" v-model="profile.phone" type="tel" inputmode="tel" class="form-control" :class="{ 'is-invalid': errors.phone }" maxlength="20" autocomplete="tel" placeholder="07…" />
            <div v-if="errors.phone" class="invalid-feedback">{{ errors.phone }}</div>
          </div>
          <div v-if="auth.user?.email">
            <label class="form-label" for="p-email">Email</label>
            <input id="p-email" :value="auth.user.email" class="form-control" readonly />
            <p class="form-hint">You sign in with this. It can’t be changed here.</p>
          </div>
          <div v-else-if="auth.user?.login_phone">
            <label class="form-label" for="p-login">Sign-in phone</label>
            <input id="p-login" :value="auth.user.login_phone" class="form-control" readonly />
            <p class="form-hint">The farmer who added you can change it.</p>
          </div>
        </div>
        <div class="form-actions justify-content-end">
          <button class="btn btn-primary" :disabled="savingProfile || !profile.fullname.trim()">
            <span v-if="savingProfile" class="spinner-border spinner-border-sm"></span> Save profile
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style>
.st-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .6rem; }
.st-choices .choice { gap: .55rem; justify-content: flex-start; padding-left: .85rem; }
.st-theme-dot { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--mc-border-strong); flex: none; }
.st-light { background: #f7f4ec; }
.st-dark { background: #1c2420; }
.st-contrast { background: linear-gradient(135deg, #000 50%, #fff 50%); }
.st-system { background: linear-gradient(135deg, #1c2420 50%, #f7f4ec 50%); }
.st-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: .6rem; }
.st-swatch { display: flex; flex-direction: column; align-items: center; gap: .35rem; padding: .6rem .3rem; border-radius: var(--mc-radius-sm); border: 1.5px solid transparent; cursor: pointer; }
.st-swatch.on { border-color: var(--mc-primary-text); background: var(--mc-green-50); }
.st-swatch:focus-within { outline: 3px solid var(--mc-gold-500); outline-offset: 2px; }
.st-swatch-dot { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: #fff; }
.st-swatch-name { font-size: .8rem; font-weight: 600; color: var(--mc-ink-2); text-align: center; }
.st-custom { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--mc-border); }
.st-custom .form-control-color { width: 56px; min-height: 44px; padding: .25rem; }
.st-warn { color: var(--mc-danger); display: inline-flex; gap: .3rem; align-items: center; }
.st-palettes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .6rem; }
.st-palette { display: flex; flex-direction: column; gap: .3rem; padding: .85rem; border: 1.5px solid var(--mc-border-strong); border-radius: var(--mc-radius-sm); cursor: pointer; background: var(--mc-surface); }
.st-palette.on { border-color: var(--mc-primary-text); background: var(--mc-green-50); }
.st-palette:focus-within { outline: 3px solid var(--mc-gold-500); outline-offset: 2px; }
.st-palette small { color: var(--mc-muted); }
.st-palette-row { display: flex; gap: 3px; }
.st-palette-row span { flex: 1; height: 18px; border-radius: 4px; }
</style>
