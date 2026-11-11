<script setup>
// The farm's home: today's milk at a glance, one tap to start the milking, the last 30 days,
// and the best cows. Farmers and workers land here; with several farms, a switcher picks one.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import ChartCard from '../ui/ChartCard.vue';
import QrScanner from '../ui/QrScanner.vue';
import { api, apiDownload } from '../../api';
import { auth, firstName } from '../../auth';
import { FARM_ROLES, canManageFarm } from '../../farms';
import { SESSIONS, kesText, litresText } from '../../milk';
import { formatDate } from '../../requests';

const DOSE_LABEL = { vaccination: 'Vaccination', deworming: 'Deworming', treatment: 'Treatment' };

const route = useRoute();
const router = useRouter();
const LAST_FARM = 'mc-farm';

const farms = ref([]);
const summary = ref(null);
const health = ref(null);       // { withdrawals, due } from /holdings/{id}/health
const loading = ref(true);
const error = ref('');
const scanning = ref(false);
const printing = ref(false);

const farm = computed(() => farms.value.find((f) => f.id === route.params.id) || null);
const series = computed(() => summary.value?.series || []);
const today = computed(() => series.value[series.value.length - 1] || null);
const weekAverage = computed(() => {
  const week = series.value.slice(-7);
  return week.length ? week.reduce((t, d) => t + d.produced, 0) / week.length : 0;
});
const sold = computed(() => (summary.value ? summary.value.totals.coop + summary.value.totals.sale : 0));

function remember(id) {
  try { localStorage.setItem(LAST_FARM, id); } catch { /* private mode */ }
}

