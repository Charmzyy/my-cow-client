<script setup>
// A chart the farmer can change: what it shows, grouped how, over which dates, in what form.
// One row of controls above the chart; the choice is saved to the person's settings
// (preferences.dashboards[id]) so it survives reloads and follows them to another phone.
// Data comes from GET /holdings/{id}/analytics (AnalyticsController).
import { computed, reactive, ref, watch } from 'vue';
import DataChart from './DataChart.vue';
import Icon from './Icon.vue';
import { api } from '../../api';
import {
  CHART_TYPES, GRANULARITIES, METRICS, RANGES, bucketLabel, daysBetween, foldCategories, formatValue, groupKind,
  hasData, metricsFor, normaliseChoice, previousRange, rangeDates, seriesTotal, suggestGranularity, toCsv, typesFor,
} from '../../analytics';
import { breedLabel } from '../../breeds';
import { otherColor, slotColor, slotCount } from '../../chartPalette';
import { kenyaToday } from '../../milk';
import { prefs, savePrefs } from '../../preferences';
import { themeState } from '../../theme';

const props = defineProps({
  id: { type: String, required: true },                 // saved under this name, e.g. "farm-milk"
  farm: { type: Object, required: true },               // { id, name }
  defaults: { type: Object, required: true },           // { metric, group, type, range?, granularity? }
  money: { type: Boolean, default: false },             // may see milk income (owners and managers)
  only: { type: Array, default: null },                 // limit the metrics on offer
  height: { type: String, default: '220px' },
});

const allowed = computed(() => metricsFor({ money: props.money, only: props.only }));
const choice = reactive(normaliseChoice(prefs.dashboards[props.id], props.defaults, allowed.value));
const isSaved = computed(() => !!prefs.dashboards[props.id]);

const data = ref(null);       // the API's answer
const previous = ref(null);   // same metric, the period before (compare)
const loading = ref(true);
const error = ref('');
let request = 0;

const metric = computed(() => METRICS[choice.metric]);
const kind = computed(() => groupKind(choice.group));
const dates = computed(() => rangeDates(choice, kenyaToday()));
const span = computed(() => daysBetween(dates.value.from, dates.value.to));
const fmt = (v) => formatValue(v, data.value?.unit || metric.value.unit);

async function load() {
  const id = ++request;
  loading.value = true;
  error.value = '';
  const query = (range) => new URLSearchParams({
    metric: choice.metric, group: choice.group, from: range.from, to: range.to, granularity: choice.granularity,
  }).toString();
  try {
    const [now, before] = await Promise.all([
      api(`/holdings/${props.farm.id}/analytics?${query(dates.value)}`),
      choice.compare ? api(`/holdings/${props.farm.id}/analytics?${query(previousRange(dates.value))}`) : null,
    ]);
    if (id !== request) return;   // a newer choice was made while this one loaded
    data.value = now;
    previous.value = before;
  } catch (e) {
    if (id === request) error.value = e.message;
  } finally {
    if (id === request) loading.value = false;
  }
}

// Picking something changes the chart at once and saves the choice a moment later
function change(patch) {
  Object.assign(choice, patch);
  Object.assign(choice, normaliseChoice(choice, props.defaults, allowed.value));
  savePrefs({ dashboards: { [props.id]: { ...choice } } }).catch(() => { /* offline: kept on this phone */ });
}

function setRange(range) {
  const patch = { range };
  if (range === 'custom') {
    Object.assign(patch, { from: choice.from || dates.value.from, to: choice.to || dates.value.to });
  } else {
    patch.granularity = suggestGranularity(Number(range));
  }
  change(patch);
}

function reset() {
  Object.assign(choice, normaliseChoice(null, props.defaults, allowed.value));
  savePrefs({ dashboards: { [props.id]: null } }).catch(() => {});
}

watch(() => [choice.metric, choice.group, choice.granularity, choice.compare, dates.value.from, dates.value.to, props.farm.id], load, { immediate: true });

// ---- What DataChart draws ------------------------------------------------------------------

const categoryLabel = (l) => (choice.metric === 'herd.composition' && choice.group === 'breed' ? breedLabel(l) : l);
const round = computed(() => ['pie', 'doughnut'].includes(choice.type));

const chart = computed(() => {
  const d = data.value;
  if (!d) return null;
  const mode = themeState.mode;

  if (d.kind === 'category') {
    const values = d.series[0]?.values || [];
    if (round.value) {
      // A pie can only colour as many slices as the palette has; the rest become "Other" (grey)
      const f = foldCategories(d.labels, values, slotCount(prefs.chart_palette));
      return {
        labels: f.labels.map(categoryLabel),
        series: [{ label: d.series[0].label, values: f.values }],
        sliceColors: f.labels.map((l, i) => (l === 'Other' ? otherColor(mode) : slotColor(prefs.chart_palette, mode, i))),
      };
    }
    return { labels: d.labels.map(categoryLabel), series: [{ label: d.series[0]?.label || '', values, color: slotColor(prefs.chart_palette, mode, 0) }] };
  }

  const slots = metric.value.slots;
  const series = d.series.map((s) => ({ ...s, color: slotColor(prefs.chart_palette, mode, slots[s.key] ?? 0) }));
  if (previous.value) {
    for (const p of previous.value.series) {
      const color = slotColor(prefs.chart_palette, mode, slots[p.key] ?? 0);
      // Same number of buckets as now; week/month edges can differ by one, so pad or trim
      const values = d.labels.map((_, i) => p.values[i] ?? 0);
      series.push({ key: `${p.key}-prev`, label: `${p.label}, previous period`, values, color, dashed: true });
    }
  }
  return { labels: d.labels.map((l) => bucketLabel(l, d.granularity, span.value)), series };
});

