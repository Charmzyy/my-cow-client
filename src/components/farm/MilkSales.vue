<script setup>
// Where the milk went: co-op deliveries, local sales, home use, calves. The week table balances
// each day (milked = delivered + sold + home + calves + discarded + unaccounted) so leaks show up.
// Owners and managers keep the buyer list and prices; everyone on the team records deliveries.
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { auth } from '../../auth';
import { canManageFarm } from '../../farms';
import { OUTLETS, kenyaToday, kesText, litresText, shortDay } from '../../milk';

const route = useRoute();
const farmId = route.params.id;

const farm = ref(null);
const summary = ref(null);
const deliveries = ref([]);
const buyers = ref([]);
const day = ref(kenyaToday());
const loading = ref(true);
const error = ref('');

const blank = () => ({ kind: 'coop', buyer_id: '', litres: '', rejected_litres: '', price_per_litre: '', paid: false, note: '' });
const f = reactive(blank());
const errors = ref({});
const saving = ref(false);

const manager = computed(() => canManageFarm(farm.value));
const sold = computed(() => OUTLETS[f.kind].sold);
const buyerChoices = computed(() => buyers.value.filter((b) => b.active && b.kind === (f.kind === 'coop' ? 'coop' : 'local')));
const week = computed(() => (summary.value?.series || []).slice().reverse().map((d) => {
  const out = d.coop + d.sale + d.home + d.calves + d.discarded;
  return { ...d, unaccounted: Math.round((d.produced - out) * 10) / 10 };
}));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [{ holdings }, sum, list, b] = await Promise.all([
      api('/holdings'),
      api(`/holdings/${farmId}/milk/summary?days=7`),
      api(`/holdings/${farmId}/milk/deliveries?from=${day.value}&to=${day.value}`),
      api(`/holdings/${farmId}/milk/buyers`),
    ]);
    farm.value = holdings.find((h) => h.id === farmId) || null;
    summary.value = sum;
    deliveries.value = list.deliveries;
    buyers.value = b.buyers;
  } catch (e) {
    error.value = e.status === 403 ? 'You’re not on this farm’s team.' : e.message;
  } finally {
    loading.value = false;
  }
}

function setKind(kind) {
  f.kind = kind;
  f.buyer_id = '';
  f.paid = kind === 'sale';   // local sales are usually cash on the day
}

