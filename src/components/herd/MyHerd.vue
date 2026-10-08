<script setup>
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import StatusChip from '../ui/StatusChip.vue';
import { STORAGE_URL } from '../../config';
import { api } from '../../api';
import { firstName } from '../../auth';
import { breedLabel, formatPct } from '../../breeds';
import { SEXES, ageText, coverPhoto, displayName, readiness } from '../../animals';

const animals = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return animals.value;
  return animals.value.filter((a) => `${a.name || ''} ${a.tag_number} ${a.ai_breed || ''}`.toLowerCase().includes(q));
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    animals.value = (await api('/animals')).animals;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function ready(a) {
  return readiness(a).every((r) => r.done);
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">{{ firstName() ? `${firstName()}’s farm` : 'My farm' }}</span>
          <h1>My herd</h1>
          <p>Every animal you register gets a full record, ready for a vet to certify.</p>
        </div>
        <router-link to="/herd/new" class="btn btn-primary"><Icon name="plus" :size="18" /> Register animal</router-link>
      </header>

      <div v-if="animals.length > 4" class="filters mc-card">
        <div class="filters-search">
          <label class="visually-hidden" for="herd-search">Search</label>
          <input id="herd-search" v-model="search" type="search" class="form-control" placeholder="Search name, tag or breed" />
        </div>
        <span class="filters-count">{{ filtered.length }} of {{ animals.length }}</span>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert">
        <Icon name="alert" :size="18" /><span>{{ error }} <button class="btn btn-link btn-sm p-0 align-baseline" @click="load">Try again</button></span>
      </div>

      <div v-if="loading" class="row g-3">
        <div v-for="n in 3" :key="n" class="col-sm-6 col-lg-4"><div class="mc-skeleton" style="height: 300px"></div></div>
      </div>
      <EmptyState v-else-if="!animals.length && !error" icon="herd" title="No animals yet"
        text="Register your first animal: ear tag, a few details, then photos from your phone.">
        <router-link to="/herd/new" class="btn btn-primary"><Icon name="plus" :size="18" /> Register animal</router-link>
      </EmptyState>
      <EmptyState v-else-if="!filtered.length" icon="image" title="No matches" text="Try a different name or tag number." />

      <div v-else class="row g-3">
        <div v-for="a in filtered" :key="a.id" class="col-sm-6 col-lg-4">
          <router-link :to="`/herd/${a.id}`" class="mc-card mc-photo-card herd-card">
            <img v-if="coverPhoto(a)" :src="STORAGE_URL + coverPhoto(a).path" :alt="displayName(a)" class="mc-photo" loading="lazy" />
            <div v-else class="mc-photo herd-nophoto"><Icon name="camera" :size="28" /><span>Add photos</span></div>
            <div class="mc-photo-body">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div class="min-w-0">
                  <h3 class="text-truncate">{{ displayName(a) }}</h3>
                  <span class="herd-tag">{{ a.tag_number }}</span>
                </div>
                <StatusChip v-if="a.latest_request && a.latest_request.status !== 'cancelled'" :status="a.latest_request.status" />
                <span v-else-if="ready(a)" class="mc-chip mc-chip-green"><Icon name="check" :size="12" /> Ready</span>
                <span v-else class="mc-chip mc-chip-gold">Incomplete</span>
              </div>
              <div class="mc-meta">
                <span>{{ SEXES[a.sex] }} · {{ ageText(a) }}</span>
                <span v-if="a.county"><Icon name="pin" :size="13" /> {{ a.county.name }}</span>
              </div>
              <div class="herd-ai mt-auto">
                <template v-if="a.ai_breed">AI: <b>{{ breedLabel(a.ai_breed) }}</b> · {{ formatPct(a.ai_confidence) }}</template>
                <template v-else>No breed check yet</template>
                <Icon name="chevron-right" :size="18" class="ms-auto" />
              </div>
            </div>
          </router-link>
        </div>
      </div>

      <p class="officer-cta">
        <Icon name="shield" :size="16" /> Are you a vet or livestock officer?
        <router-link to="/become-officer">Apply to certify animals</router-link>
      </p>
    </div>
  </div>
</template>

<style>
.herd-card { color: var(--mc-ink); transition: border-color .15s, transform .15s; }
.herd-card:hover { color: var(--mc-ink); border-color: var(--mc-green-700); transform: translateY(-2px); }
.herd-nophoto { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem; color: var(--mc-muted); font-weight: 650; font-size: .9rem; }
.herd-tag { font-size: .82rem; color: var(--mc-muted); font-variant-numeric: tabular-nums; }
.herd-ai { display: flex; align-items: center; gap: .3rem; font-size: .88rem; color: var(--mc-ink-2); padding-top: .6rem; border-top: 1px solid var(--mc-border); }
.min-w-0 { min-width: 0; }
.officer-cta { margin: 2.5rem 0 0; text-align: center; color: var(--mc-muted); font-size: .92rem; display: flex; justify-content: center; align-items: center; gap: .4rem; flex-wrap: wrap; }
.officer-cta a { font-weight: 650; }
</style>