const total = computed(() => (data.value ? seriesTotal(data.value.series) : 0));
const empty = computed(() => data.value && !hasData(data.value.series));

function download() {
  const c = chart.value;
  if (!c) return;
  const csv = toCsv(c.labels, c.series);
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));   // BOM: Excel reads the dashes and accents
  const name = `${props.farm.name}-${choice.metric}-${choice.group}-${data.value.from}-to-${data.value.to}`.replace(/[^\w.-]+/g, '-');
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const uid = `cc-${props.id}`;
</script>

<template>
  <section class="mc-card p-3 chart-card">
    <div class="cc-head">
      <h2 class="h6 mb-0">{{ metric.label }} <span class="text-secondary fw-normal">· {{ metric.groups[choice.group] }}</span></h2>
      <span v-if="data && !empty" class="small text-secondary">
        {{ fmt(total) }}<template v-if="metric.undated"> in the herd today</template><template v-else> in total</template>
      </span>
    </div>

    <!-- Controls: one row, wraps on phones -->
    <div class="cc-controls">
      <template v-if="allowed.length > 1">
        <label class="visually-hidden" :for="`${uid}-metric`">Show</label>
        <select :id="`${uid}-metric`" class="form-select form-select-sm" :value="choice.metric" @change="change({ metric: $event.target.value })">
          <option v-for="m in allowed" :key="m" :value="m">{{ METRICS[m].label }}</option>
        </select>
      </template>
      <label class="visually-hidden" :for="`${uid}-group`">Group</label>
      <select :id="`${uid}-group`" class="form-select form-select-sm" :value="choice.group" @change="change({ group: $event.target.value })">
        <option v-for="(label, g) in metric.groups" :key="g" :value="g">{{ label }}</option>
      </select>
      <template v-if="!metric.undated">
        <label class="visually-hidden" :for="`${uid}-range`">Dates</label>
        <select :id="`${uid}-range`" class="form-select form-select-sm" :value="choice.range" @change="setRange($event.target.value)">
          <option v-for="(label, r) in RANGES" :key="r" :value="r">{{ label }}</option>
        </select>
      </template>
      <template v-if="kind === 'time'">
        <label class="visually-hidden" :for="`${uid}-gran`">Each bar or point is a</label>
        <select :id="`${uid}-gran`" class="form-select form-select-sm" :value="choice.granularity" @change="change({ granularity: $event.target.value })">
          <option v-for="(label, g) in GRANULARITIES" :key="g" :value="g">By {{ label.toLowerCase() }}</option>
        </select>
      </template>
      <label class="visually-hidden" :for="`${uid}-type`">Chart type</label>
      <select :id="`${uid}-type`" class="form-select form-select-sm" :value="choice.type" @change="change({ type: $event.target.value })">
        <option v-for="t in typesFor(choice.group)" :key="t" :value="t">{{ CHART_TYPES[t] }}</option>
      </select>
      <label v-if="kind === 'time' && ['line', 'area'].includes(choice.type)" class="cc-check">
        <input type="checkbox" class="form-check-input" :checked="choice.compare" @change="change({ compare: $event.target.checked })" />
        Compare with the period before
      </label>
    </div>

    <div v-if="!metric.undated && choice.range === 'custom'" class="cc-dates">
      <label :for="`${uid}-from`">From</label>
      <input :id="`${uid}-from`" type="date" class="form-control form-control-sm" :value="choice.from" :max="choice.to || kenyaToday()" @change="change({ from: $event.target.value })" />
      <label :for="`${uid}-to`">to</label>
      <input :id="`${uid}-to`" type="date" class="form-control form-control-sm" :value="choice.to" :min="choice.from" :max="kenyaToday()" @change="change({ to: $event.target.value })" />
    </div>

    <div v-if="loading && !data" class="mc-skeleton" :style="{ height }"></div>
    <div v-else-if="error" class="mc-alert mc-alert-error" role="alert">
      <Icon name="alert" :size="18" /><span>{{ error }} <button class="btn btn-link btn-sm p-0 align-baseline" @click="load">Try again</button></span>
    </div>
    <p v-else-if="empty" class="small text-secondary my-4 text-center">
      {{ metric.undated ? 'No animals on this farm yet.' : 'Nothing recorded for these dates.' }}
    </p>
    <div v-else-if="chart" :class="{ 'cc-stale': loading }">
      <DataChart :type="choice.type" :labels="chart.labels" :series="chart.series" :slice-colors="chart.sliceColors"
        :title="`${metric.label}, ${metric.groups[choice.group].toLowerCase()}`" :format="fmt" :height="height" />
    </div>

    <div class="cc-foot">
      <button v-if="data && !empty" type="button" class="btn btn-link btn-sm p-0" @click="download"><Icon name="download" :size="15" /> Download (CSV)</button>
      <button v-if="isSaved" type="button" class="btn btn-link btn-sm p-0 text-secondary" @click="reset">Reset chart</button>
    </div>
  </section>
</template>

<style>
.chart-card { display: flex; flex-direction: column; gap: .6rem; min-width: 0; }
.cc-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: .25rem .75rem; }
.cc-controls { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
.cc-controls .form-select { width: auto; min-height: 36px; font-size: .85rem; padding-top: .3rem; padding-bottom: .3rem; }
.cc-check { display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; color: var(--mc-ink-2); }
.cc-dates { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; font-size: .85rem; }
.cc-dates .form-control { width: auto; min-height: 36px; }
.cc-stale { opacity: .55; transition: opacity .2s; }
.cc-foot { display: flex; flex-wrap: wrap; gap: 1rem; }
.cc-foot .btn { font-size: .82rem; }
</style>
