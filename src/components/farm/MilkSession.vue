<script setup>
// The milking sheet: one row per cow on the farm (cows in milk first), type litres, save once.
// Enter jumps to the next cow, scanning an ear tag jumps to that cow. Only changed rows are sent,
// and saving the same sheet twice never double-counts (MilkLedger on the API).
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import QrScanner from '../ui/QrScanner.vue';
import { api } from '../../api';
import { MILK_STATUS, SESSIONS, changedEntries, litresText, parseLitres, sheetTotal } from '../../milk';

const route = useRoute();
const router = useRouter();

const sheet = ref(null);
const edits = reactive({});            // animalId -> { text, discarded }
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const search = ref('');
const showDry = ref(false);
const scanning = ref(false);
const highlight = ref(null);

const pending = computed(() => (sheet.value ? changedEntries(sheet.value.cows, edits) : []));
const total = computed(() => (sheet.value ? sheetTotal(sheet.value.cows, edits) : 0));
const rows = computed(() => {
  if (!sheet.value) return [];
  const q = search.value.trim().toLowerCase();
  return sheet.value.cows.filter((c) => {
    if (q) return `${c.name || ''} ${c.tag_number}`.toLowerCase().includes(q);
    return showDry.value || c.status !== 'dry' || c.log || edits[c.id]?.text;
  });
});
const hiddenDry = computed(() => (sheet.value?.cows || []).filter((c) => c.status === 'dry' && !c.log).length);
const filled = computed(() => (sheet.value?.cows || []).filter((c) => parseLitres(edits[c.id]?.text) !== null).length);

function resetEdits(cows) {
  Object.keys(edits).forEach((k) => delete edits[k]);
  for (const c of cows) edits[c.id] = { text: c.log ? String(c.log.litres) : '', discarded: !!c.log?.discarded };
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const q = new URLSearchParams();
    if (route.query.day) q.set('day', route.query.day);
    if (route.query.session) q.set('session', route.query.session);
    sheet.value = await api(`/holdings/${route.params.id}/milk/session?${q}`);
    resetEdits(sheet.value.cows);
    if (route.query.cow) focusCow(route.query.cow);
  } catch (e) {
    error.value = e.status === 403 ? 'You’re not on this farm’s team.' : e.message;
  } finally {
    loading.value = false;
  }
}

async function confirmDiscardChanges() {
  if (!pending.value.length) return true;
  const { isConfirmed } = await Swal.fire({
    icon: 'warning', title: 'Unsaved milk', text: `${pending.value.length} cow${pending.value.length > 1 ? 's' : ''} not saved yet. Leave without saving?`,
    showCancelButton: true, confirmButtonText: 'Leave', cancelButtonText: 'Stay', focusCancel: true,
  });
  return isConfirmed;
}

async function pick(change) {
  if (!(await confirmDiscardChanges())) return;
  // A query change stays on this page (no leave guard); load() replaces the sheet and its edits
  router.replace({ query: { ...route.query, ...change, cow: undefined } });
}

watch(() => [route.query.day, route.query.session], load);

