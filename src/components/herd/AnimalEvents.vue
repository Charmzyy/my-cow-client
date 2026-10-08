<script setup>
// An animal's health / breeding / growth log. The owner adds and removes entries;
// officers see the same list read-only (pass `events` + `readonly`).
import { computed, onMounted, reactive, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { formatDate } from '../../requests';

const props = defineProps({
  animalId: { type: String, required: true },
  sex: { type: String, default: '' },
  events: { type: Array, default: null },   // given = don't fetch
  readonly: { type: Boolean, default: false },
});

// Matches AnimalEvent::TYPES on the API
const TYPES = {
  vaccination: { label: 'Vaccination', icon: 'shield', details: 'Vaccine, e.g. FMD, Lumpy skin' },
  deworming: { label: 'Deworming', icon: 'check-circle', details: 'Product used' },
  treatment: { label: 'Treatment', icon: 'alert', details: 'Condition and drug' },
  ai_service: { label: 'AI / service', icon: 'sprout', details: 'Bull name or straw code', femaleOnly: true },
  calving: { label: 'Calving', icon: 'plus', details: 'Calf sex and tag', femaleOnly: true },
  weight: { label: 'Weighing', icon: 'tag', details: 'How weighed, e.g. tape' },
  other: { label: 'Other', icon: 'edit', details: 'What happened' },
};
const typeOptions = computed(() => Object.entries(TYPES).filter(([, t]) => !t.femaleOnly || props.sex !== 'male'));

const today = () => new Date().toISOString().slice(0, 10);
const list = ref(props.events || []);
const loading = ref(!props.events);
const error = ref('');
const adding = ref(false);
const saving = ref(false);
const f = reactive({ type: 'vaccination', event_date: today(), details: '', value: '', notes: '' });

async function load() {
  if (props.events) return;
  loading.value = true;
  try {
    list.value = (await api(`/animals/${props.animalId}/events`)).events;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  error.value = '';
  saving.value = true;
  try {
    const body = { ...f, details: f.details.trim() || null, notes: f.notes.trim() || null, value: f.type === 'weight' ? f.value : null };
    list.value = (await api(`/animals/${props.animalId}/events`, { method: 'POST', body })).events;
    Object.assign(f, { details: '', value: '', notes: '', event_date: today() });
    adding.value = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function remove(ev) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete this record?', text: `${TYPES[ev.type].label} on ${formatDate(ev.event_date)}`,
    showCancelButton: true, confirmButtonText: 'Delete', customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;
  try {
    list.value = (await api(`/animals/${props.animalId}/events/${ev.id}`, { method: 'DELETE' })).events;
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(load);
</script>

<template>
  <section class="mc-card p-3 mb-3">
    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
      <h2 class="h6 mb-0">Health &amp; breeding records</h2>
      <button v-if="!readonly && !adding" class="btn btn-outline btn-sm" @click="adding = true"><Icon name="plus" :size="16" /> Add record</button>
    </div>

    <form v-if="adding" class="ev-form" @submit.prevent="save">
      <div class="row g-2">
        <div class="col-sm-6">
          <label class="form-label small" for="ev-type">Type</label>
          <select id="ev-type" v-model="f.type" class="form-select">
            <option v-for="[key, t] in typeOptions" :key="key" :value="key">{{ t.label }}</option>
          </select>
        </div>
        <div class="col-sm-6">
          <label class="form-label small" for="ev-date">Date</label>
          <input id="ev-date" v-model="f.event_date" type="date" class="form-control" :max="today()" required />
        </div>
        <div v-if="f.type === 'weight'" class="col-sm-6">
          <label class="form-label small" for="ev-value">Weight (kg)</label>
          <input id="ev-value" v-model="f.value" type="number" inputmode="decimal" min="10" max="2000" step="0.5" class="form-control" required />
        </div>
        <div :class="f.type === 'weight' ? 'col-sm-6' : 'col-12'">
          <label class="form-label small" for="ev-details">Details</label>
          <input id="ev-details" v-model="f.details" class="form-control" maxlength="160" :placeholder="TYPES[f.type].details" />
        </div>
        <div class="col-12">
          <label class="form-label small" for="ev-notes">Notes (optional)</label>
          <textarea id="ev-notes" v-model="f.notes" class="form-control" rows="2" maxlength="1000" placeholder="e.g. Given by Dr. Wanjiru, next dose in 6 months"></textarea>
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-primary btn-sm" :disabled="saving"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Save record</button>
        <button type="button" class="btn btn-outline btn-sm" @click="adding = false">Cancel</button>
      </div>
    </form>

    <div v-if="error" class="mc-alert mc-alert-error my-2" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

    <div v-if="loading" class="mc-skeleton" style="height: 90px"></div>
    <p v-else-if="!list.length" class="small text-secondary mb-0">
      {{ readonly ? 'The owner hasn’t recorded any events.' : 'No records yet. Vaccinations, deworming and AI services make a certificate more convincing to buyers.' }}
    </p>
    <ul v-else class="ev-list">
      <li v-for="ev in list" :key="ev.id">
        <span class="ev-icon"><Icon :name="TYPES[ev.type]?.icon || 'edit'" :size="16" /></span>
        <span class="ev-main">
          <strong>{{ TYPES[ev.type]?.label || ev.type }}<template v-if="ev.type === 'weight' && ev.value"> · {{ ev.value }} kg</template></strong>
          <span v-if="ev.details">{{ ev.details }}</span>
          <span v-if="ev.notes" class="ev-notes">{{ ev.notes }}</span>
        </span>
        <span class="ev-date">{{ formatDate(ev.event_date) }}</span>
        <button v-if="!readonly" class="btn btn-sm ev-del" :aria-label="`Delete ${TYPES[ev.type]?.label} record`" @click="remove(ev)">
          <Icon name="trash" :size="15" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ev-form { border: 1px solid var(--mc-border, #e6e2d6); border-radius: 12px; padding: .85rem; margin-bottom: .75rem; background: #fcfbf7; }
.ev-list { list-style: none; padding: 0; margin: 0; }
.ev-list li { display: flex; gap: .7rem; align-items: flex-start; padding: .6rem 0; border-top: 1px solid var(--mc-border, #e6e2d6); }
.ev-list li:first-child { border-top: 0; }
.ev-icon { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--mc-green-50); color: var(--mc-green-700); flex: none; }
.ev-main { display: flex; flex-direction: column; gap: .1rem; flex: 1; min-width: 0; font-size: .9rem; }
.ev-main > span { color: var(--mc-ink-2); overflow-wrap: anywhere; }
.ev-notes { font-size: .84rem; color: var(--mc-muted) !important; }
.ev-date { font-size: .84rem; color: var(--mc-muted); white-space: nowrap; }
.ev-del { color: var(--mc-muted); padding: .15rem .35rem; }
.ev-del:hover { color: #a3261c; }
</style>
