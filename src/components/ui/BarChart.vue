<script setup>
// One-series bar chart (e.g. one cow's litres per day). Kept as a thin wrapper so existing
// screens (MilkCard) work unchanged; everything is drawn by DataChart. One series = no legend:
// the card title names it.
import { computed } from 'vue';
import DataChart from './DataChart.vue';
import { prefs } from '../../preferences';
import { slotColor } from '../../chartPalette';
import { themeState } from '../../theme';

const props = defineProps({
  labels: { type: Array, required: true },
  values: { type: Array, required: true },
  title: { type: String, required: true },
  format: { type: Function, default: (v) => String(v) },
  details: { type: Array, default: null },
  height: { type: String, default: '200px' },
});

const series = computed(() => [{
  label: props.title,
  values: props.values,
  color: slotColor(prefs.chart_palette, themeState.mode, 0),
}]);
</script>

<template>
  <DataChart type="bar" :labels="labels" :series="series" :title="title" :format="format" :details="details" :height="height" />
</template>
