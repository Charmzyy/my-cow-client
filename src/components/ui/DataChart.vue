<script setup>
// Every chart in the app: bars, stacked bars, lines, areas, pies and doughnuts from the same data
// shape. Thin marks with 4px rounded ends, 2px lines, a quiet grid, a hover/tap tooltip, a legend
// whenever colour tells series apart, and a table view so the numbers never live only in a
// picture. Colours come from the caller (chartPalette.js); text and grid use the theme's tokens,
// and the chart redraws when the theme changes.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, DoughnutController, Filler, Legend,
  LinearScale, LineController, LineElement, PieController, PointElement, Tooltip,
} from 'chart.js';
import { themeState } from '../../theme';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler, Legend,
  LinearScale, LineController, LineElement, PieController, PointElement, Tooltip,
);

const props = defineProps({
  type: { type: String, default: 'bar' },            // bar | stacked | line | area | pie | doughnut
  labels: { type: Array, required: true },           // x axis, or the slices of a pie
  // [{ label, values: [], color, dashed? }]. A pie uses the first series and `sliceColors`.
  series: { type: Array, required: true },
  sliceColors: { type: Array, default: null },
  title: { type: String, required: true },           // for screen readers and the table caption
  format: { type: Function, default: (v) => String(v) },   // tooltip / axis / table value
  details: { type: Array, default: null },           // optional extra tooltip line per x position
  height: { type: String, default: '220px' },
});

const canvas = ref(null);
const showTable = ref(false);
let chart = null;

function token(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** #rrggbb + alpha (0-1) for area fills. */
function alpha(hex, a) {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

const isRound = () => ['pie', 'doughnut'].includes(props.type);

function datasets(surface) {
  if (isRound()) {
    return [{
      label: props.series[0]?.label || props.title,
      data: props.series[0]?.values || [],
      backgroundColor: props.sliceColors || props.series[0]?.color,
      borderColor: surface,          // a 2px surface gap between slices
      borderWidth: 2,
      hoverOffset: 6,
    }];
  }

  const line = ['line', 'area'].includes(props.type);
  const few = props.labels.length <= 14;
  return props.series.map((s) => (line
    ? {
      type: 'line',
      label: s.label,
      data: s.values,
      borderColor: s.color,
      backgroundColor: props.type === 'area' && !s.dashed ? alpha(s.color, 0.18) : s.color,
      fill: props.type === 'area' && !s.dashed ? 'origin' : false,
      borderWidth: 2,
      borderDash: s.dashed ? [5, 4] : undefined,
      tension: 0.25,
      pointRadius: few && !s.dashed ? 3 : 0,
      pointHoverRadius: 5,
      pointBackgroundColor: s.color,
      pointBorderColor: surface,
      pointBorderWidth: 2,          // 2px surface ring where markers overlap lines
    }
    : {
      label: s.label,
      data: s.values,
      backgroundColor: s.color,
      borderColor: surface,
      borderWidth: props.type === 'stacked' ? { top: 2 } : 0,   // a 2px surface gap between stacked segments
      borderRadius: props.type === 'stacked' ? 2 : { topLeft: 4, topRight: 4 },
      borderSkipped: 'bottom',
      maxBarThickness: 22,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
    }));
}

function draw() {
  chart?.destroy();
  if (!canvas.value) return;
  const ink = token('--mc-ink-2', '#4a554c');
  const muted = token('--mc-muted', '#6b746c');
  const grid = token('--mc-border', '#e4dfd2');
  const surface = token('--mc-surface', '#ffffff');
  const round = isRound();
  const legend = round || props.series.length > 1;

  chart = new Chart(canvas.value, {
    type: round ? props.type : ['line', 'area'].includes(props.type) ? 'line' : 'bar',
    data: { labels: props.labels, datasets: datasets(surface) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: round ? { mode: 'nearest', intersect: true } : { mode: 'index', intersect: false },
      cutout: props.type === 'doughnut' ? '58%' : undefined,
      color: ink,
      plugins: {
        legend: {
          display: legend,
          position: 'bottom',
          labels: { color: ink, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 14, font: { size: 12 } },
        },
        tooltip: {
          backgroundColor: token('--mc-ink', '#1c251e'),
          titleColor: surface,
          bodyColor: surface,
          footerColor: surface,
          padding: 10,
          displayColors: legend,
          callbacks: {
            label: (ctx) => {
              const value = round ? ctx.parsed : ctx.parsed.y;
              if (!round) return `${legend ? `${ctx.dataset.label}: ` : ''}${props.format(value)}`;
              const total = ctx.dataset.data.reduce((t, v) => t + v, 0) || 1;
              return `${props.format(value)} (${Math.round((value / total) * 100)}%)`;
            },
            footer: (items) => (!round && items[0] ? props.details?.[items[0].dataIndex] || '' : ''),
          },
        },
      },
      scales: round ? {} : {
        x: {
          stacked: props.type === 'stacked',
          grid: { display: false },
          border: { color: grid },
          ticks: { color: muted, maxRotation: 0, autoSkip: true, autoSkipPadding: 10, font: { size: 11 } },
        },
        y: {
          stacked: props.type === 'stacked',
          beginAtZero: true,
          grid: { color: grid, drawTicks: false },
          border: { display: false },
          ticks: { color: muted, padding: 6, maxTicksLimit: 5, font: { size: 11 }, callback: (v) => props.format(v) },
        },
      },
    },
  });
}

onMounted(draw);
watch(() => [props.type, props.labels, props.series, props.sliceColors, themeState.version], draw, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div>
    <div class="datachart" :style="{ height }">
      <canvas ref="canvas" role="img" :aria-label="title"></canvas>
    </div>
    <button type="button" class="btn btn-link btn-sm p-0 mt-1 chart-table-toggle" :aria-expanded="showTable" @click="showTable = !showTable">
      {{ showTable ? 'Hide numbers' : 'Show as table' }}
    </button>
    <div v-if="showTable" class="chart-table">
      <table class="table table-sm mb-0">
        <caption class="visually-hidden">{{ title }}</caption>
        <thead v-if="series.length > 1">
          <tr><th scope="col"></th><th v-for="s in series" :key="s.label" scope="col" class="text-end">{{ s.label }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="(label, i) in labels" :key="i">
            <th scope="row">{{ label }}</th>
            <td v-for="s in series" :key="s.label" class="text-end">{{ format(s.values[i]) }}</td>
            <td v-if="details?.[i]" class="text-secondary">{{ details[i] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.datachart { position: relative; width: 100%; }
.chart-table-toggle { font-size: .82rem; }
.chart-table { max-height: 260px; overflow: auto; margin-top: .35rem; font-size: .85rem; font-variant-numeric: tabular-nums; }
</style>
