<script setup>
// One-series bar chart (e.g. litres per day). Single series = no legend: the card title names it.
// Thin bars with 4px rounded tops on a quiet grid, a tooltip on hover/tap, and a table view so
// the numbers never live only in a picture.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps({
  labels: { type: Array, required: true },        // x axis, e.g. ['Mon 6', 'Tue 7']
  values: { type: Array, required: true },        // numbers, same length
  title: { type: String, required: true },        // for screen readers and the table caption
  format: { type: Function, default: (v) => String(v) },   // tooltip / table value, e.g. 12.5 -> "12.5 l"
  details: { type: Array, default: null },        // optional extra tooltip line per bar
  height: { type: String, default: '200px' },
});

const canvas = ref(null);
const showTable = ref(false);
let chart = null;

// Theme tokens (theme.css), read once so the chart matches the app
function token(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function draw() {
  chart?.destroy();
  const ink = token('--mc-ink-2', '#3a443c');
  const muted = token('--mc-muted', '#6b746c');
  const grid = token('--mc-border', '#e4dfd2');
  const bar = token('--mc-green-700', '#1b5e37');
  const barHover = token('--mc-green-800', '#134a2b');

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.values,
        backgroundColor: bar,
        hoverBackgroundColor: barHover,
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        maxBarThickness: 18,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },   // hover anywhere in the column, not just the bar
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: token('--mc-ink', '#1c251e'),
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (ctx) => props.format(ctx.parsed.y),
            afterLabel: (ctx) => props.details?.[ctx.dataIndex] || '',
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: grid },
          ticks: { color: muted, maxRotation: 0, autoSkip: true, autoSkipPadding: 10, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: grid, drawTicks: false },
          border: { display: false },
          ticks: { color: muted, padding: 6, maxTicksLimit: 5, font: { size: 11 }, callback: (v) => props.format(v) },
        },
      },
      color: ink,
    },
  });
}

onMounted(draw);
watch(() => [props.labels, props.values], draw, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div>
    <div class="barchart" :style="{ height }">
      <canvas ref="canvas" role="img" :aria-label="title"></canvas>
    </div>
    <button type="button" class="btn btn-link btn-sm p-0 mt-1 chart-table-toggle" :aria-expanded="showTable" @click="showTable = !showTable">
      {{ showTable ? 'Hide numbers' : 'Show as table' }}
    </button>
    <div v-if="showTable" class="chart-table">
      <table class="table table-sm mb-0">
        <caption class="visually-hidden">{{ title }}</caption>
        <tbody>
          <tr v-for="(label, i) in labels" :key="i">
            <th scope="row">{{ label }}</th>
            <td class="text-end">{{ format(values[i]) }}<span v-if="details?.[i]" class="text-secondary"> · {{ details[i] }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style>
.barchart { position: relative; width: 100%; }
.chart-table-toggle { font-size: .82rem; }
.chart-table { max-height: 240px; overflow: auto; margin-top: .35rem; font-size: .85rem; font-variant-numeric: tabular-nums; }
</style>
