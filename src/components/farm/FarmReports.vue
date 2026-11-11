<script setup>
// A farm's reports: milk, where it went, money (owners and managers only), herd and health.
// Each card can be changed and downloaded as a spreadsheet (CSV); choices are remembered.
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../ui/Icon.vue';
import ChartCard from '../ui/ChartCard.vue';
import { api } from '../../api';
import { canManageFarm } from '../../farms';

const route = useRoute();
const router = useRouter();
const farms = ref([]);
const loading = ref(true);
const error = ref('');

const farm = computed(() => farms.value.find((f) => f.id === route.params.id) || null);
const money = computed(() => canManageFarm(farm.value));   // = the API's sales.manage

const CARDS = [
  { id: 'rep-milk', defaults: { metric: 'milk.produced', group: 'time', type: 'stacked', range: '90', granularity: 'week' } },
  { id: 'rep-cows', defaults: { metric: 'milk.produced', group: 'cow', type: 'bar', range: '30' } },
  { id: 'rep-outlets', defaults: { metric: 'milk.outlets', group: 'time', type: 'stacked', range: '90', granularity: 'week' } },
  { id: 'rep-income', defaults: { metric: 'milk.income', group: 'time', type: 'stacked', range: '365', granularity: 'month' }, money: true },
  { id: 'rep-herd', defaults: { metric: 'herd.composition', group: 'age', type: 'bar' } },
  { id: 'rep-health', defaults: { metric: 'health.events', group: 'type', type: 'bar', range: '365' } },
];
const cards = computed(() => CARDS.filter((c) => !c.money || money.value));

onMounted(async () => {
  try {
    farms.value = (await api('/holdings')).holdings;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <router-link :to="`/farm/${route.params.id}`" class="back-link mb-3"><Icon name="arrow-left" :size="18" /> Farm</router-link>

      <div v-if="loading" class="mc-skeleton" style="height: 420px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <p v-else-if="!farm" class="mc-card p-3">This farm isn’t in your current workspace.</p>

      <template v-else>
        <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <span class="mc-eyebrow">Reports</span>
            <h1>{{ farm.name }}</h1>
            <p>Change any chart with the menus above it. Your choices are saved; <b>Download</b> gives the numbers as a spreadsheet.</p>
          </div>
          <div v-if="farms.length > 1">
            <label class="visually-hidden" for="rep-farm">Farm</label>
            <select id="rep-farm" class="form-select" :value="farm.id" @change="router.push(`/farm/${$event.target.value}/reports`)">
              <option v-for="f in farms" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>
        </header>

        <div class="rep-grid">
          <ChartCard v-for="c in cards" :key="`${farm.id}-${c.id}`" :id="c.id" :farm="farm" :defaults="c.defaults" :money="money" />
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.rep-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); }
</style>