function pickBuyer() {
  const b = buyers.value.find((x) => x.id === f.buyer_id);
  if (b?.price_per_litre != null && f.price_per_litre === '') f.price_per_litre = String(b.price_per_litre);
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
  try {
    await api(`/holdings/${farmId}/milk/deliveries`, {
      method: 'POST',
      body: {
        day: day.value, kind: f.kind, buyer_id: sold.value ? f.buyer_id || null : null,
        litres: num(f.litres), rejected_litres: f.kind === 'coop' ? num(f.rejected_litres) : null,
        price_per_litre: sold.value ? num(f.price_per_litre) : null, paid: sold.value && f.paid, note: f.note || null,
      },
    });
    Object.assign(f, blank(), { kind: f.kind, paid: f.kind === 'sale' });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Recorded', showConfirmButton: false, timer: 1800 });
    await load();
  } catch (e) {
    errors.value = e.data?.errors ? Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]])) : {};
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t save', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function remove(d) {
  const { isConfirmed } = await Swal.fire({ title: 'Remove this entry?', showCancelButton: true, confirmButtonText: 'Remove', customClass: { confirmButton: 'mc-danger' } });
  if (!isConfirmed) return;
  try {
    await api(`/holdings/${farmId}/milk/deliveries/${d.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t remove it', text: e.message });
  }
}

async function togglePaid(d) {
  try {
    await api(`/holdings/${farmId}/milk/deliveries/${d.id}`, {
      method: 'PUT',
      body: { day: d.day, session: d.session, kind: d.kind, buyer_id: d.buyer_id, litres: d.litres, rejected_litres: d.rejected_litres, price_per_litre: d.price_per_litre, note: d.note, paid: !d.paid },
    });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t update it', text: e.message });
  }
}

// The buyer dialog is built from an HTML string: escape what people typed
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function editBuyer(b = null) {
  const { value } = await Swal.fire({
    title: b ? `Edit ${b.name}` : 'Add a buyer',
    html: `
      <input id="sb-name" class="swal2-input" placeholder="Name, e.g. Githunguri Dairy" maxlength="80" value="${b ? esc(b.name) : ''}">
      <select id="sb-kind" class="swal2-select">
        <option value="coop" ${!b || b.kind === 'coop' ? 'selected' : ''}>Co-op / dairy</option>
        <option value="local" ${b?.kind === 'local' ? 'selected' : ''}>Local buyer</option>
      </select>
      <input id="sb-price" class="swal2-input" inputmode="decimal" placeholder="Price per litre (KES)" value="${b?.price_per_litre ?? ''}">`,
    showCancelButton: true,
    confirmButtonText: 'Save',
    preConfirm: () => {
      const name = document.getElementById('sb-name').value.trim();
      const price = document.getElementById('sb-price').value.trim().replace(',', '.');
      if (!name) return Swal.showValidationMessage('Enter a name.');
      if (price && !(Number(price) >= 0)) return Swal.showValidationMessage('The price must be a number.');
      return { name, kind: document.getElementById('sb-kind').value, price_per_litre: price === '' ? null : Number(price) };
    },
  });
  if (!value) return;
  try {
    await api(`/holdings/${farmId}/milk/buyers${b ? `/${b.id}` : ''}`, { method: b ? 'PUT' : 'POST', body: value });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t save the buyer', text: e.message });
  }
}

function changeDay(value) {
  day.value = value || kenyaToday();
  load();
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 860px">
      <router-link :to="`/farm/${farmId}`" class="back-link"><Icon name="arrow-left" :size="16" /> {{ farm?.name || 'Farm' }}</router-link>

      <div v-if="loading && !summary" class="mc-skeleton mt-3" style="height: 420px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else-if="summary">
        <header class="mc-page-head mt-2">
          <span class="mc-eyebrow">Milk</span>
          <h1>Deliveries &amp; sales</h1>
          <p>Record where each day’s milk went. Milk that isn’t accounted for shows up in the table below.</p>
        </header>

        <!-- Add an entry -->
        <form class="mc-card p-3 p-sm-4 mb-4" novalidate @submit.prevent="save">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 class="h5 mb-0">Record milk out</h2>
            <input type="date" class="form-control" style="width: auto" :value="day" :max="kenyaToday()" aria-label="Day" @change="changeDay($event.target.value)" />
          </div>
          <div class="seg w-100 mb-3" role="tablist" aria-label="Where the milk went">
            <button v-for="(o, key) in OUTLETS" :key="key" type="button" role="tab" class="flex-fill" :class="{ on: f.kind === key }" :aria-selected="f.kind === key" @click="setKind(key)">{{ o.label }}</button>
          </div>
          <div class="row g-3">
            <div v-if="sold" class="col-sm-6">
              <label class="form-label" for="sd-buyer">{{ f.kind === 'coop' ? 'Co-op / dairy' : 'Buyer' }} <span class="text-secondary fw-normal">(optional)</span></label>
              <select id="sd-buyer" v-model="f.buyer_id" class="form-select" @change="pickBuyer">
                <option value="">—</option>
                <option v-for="b in buyerChoices" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <p v-if="!buyerChoices.length && manager" class="form-hint mt-1">Add your buyers below to fill in their price automatically.</p>
            </div>
            <div class="col-6 col-sm-3">
              <label class="form-label" for="sd-litres">Litres</label>
              <input id="sd-litres" v-model="f.litres" inputmode="decimal" class="form-control" :class="{ 'is-invalid': errors.litres }" required />
              <div v-if="errors.litres" class="invalid-feedback">{{ errors.litres }}</div>
            </div>
            <div v-if="f.kind === 'coop'" class="col-6 col-sm-3">
              <label class="form-label" for="sd-rej">Rejected</label>
              <input id="sd-rej" v-model="f.rejected_litres" inputmode="decimal" class="form-control" :class="{ 'is-invalid': errors.rejected_litres }" placeholder="0" />
              <div v-if="errors.rejected_litres" class="invalid-feedback">{{ errors.rejected_litres }}</div>
            </div>
            <div v-if="sold" class="col-6 col-sm-3">
              <label class="form-label" for="sd-price">KES / litre</label>
              <input id="sd-price" v-model="f.price_per_litre" inputmode="decimal" class="form-control" :class="{ 'is-invalid': errors.price_per_litre }" />
              <div v-if="errors.price_per_litre" class="invalid-feedback">{{ errors.price_per_litre }}</div>
            </div>
            <div v-if="sold" class="col-6 col-sm-3 d-flex align-items-end">
              <label class="form-check mb-2"><input v-model="f.paid" type="checkbox" class="form-check-input" /> Paid</label>
            </div>
            <div class="col-12">
              <label class="form-label" for="sd-note">Note <span class="text-secondary fw-normal">(optional)</span></label>
              <input id="sd-note" v-model="f.note" class="form-control" maxlength="160" placeholder="e.g. Receipt no., who collected" />
            </div>
          </div>
          <div v-if="errors.day" class="mc-alert mc-alert-error mt-3"><Icon name="alert" :size="18" />{{ errors.day }}</div>
          <button class="btn btn-primary mt-3" :disabled="saving || !f.litres"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Save</button>
        </form>

        <!-- That day's entries -->
        <section class="mb-4">
          <h2 class="h6">Entries for {{ shortDay(day) }}</h2>
          <p v-if="!deliveries.length" class="small text-secondary">Nothing recorded for this day yet.</p>
          <ul v-else class="sd-list mc-card">
            <li v-for="d in deliveries" :key="d.id">
              <span class="sd-main">
                <strong>{{ OUTLETS[d.kind].label }}<template v-if="d.buyer"> · {{ d.buyer.name }}</template></strong>
                <span>
                  {{ litresText(d.litres) }}<template v-if="d.rejected_litres"> ({{ litresText(d.rejected_litres) }} rejected)</template>
                  <template v-if="d.amount != null"> · {{ kesText(d.amount) }}</template>
                  <template v-if="d.note"> · {{ d.note }}</template>
                </span>
              </span>
              <button v-if="OUTLETS[d.kind].sold && d.amount != null && manager" type="button" class="mc-chip sd-paid" :class="d.paid ? 'mc-chip-green' : 'mc-chip-gold'" :aria-label="d.paid ? 'Mark as not paid' : 'Mark as paid'" @click="togglePaid(d)">
                {{ d.paid ? 'Paid' : 'Unpaid' }}
              </button>
              <span v-else-if="OUTLETS[d.kind].sold && d.amount != null" class="mc-chip" :class="d.paid ? 'mc-chip-green' : 'mc-chip-gold'">{{ d.paid ? 'Paid' : 'Unpaid' }}</span>
              <button v-if="manager || d.recorded_by === auth.user?.id" class="btn btn-sm ev-del" :aria-label="`Remove ${OUTLETS[d.kind].label} entry`" @click="remove(d)"><Icon name="trash" :size="15" /></button>
            </li>
          </ul>
        </section>

        <!-- The week, balanced -->
        <section class="mc-card p-3 mb-4">
          <h2 class="h6">Last 7 days</h2>
          <div class="table-responsive">
            <table class="table table-sm sd-week mb-0">
              <thead>
                <tr><th scope="col">Day</th><th scope="col">Milked</th><th scope="col">Co-op</th><th scope="col">Sold</th><th scope="col">Home</th><th scope="col">Calves</th><th scope="col">Discarded</th><th scope="col">Unaccounted</th></tr>
              </thead>
              <tbody>
                <tr v-for="d in week" :key="d.day">
                  <th scope="row"><button type="button" class="btn btn-link btn-sm p-0" @click="changeDay(d.day)">{{ shortDay(d.day) }}</button></th>
                  <td>{{ d.produced || '—' }}</td><td>{{ d.coop || '—' }}</td><td>{{ d.sale || '—' }}</td><td>{{ d.home || '—' }}</td><td>{{ d.calves || '—' }}</td><td>{{ d.discarded || '—' }}</td>
                  <td :class="{ 'sd-gap': d.produced && Math.abs(d.unaccounted) > Math.max(2, d.produced * 0.05) }">{{ d.produced ? d.unaccounted : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="small text-secondary mt-2 mb-0">Litres. A highlighted gap means milk was recorded but not where it went, or the other way round.</p>
        </section>

        <!-- Buyers and prices -->
        <section v-if="manager" class="mc-card p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="h6 mb-0">Buyers &amp; prices</h2>
            <button class="btn btn-outline btn-sm" @click="editBuyer()"><Icon name="plus" :size="15" /> Add buyer</button>
          </div>
          <p v-if="!buyers.length" class="small text-secondary mb-0">No buyers yet. Add your co-op and regular buyers with their price per litre.</p>
          <ul v-else class="sd-list">
            <li v-for="b in buyers" :key="b.id">
              <span class="sd-main"><strong>{{ b.name }}</strong><span>{{ b.kind === 'coop' ? 'Co-op / dairy' : 'Local buyer' }} · {{ b.price_per_litre != null ? `KES ${b.price_per_litre}/l` : 'no price set' }}</span></span>
              <button class="btn btn-outline btn-sm" :aria-label="`Edit ${b.name}`" @click="editBuyer(b)"><Icon name="edit" :size="15" /></button>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<style>
.sd-list { list-style: none; margin: 0; padding: 0; }
.sd-list li { display: flex; align-items: center; gap: .6rem; padding: .7rem .9rem; border-bottom: 1px solid var(--mc-border); }
.sd-list li:last-child { border-bottom: 0; }
.sd-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.sd-main span { font-size: .85rem; color: var(--mc-muted); }
.sd-paid { border: 1px solid; cursor: pointer; }
.sd-week { font-variant-numeric: tabular-nums; font-size: .88rem; white-space: nowrap; }
.sd-week td, .sd-week th { text-align: right; }
.sd-week th:first-child { text-align: left; }
.sd-gap { background: var(--mc-gold-50); font-weight: 700; }
</style>
