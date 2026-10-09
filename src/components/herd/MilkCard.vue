<script setup>
// One cow's milk on her profile: status, the current lactation, 30 days of daily litres, past lactations.
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import BarChart from '../ui/BarChart.vue';
import { api } from '../../api';
import { formatDate } from '../../requests';
import { MILK_STATUS, SESSIONS, litresText, shortDay } from '../../milk';

const props = defineProps({
  animal: { type: Object, required: true },
  canRecord: { type: Boolean, default: false },
});

const data = ref(null);
const error = ref('');

const current = computed(() => data.value?.lactations.find((l) => !l.dried_on) || null);
const total30 = computed(() => (data.value?.series || []).reduce((t, d) => t + d.litres, 0));

onMounted(async () => {
  try {
    data.value = await api(`/animals/${props.animal.id}/milk?days=30`);
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <section class="mc-card p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
      <h2 class="h6 mb-0">Milk</h2>
      <router-link v-if="canRecord && animal.holding_id" :to="`/farm/${animal.holding_id}/milk?cow=${animal.id}`" class="btn btn-outline btn-sm">
        <Icon name="plus" :size="16" /> Record milk
      </router-link>
    </div>

    <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
    <div v-else-if="!data" class="mc-skeleton" style="height: 160px"></div>
    <template v-else>
      <p class="small mb-2">
        <span class="mc-chip" :class="MILK_STATUS[data.status].chip">{{ MILK_STATUS[data.status].label }}</span>
        <template v-if="current"> · lactation {{ current.number }}, day {{ current.days_in_milk }} · {{ litresText(current.total_litres, 0) }} so far</template>
        <template v-else-if="data.status === 'unknown'"> · add a <b>Calving</b> record below to track lactations</template>
      </p>

      <template v-if="total30">
        <BarChart
          :title="`Litres per day from ${animal.name || animal.tag_number}, last 30 days`"
          :labels="data.series.map((d) => shortDay(d.day))"
          :values="data.series.map((d) => d.litres)"
          :details="data.series.map((d) => (d.discarded ? `${litresText(d.discarded)} discarded` : ''))"
          :format="(v) => litresText(v)"
          height="160px"
        />
        <p class="small text-secondary mt-2 mb-0">{{ litresText(total30, 0) }} in the last 30 days.</p>
      </template>
      <p v-else class="small text-secondary mb-0">No milk recorded in the last 30 days.</p>

      <details v-if="data.lactations.length" class="mt-2">
        <summary class="small fw-semibold">Lactations ({{ data.lactations.length }})</summary>
        <table class="table table-sm small mt-2 mb-0">
          <thead><tr><th scope="col">#</th><th scope="col">Calved</th><th scope="col">Dried off</th><th scope="col" class="text-end">Days</th><th scope="col" class="text-end">Total</th><th scope="col" class="text-end">Best day</th></tr></thead>
          <tbody>
            <tr v-for="l in data.lactations" :key="l.number">
              <td>{{ l.number }}</td><td>{{ formatDate(l.calved_on) }}</td><td>{{ l.dried_on ? formatDate(l.dried_on) : 'in milk' }}</td>
              <td class="text-end">{{ l.days_in_milk }}</td><td class="text-end">{{ litresText(l.total_litres, 0) }}</td><td class="text-end">{{ litresText(l.peak_litres) }}</td>
            </tr>
          </tbody>
        </table>
      </details>

      <details v-if="data.recent.length" class="mt-2">
        <summary class="small fw-semibold">Latest milkings</summary>
        <ul class="small list-unstyled mt-2 mb-0">
          <li v-for="m in data.recent" :key="m.id">{{ shortDay(m.milked_on) }} · {{ SESSIONS[m.session] }}: <b>{{ litresText(m.litres) }}</b><template v-if="m.discarded"> (discarded)</template></li>
        </ul>
      </details>
    </template>
  </section>
</template>