async function loadFarms() {
  loading.value = true;
  error.value = '';
  try {
    farms.value = (await api('/holdings')).holdings;
    if (!route.params.id && farms.value.length) {
      let last = null;
      try { last = localStorage.getItem(LAST_FARM); } catch { /* ignore */ }
      const pick = farms.value.find((f) => f.id === last) || farms.value[0];
      router.replace(`/farm/${pick.id}`);
      return;
    }
    await loadSummary();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function loadSummary() {
  if (!farm.value) return;
  remember(farm.value.id);
  summary.value = null;
  health.value = null;
  const id = farm.value.id;
  // The health card is extra: if it fails, the milk numbers still show
  api(`/holdings/${id}/health`).then((h) => { if (farm.value?.id === id) health.value = h; }).catch(() => {});
  try {
    summary.value = await api(`/holdings/${id}/milk/summary?days=30`);
  } catch (e) {
    error.value = e.message;
  }
}

watch(() => route.params.id, (id) => (id ? loadSummary() : loadFarms()));

async function onScan(code) {
  scanning.value = false;
  try {
    const { animal } = await api(`/tags/${code}`);
    router.push(`/herd/${animal.id}`);
  } catch (e) {
    Swal.fire({ icon: 'info', title: 'Cow not found', text: e.message });
  }
}

async function printTags() {
  printing.value = true;
  try {
    await apiDownload(`/holdings/${farm.value.id}/tags.pdf`, `ear-tags-${farm.value.name}.pdf`);
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t make the tag sheet', text: e.message });
  } finally {
    printing.value = false;
  }
}

onMounted(loadFarms);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <div v-if="loading" class="mc-skeleton" style="height: 420px"></div>
      <div v-else-if="error && !summary" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <EmptyState v-else-if="!farms.length && auth.isWorker" icon="pin" title="You’re not on a farm"
        text="Ask the farmer to add you to their farm’s team, then sign in again." />
      <EmptyState v-else-if="!farms.length" icon="pin" title="Add your farm first"
        text="Your farm is where your cows are kept and milked. Add it once; everything else hangs off it.">
        <router-link to="/farms" class="btn btn-primary"><Icon name="plus" :size="18" /> Add farm</router-link>
      </EmptyState>

      <template v-else-if="farm">
        <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <span class="mc-eyebrow">{{ firstName() ? `Habari, ${firstName()}` : 'Farm' }}<template v-if="farm.my_role !== 'owner'"> · {{ FARM_ROLES[farm.my_role] }}</template></span>
            <h1>{{ farm.name }}</h1>
          </div>
          <div v-if="farms.length > 1">
            <label class="visually-hidden" for="farm-pick">Farm</label>
            <select id="farm-pick" class="form-select" :value="farm.id" @change="router.push(`/farm/${$event.target.value}`)">
              <option v-for="f in farms" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
        </header>

        <!-- Actions first: this screen is opened at milking time -->
        <div class="fh-actions">
          <router-link :to="`/farm/${farm.id}/milk`" class="fh-primary">
            <Icon name="sprout" :size="26" />
            <span><strong>Record milking</strong><small>Pre-filled list of your cows</small></span>
            <Icon name="chevron-right" :size="22" class="ms-auto" />
          </router-link>
          <button type="button" class="fh-action" @click="scanning = true"><Icon name="frame" :size="22" /><span>Scan cow</span></button>
          <router-link :to="`/farm/${farm.id}/sales`" class="fh-action"><Icon name="review" :size="22" /><span>Deliveries</span></router-link>
          <router-link to="/herd" class="fh-action"><Icon name="herd" :size="22" /><span>Herd</span></router-link>
        </div>

        <div v-if="!summary" class="mc-skeleton mt-3" style="height: 260px"></div>
        <template v-else>
          <!-- Headline numbers -->
          <div class="fh-stats">
            <div class="mc-card fh-stat">
              <span>Today so far</span>
              <strong>{{ litresText(today?.produced) }}</strong>
              <small v-if="today?.discarded">{{ litresText(today.discarded) }} discarded</small>
            </div>
            <div class="mc-card fh-stat">
              <span>Daily average, 7 days</span>
              <strong>{{ litresText(weekAverage) }}</strong>
            </div>
            <div class="mc-card fh-stat">
              <span>Sold, 30 days</span>
              <strong>{{ litresText(sold, 0) }}</strong>
              <small v-if="summary.totals.rejected">{{ litresText(summary.totals.rejected) }} rejected</small>
            </div>
            <div v-if="summary.shows_money" class="mc-card fh-stat">
              <span>Milk income, 30 days</span>
              <strong>{{ kesText(summary.totals.income) }}</strong>
              <small v-if="summary.totals.unpaid">{{ kesText(summary.totals.unpaid) }} not yet paid</small>
            </div>
          </div>

          <!-- Health: whose milk / meat can't be sold yet, and doses due. Hidden when there's nothing to act on. -->
          <section v-if="health && (health.withdrawals.length || health.due.length)" class="mc-card p-3 mt-3 fh-health">
            <h2 class="h6">Health</h2>
            <ul class="fh-list">
              <li v-for="w in health.withdrawals" :key="`w-${w.animal.id}`">
                <span class="fh-dot danger" aria-hidden="true"></span>
                <router-link :to="`/herd/${w.animal.id}`">{{ w.animal.name || `Tag ${w.animal.tag_number}` }}</router-link>
                <span>
                  <template v-if="w.milk_clear_on">Milk discarded until {{ formatDate(w.milk_clear_on) }}</template>
                  <template v-if="w.milk_clear_on && w.meat_clear_on"> · </template>
                  <template v-if="w.meat_clear_on">no slaughter before {{ formatDate(w.meat_clear_on) }}</template>
                  <template v-if="w.product"> · {{ w.product }}</template>
                </span>
              </li>
              <li v-for="d in health.due" :key="`d-${d.event_id}`">
                <span class="fh-dot" :class="d.overdue ? 'danger' : 'gold'" aria-hidden="true"></span>
                <router-link :to="`/herd/${d.animal.id}`">{{ d.animal.name || `Tag ${d.animal.tag_number}` }}</router-link>
                <span>
                  {{ DOSE_LABEL[d.type] }}<template v-if="d.product"> ({{ d.product }})</template>
                  {{ d.overdue ? 'overdue since' : 'due' }} {{ formatDate(d.due_on) }}
                </span>
              </li>
            </ul>
          </section>

          <!-- Charts: each one can be changed (what, dates, chart type) and remembers the choice -->
          <div class="d-flex justify-content-between align-items-baseline mt-4 mb-2">
            <h2 class="h5 mb-0">Charts</h2>
            <router-link :to="`/farm/${farm.id}/reports`" class="small fw-semibold"><Icon name="chart" :size="15" /> All reports</router-link>
          </div>
          <ChartCard id="farm-milk" :farm="farm" :money="canManageFarm(farm)"
            :defaults="{ metric: 'milk.produced', group: 'time', type: 'stacked', range: '30', granularity: 'day' }" />
          <div class="fh-charts mt-3">
            <ChartCard id="farm-outlets" :farm="farm" :money="canManageFarm(farm)" height="200px"
              :defaults="{ metric: 'milk.outlets', group: 'outlet', type: 'doughnut', range: '30' }" />
            <ChartCard id="farm-herd" :farm="farm" :money="canManageFarm(farm)" height="200px"
              :defaults="{ metric: 'herd.composition', group: 'breed', type: 'pie' }" />
          </div>

          <section v-if="summary.cows.length" class="mc-card p-3 mt-3">
            <h2 class="h6">Cows · last 30 days</h2>
            <ol class="fh-cows">
              <li v-for="c in summary.cows.slice(0, 5)" :key="c.id">
                <router-link :to="`/herd/${c.id}`">{{ c.name || `Tag ${c.tag_number}` }}</router-link>
                <span>{{ litresText(c.per_day) }} a day</span>
              </li>
            </ol>
          </section>

          <div v-if="canManageFarm(farm)" class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-outline btn-sm" :disabled="printing" @click="printTags">
              <span v-if="printing" class="spinner-border spinner-border-sm"></span><Icon v-else name="download" :size="16" /> Print ear-tag QR stickers
            </button>
            <router-link :to="`/farms/${farm.id}/team`" class="btn btn-outline btn-sm"><Icon name="users" :size="16" /> Team</router-link>
            <span class="small text-secondary align-self-center">Milkings a day: {{ farm.milkings_per_day }} ({{ (farm.milkings_per_day === 3 ? ['am', 'midday', 'pm'] : farm.milkings_per_day === 1 ? ['am'] : ['am', 'pm']).map((s) => SESSIONS[s]).join(', ') }}). Change under Farms.</span>
          </div>
        </template>
      </template>
    </div>

    <QrScanner v-if="scanning" @code="onScan" @close="scanning = false" />
  </div>
</template>

<style>
.fh-list { list-style: none; margin: 0; padding: 0; }
.fh-list li { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem .6rem; padding: .45rem 0; border-top: 1px solid var(--mc-border); font-size: .9rem; }
.fh-list li:first-child { border-top: 0; }
.fh-list li > span:last-child { color: var(--mc-ink-2); }
.fh-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; align-self: center; background: var(--mc-muted); }
.fh-dot.danger { background: var(--mc-danger); }
.fh-dot.gold { background: var(--mc-gold-500); }
.fh-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
.fh-primary {
  grid-column: 1 / -1; display: flex; align-items: center; gap: .9rem; padding: 1rem 1.1rem; border-radius: var(--mc-radius);
  background: var(--mc-primary); color: var(--mc-on-primary); box-shadow: var(--mc-shadow);
}
.fh-primary:hover { color: var(--mc-on-primary); background: var(--mc-primary-hover); }
.fh-primary strong { display: block; font-size: 1.15rem; }
.fh-primary small { display: block; opacity: .85; }
.fh-action {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem; min-height: 78px;
  background: var(--mc-surface); border: 1px solid var(--mc-border); border-radius: var(--mc-radius); color: var(--mc-ink); font-weight: 650; font-size: .9rem;
}
.fh-action:hover { color: var(--mc-green-800); border-color: var(--mc-green-700); }
.fh-stats { display: grid; gap: .6rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top: 1rem; }
.fh-stat { padding: .85rem 1rem; box-shadow: none; display: flex; flex-direction: column; }
.fh-stat span { font-size: .8rem; color: var(--mc-muted); font-weight: 600; }
.fh-stat strong { font-size: 1.5rem; font-variant-numeric: tabular-nums; color: var(--mc-ink); }
.fh-stat small { font-size: .78rem; color: var(--mc-muted); }
.fh-charts { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
.fh-cows { margin: 0; padding-left: 1.2rem; }
.fh-cows li { padding: .3rem 0; }
.fh-cows li span { color: var(--mc-muted); font-size: .88rem; margin-left: .4rem; }
</style>
