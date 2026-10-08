<script setup>
// The farmer's farms: where animals are kept. Moving a farm's pin moves all its animals.
import { onMounted, reactive, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import MapView from '../ui/MapView.vue';
import FarmFields from './FarmFields.vue';
import { api } from '../../api';
import { hasPoint } from '../../geo';
import { blankFarm, farmPlace, saveFarm } from '../../farms';

const farms = ref([]);
const loading = ref(true);
const error = ref('');
const editing = ref(null);          // farm being edited / created (a copy)
const errors = ref({});
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    farms.value = (await api('/holdings')).holdings;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function edit(farm) {
  errors.value = {};
  editing.value = reactive(farm ? { ...farm } : blankFarm());
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  try {
    await saveFarm(editing.value);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Farm saved', showConfirmButton: false, timer: 2000 });
    editing.value = null;
    await load();
  } catch (e) {
    errors.value = e.data?.errors ? Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]])) : {};
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t save the farm', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function remove(farm) {
  const { isConfirmed } = await Swal.fire({
    title: `Remove ${farm.name}?`, showCancelButton: true, confirmButtonText: 'Remove', customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;
  try {
    await api(`/holdings/${farm.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t remove the farm', text: e.message });
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 860px">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">My herd</span>
          <h1>Farms</h1>
          <p>Where your animals are kept. Officers use the pin to find the farm for a visit; it’s never shown publicly.</p>
        </div>
        <button v-if="!editing" class="btn btn-primary btn-sm" @click="edit(null)"><Icon name="plus" :size="16" /> Add farm</button>
      </header>

      <form v-if="editing" class="mc-card p-3 p-sm-4 mb-4" novalidate @submit.prevent="save">
        <h2 class="h5 mb-3">{{ editing.id ? `Edit ${editing.name}` : 'New farm' }}</h2>
        <FarmFields :farm="editing" :errors="errors" id-prefix="fp" />
        <p v-if="editing.id && editing.animals_count" class="form-hint mt-2">The {{ editing.animals_count }} animal{{ editing.animals_count > 1 ? 's' : '' }} on this farm will move with it.</p>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-primary" :disabled="saving"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Save farm</button>
          <button type="button" class="btn btn-outline" @click="editing = null">Cancel</button>
        </div>
      </form>

      <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div v-if="loading" class="mc-skeleton" style="height: 240px"></div>
      <EmptyState v-else-if="!farms.length && !editing" icon="pin" title="No farms yet" text="Add your farm once, then every animal you register can use it.">
        <button class="btn btn-primary btn-sm" @click="edit(null)"><Icon name="plus" :size="16" /> Add farm</button>
      </EmptyState>

      <div v-else class="row g-3">
        <div v-for="farm in farms" :key="farm.id" class="col-md-6">
          <section class="mc-card p-3 h-100 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h2 class="h6 mb-1">{{ farm.name }}</h2>
                <p class="small text-secondary mb-0">{{ farmPlace(farm) || '—' }} · {{ farm.animals_count }} animal{{ farm.animals_count === 1 ? '' : 's' }}</p>
              </div>
              <div class="d-flex gap-1 flex-none">
                <button class="btn btn-outline btn-sm" :aria-label="`Edit ${farm.name}`" @click="edit(farm)"><Icon name="edit" :size="15" /></button>
                <button v-if="!farm.animals_count" class="btn btn-danger-soft btn-sm" :aria-label="`Remove ${farm.name}`" @click="remove(farm)"><Icon name="trash" :size="15" /></button>
              </div>
            </div>
            <MapView v-if="hasPoint(farm)" :key="`${farm.latitude},${farm.longitude}`" :latitude="farm.latitude" :longitude="farm.longitude" height="170px" />
            <button v-else class="btn btn-outline btn-sm mt-auto" @click="edit(farm)"><Icon name="pin" :size="15" /> Add the map pin</button>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