async function save() {
  const entries = pending.value;
  if (!entries.length || saving.value) return;
  saving.value = true;
  try {
    const res = await api(`/holdings/${sheet.value.farm.id}/milk/session`, {
      method: 'POST', body: { day: sheet.value.day, session: sheet.value.session, entries },
    });
    sheet.value = res;
    resetEdits(res.cows);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Saved · ${litresText(res.total)} this milking`, showConfirmButton: false, timer: 2200 });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t save', text: e.status === 0 ? `${e.message} Your entries are still here; try again when you have signal.` : e.message });
  } finally {
    saving.value = false;
  }
}

function invalid(c) {
  return Number.isNaN(parseLitres(edits[c.id]?.text));
}

// Enter = next cow (fast entry with one thumb)
function next(i) {
  const inputs = [...document.querySelectorAll('.ms-input')];
  inputs[i + 1]?.focus();
}

async function focusCow(animalId) {
  const cow = sheet.value?.cows.find((c) => c.id === animalId);
  if (!cow) return false;
  search.value = '';
  if (cow.status === 'dry') showDry.value = true;
  await nextTick();
  const el = document.getElementById(`ms-${cow.id}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.querySelector('input')?.focus({ preventScroll: true });
  highlight.value = cow.id;
  setTimeout(() => (highlight.value = null), 1800);
  return true;
}

async function onScan(code) {
  scanning.value = false;
  const cow = sheet.value?.cows.find((c) => c.qr_code === code);
  if (!cow || !(await focusCow(cow.id))) {
    Swal.fire({ icon: 'info', title: 'Not on this list', text: 'That tag belongs to an animal that isn’t a cow on this farm.' });
  }
}

onBeforeRouteLeave(async () => confirmDiscardChanges());
onMounted(load);
</script>

<template>
  <div class="mc-page ms-page">
    <div class="container" style="max-width: 760px">
      <router-link :to="`/farm/${route.params.id}`" class="back-link"><Icon name="arrow-left" :size="16" /> {{ sheet?.farm.name || 'Farm' }}</router-link>

      <div v-if="loading && !sheet" class="mc-skeleton mt-3" style="height: 420px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else-if="sheet">
        <header class="mc-page-head mt-2">
          <span class="mc-eyebrow">Milk recording</span>
          <h1>{{ SESSIONS[sheet.session] }} milking</h1>
        </header>

        <div class="ms-controls mc-card">
          <div class="seg" role="tablist" aria-label="Milking">
            <button v-for="s in sheet.sessions" :key="s" type="button" role="tab" :class="{ on: s === sheet.session }" :aria-selected="s === sheet.session" @click="pick({ session: s })">
              {{ SESSIONS[s] }}
            </button>
          </div>
          <label class="visually-hidden" for="ms-day">Day</label>
          <input id="ms-day" type="date" class="form-control ms-day" :value="sheet.day" :max="sheet.today" @change="pick({ day: $event.target.value })" />
        </div>

        <div class="d-flex gap-2 my-3">
          <label class="visually-hidden" for="ms-search">Find a cow</label>
          <input id="ms-search" v-model="search" type="search" class="form-control" placeholder="Find by name or tag" />
          <button type="button" class="btn btn-outline flex-none" @click="scanning = true"><Icon name="frame" :size="18" /> Scan</button>
        </div>

        <div v-if="!sheet.cows.length" class="mc-card p-4 text-center text-secondary">
          No cows on this farm yet. Register female animals under Herd and they’ll appear here.
        </div>

        <ul v-else class="ms-list">
          <li v-for="(c, i) in rows" :id="`ms-${c.id}`" :key="c.id" class="ms-row mc-card" :class="{ flash: highlight === c.id, done: parseLitres(edits[c.id]?.text) !== null }">
            <div class="ms-who">
              <strong class="text-truncate">{{ c.name || `Tag ${c.tag_number}` }}</strong>
              <span class="ms-meta">
                <template v-if="c.name">{{ c.tag_number }} · </template>
                <span class="mc-chip" :class="MILK_STATUS[c.status].chip">{{ MILK_STATUS[c.status].label }}</span>
                <template v-if="c.days_in_milk != null"> · day {{ c.days_in_milk }}</template>
              </span>
            </div>
            <div class="ms-entry">
              <div class="ms-litres" :class="{ invalid: invalid(c) }">
                <input
                  v-model="edits[c.id].text"
                  class="form-control ms-input"
                  type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off"
                  :placeholder="c.last_litres != null ? String(c.last_litres) : '0.0'"
                  :aria-label="`Litres from ${c.name || c.tag_number}`"
                  :aria-invalid="invalid(c)"
                  @keydown.enter.prevent="next(i)"
                />
                <span aria-hidden="true">l</span>
              </div>
              <label class="ms-discard" :title="'Milk not fit to sell (sick, treated, colostrum)'">
                <input v-model="edits[c.id].discarded" type="checkbox" :disabled="parseLitres(edits[c.id]?.text) === null" /> Discard
              </label>
            </div>
            <p v-if="invalid(c)" class="ms-error" role="alert">Enter 0 to 60 litres.</p>
          </li>
        </ul>

        <button v-if="hiddenDry && !showDry && !search" type="button" class="btn btn-link btn-sm mt-2" @click="showDry = true">
          Show {{ hiddenDry }} dry cow{{ hiddenDry > 1 ? 's' : '' }}
        </button>
      </template>
    </div>

    <!-- Sticky save bar, above the phone tab bar -->
    <div v-if="sheet && sheet.cows.length" class="ms-bar">
      <div class="container ms-bar-inner" style="max-width: 760px">
        <div>
          <strong class="ms-total">{{ litresText(total) }}</strong>
          <span class="ms-sub">{{ filled }} of {{ sheet.cows.length }} cows<template v-if="pending.length"> · {{ pending.length }} unsaved</template></span>
        </div>
        <button class="btn btn-primary btn-lg" :disabled="!pending.length || saving" @click="save">
          <span v-if="saving" class="spinner-border spinner-border-sm"></span>
          {{ pending.length ? 'Save' : 'Saved' }}
        </button>
      </div>
    </div>

    <QrScanner v-if="scanning" @code="onScan" @close="scanning = false" />
  </div>
</template>

<style>
.ms-page { padding-bottom: 170px; }
.ms-controls { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; justify-content: space-between; padding: .6rem; box-shadow: none; }
.ms-day { width: auto; min-width: 160px; }
.ms-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
.ms-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; padding: .65rem .8rem; box-shadow: none; transition: border-color .2s, background .6s; }
.ms-row.done { border-color: var(--mc-green-100); }
.ms-row.flash { background: var(--mc-gold-50); border-color: var(--mc-gold-500); }
.ms-who { flex: 1; min-width: 150px; display: flex; flex-direction: column; }
.ms-meta { font-size: .8rem; color: var(--mc-muted); }
.ms-meta .mc-chip { font-size: .72rem; padding: .05rem .4rem; }
.ms-entry { display: flex; align-items: center; gap: .6rem; }
.ms-litres { position: relative; }
.ms-litres span { position: absolute; right: .7rem; top: 50%; transform: translateY(-50%); color: var(--mc-muted); pointer-events: none; }
.ms-input { width: 96px; padding-right: 1.6rem; font-size: 1.15rem; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.ms-input::placeholder { font-weight: 400; color: #b5b9b2; }
.ms-litres.invalid .ms-input { border-color: var(--mc-danger); }
.ms-discard { display: inline-flex; align-items: center; gap: .3rem; font-size: .82rem; color: var(--mc-ink-2); margin: 0; }
.ms-error { width: 100%; margin: 0; font-size: .8rem; color: var(--mc-danger); }
.ms-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 1010; background: var(--mc-surface); border-top: 1px solid var(--mc-border); box-shadow: 0 -4px 16px rgb(28 37 30 / 8%); }
.ms-bar-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: .7rem; padding-bottom: .7rem; }
.ms-total { display: block; font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.ms-sub { font-size: .8rem; color: var(--mc-muted); }
@media (max-width: 767.98px) {
  .ms-bar { bottom: calc(60px + env(safe-area-inset-bottom)); }   /* sits on top of the tab bar */
}
</style>
