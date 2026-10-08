<script setup>
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import StatusChip from '../ui/StatusChip.vue';
import { STORAGE_URL } from '../../config';
import { api } from '../../api';
import { firstName } from '../../auth';
import { breedLabel, formatPct } from '../../breeds';
import { coverPhoto, displayName } from '../../animals';
import { INSPECTION, formatDate } from '../../requests';
import { distanceKm, hasPoint, locateMe } from '../../geo';

const requests = ref([]);
const loading = ref(true);
const error = ref('');
const tab = ref('todo');

const TODO = ['assigned', 'in_review'];
const groups = computed(() => ({
  todo: requests.value.filter((r) => TODO.includes(r.status)),
  waiting: requests.value.filter((r) => r.status === 'needs_info'),
  done: requests.value.filter((r) => ['approved', 'rejected', 'cancelled'].includes(r.status)),
}));
// "Nearest first": distance from where the officer is now (computed on the phone, never sent anywhere)
const here = ref(null);
const locating = ref(false);
const locateError = ref('');
const km = (r) => (here.value && hasPoint(r.animal)
  ? distanceKm(here.value, { lat: Number(r.animal.latitude), lng: Number(r.animal.longitude) })
  : null);

const shown = computed(() => {
  const list = groups.value[tab.value];
  if (!here.value) return list;
  // Pinned farms by distance, then the ones without a pin
  return [...list].sort((a, b) => (km(a) ?? Infinity) - (km(b) ?? Infinity));
});

async function nearestFirst() {
  if (here.value) { here.value = null; return; }
  locating.value = true;
  locateError.value = '';
  try {
    here.value = await locateMe();
  } catch (e) {
    locateError.value = e.message;
  } finally {
    locating.value = false;
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    requests.value = (await api('/officer/requests')).requests;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">Officer workspace</span>
          <h1>{{ firstName() ? `Karibu, ${firstName()}` : 'My queue' }}</h1>
          <p>Animals assigned to you for certification. Open one to review its record and photos.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm" :class="here ? 'btn-primary' : 'btn-outline'" :disabled="locating" :aria-pressed="!!here" @click="nearestFirst">
            <span v-if="locating" class="spinner-border spinner-border-sm"></span><Icon v-else name="pin" :size="16" /> Nearest first
          </button>
          <button class="btn btn-outline btn-sm" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
        </div>
      </header>
      <div v-if="locateError" class="mc-alert mc-alert-info mb-3" role="status"><Icon name="pin" :size="18" />{{ locateError }}</div>

      <div class="seg mb-4" role="tablist">
        <button v-for="[key, label] in [['todo', 'To review'], ['waiting', 'Waiting on farmer'], ['done', 'Decided']]" :key="key"
          role="tab" :aria-selected="tab === key" :class="{ on: tab === key }" @click="tab = key">
          {{ label }} <span class="seg-count">{{ groups[key].length }}</span>
        </button>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div v-if="loading" class="mc-skeleton" style="height: 260px"></div>
      <EmptyState v-else-if="!shown.length" icon="check-circle"
        :title="tab === 'todo' ? 'Nothing to review' : tab === 'waiting' ? 'No one to wait for' : 'No decisions yet'"
        :text="tab === 'todo' ? 'New animals will appear here when an admin assigns them to you.' : ''" />

      <ul v-else class="mc-card queue">
        <li v-for="r in shown" :key="r.id">
          <router-link :to="`/officer/requests/${r.id}`" class="queue-row">
            <img v-if="coverPhoto(r.animal)" :src="STORAGE_URL + coverPhoto(r.animal).path" alt="" class="queue-thumb" loading="lazy" />
            <span v-else class="queue-thumb queue-thumb-empty"><Icon name="image" :size="20" /></span>
            <span class="queue-main">
              <strong>{{ displayName(r.animal) }}</strong>
              <span class="queue-sub">Tag {{ r.animal.tag_number }} · {{ r.requester?.fullname }} · {{ r.animal.county?.name }}{{ r.animal.village ? `, ${r.animal.village}` : '' }}</span>
              <span class="queue-sub">
                <template v-if="km(r) !== null"><strong>{{ km(r) < 10 ? km(r).toFixed(1) : Math.round(km(r)) }} km away</strong> · </template>
                {{ INSPECTION[r.inspection_method] }} · assigned {{ formatDate(r.assigned_at) }}
                <template v-if="r.animal.ai_breed"> · AI: {{ breedLabel(r.animal.ai_breed) }} {{ formatPct(r.animal.ai_confidence) }}</template>
              </span>
            </span>
            <StatusChip :status="r.status" class="d-none d-sm-inline-flex" />
            <Icon name="chevron-right" :size="20" class="text-secondary flex-none" />
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.queue { list-style: none; padding: 0; margin: 0; overflow: hidden; }
.queue li + li { border-top: 1px solid var(--mc-border); }
.queue-row { display: flex; align-items: center; gap: .9rem; padding: .85rem 1rem; color: var(--mc-ink); }
.queue-row:hover { background: var(--mc-green-50); color: var(--mc-ink); }
.queue-thumb { flex: none; width: 64px; height: 48px; border-radius: 8px; object-fit: cover; background: #ece8dc; }
.queue-thumb-empty { display: grid; place-items: center; color: var(--mc-muted); }
.queue-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.queue-sub { font-size: .85rem; color: var(--mc-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.flex-none { flex: none; }
</style>
