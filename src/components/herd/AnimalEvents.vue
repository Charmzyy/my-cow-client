<script setup>
// An animal's health / breeding / growth log. Everyone on the farm's team adds entries; owners and
// managers (canManage) remove any, others only their own. Officers see it read-only (`events` + `readonly`).
// Vaccinations, deworming and treatments also take product, dose, withdrawal and next-due date: a milk
// withdrawal locks the cow's milk as discarded on the API, so the parent reloads (`changed`).
import { computed, onMounted, reactive, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { newId, send, waitingWhere } from '../../outbox';
import { formatDate } from '../../requests';
import { auth } from '../../auth';
import { isActive, isHealthType, toDays, toHours, withdrawalText } from '../../health';
import { kenyaToday } from '../../milk';

const props = defineProps({
  animalId: { type: String, required: true },
  sex: { type: String, default: '' },
  events: { type: Array, default: null },   // given = don't fetch
  readonly: { type: Boolean, default: false },
  canManage: { type: Boolean, default: true },
});
const emit = defineEmits(['changed']);

const canRemove = (ev) => !props.readonly && (props.canManage || ev.recorded_by === auth.user?.id);

// Matches AnimalEvent::TYPES on the API. Calving / dried off start and end lactations (milk records).
const TYPES = {
  vaccination: { label: 'Vaccination', icon: 'shield', details: 'Vaccine, e.g. FMD, Lumpy skin' },
  deworming: { label: 'Deworming', icon: 'check-circle', details: 'Product used' },
  treatment: { label: 'Treatment', icon: 'alert', details: 'Condition and drug' },
  ai_service: { label: 'AI / service', icon: 'sprout', details: 'Bull name or straw code', femaleOnly: true },
  calving: { label: 'Calving', icon: 'plus', details: 'Calf sex and tag', femaleOnly: true },
  dry_off: { label: 'Dried off', icon: 'clock', details: 'Reason, e.g. due to calve', femaleOnly: true },
  heat: { label: 'In heat', icon: 'sun', details: 'Signs seen', femaleOnly: true },
  pregnancy_check: { label: 'Pregnancy check', icon: 'check-circle', details: 'Result, e.g. 3 months in calf', femaleOnly: true },
  weight: { label: 'Weighing', icon: 'tag', details: 'How weighed, e.g. tape' },
  other: { label: 'Other', icon: 'edit', details: 'What happened' },
};
const typeOptions = computed(() => Object.entries(TYPES).filter(([, t]) => !t.femaleOnly || props.sex !== 'male'));

const today = () => kenyaToday();   // the API's "today" is Kenya time
const list = ref(props.events || []);
const loading = ref(!props.events);
const error = ref('');
const adding = ref(false);

// Records for this animal saved on the phone (no signal) and not sent yet
const waiting = computed(() => waitingWhere('event', (i) => i.path === `/animals/${props.animalId}/events`));
watch(() => waiting.value.length, (now, before) => {
  if (now < before && !props.events) {
    load();            // sent: show them from the server
    emit('changed');   // a treatment may have locked milk as discarded
  }
});
const saving = ref(false);
const blank = () => ({
  details: '', value: '', notes: '',
  product: '', dose: '', course_days: '1', milk_value: '', milk_unit: 'hours', meat_days: '', next_due_on: '', given_by: '',
});
const f = reactive({ type: 'vaccination', event_date: today(), ...blank() });
const health = computed(() => isHealthType(f.type));
const milkHours = computed(() => toHours({ value: f.milk_value, unit: f.milk_unit }));
const meatDays = computed(() => toDays(f.meat_days));
const formInvalid = computed(() => health.value && (Number.isNaN(milkHours.value) || Number.isNaN(meatDays.value)));

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
  if (saving.value || formInvalid.value) return;
  error.value = '';
  saving.value = true;
  try {
    const body = {
      id: newId(),   // the phone's id: if it's sent twice (offline, lost reply) it's still saved once
      type: f.type, event_date: f.event_date,
      details: f.details.trim() || null, notes: f.notes.trim() || null, value: f.type === 'weight' ? f.value : null,
    };
    if (health.value) {
      Object.assign(body, {
        product: f.product.trim() || null, dose: f.dose.trim() || null, given_by: f.given_by.trim() || null,
        course_days: Number(f.course_days) || 1, milk_withdrawal_hours: milkHours.value, meat_withdrawal_days: meatDays.value,
        next_due_on: f.next_due_on || null,
      });
    }
    const { data } = await send(`/animals/${props.animalId}/events`, {
      body, kind: 'event', label: `${TYPES[body.type]?.label || body.type}, ${formatDate(body.event_date)}`,
    });
    if (data) list.value = data.events;   // else it waits on the phone and shows as "Waiting to send"
    Object.assign(f, blank(), { event_date: today() });
    adding.value = false;
    if (data) emit('changed');
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function remove(ev) {
  const locks = isActive(ev.milk_clear_on, today());
  const { isConfirmed } = await Swal.fire({
    title: 'Delete this record?',
    text: `${TYPES[ev.type].label} on ${formatDate(ev.event_date)}${locks ? '. Her milk will no longer be locked as discarded.' : ''}`,
    showCancelButton: true, confirmButtonText: 'Delete', customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;
  try {
    list.value = (await api(`/animals/${props.animalId}/events/${ev.id}`, { method: 'DELETE' })).events;
    emit('changed');
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
        <template v-if="health">
          <div class="col-sm-6">
            <label class="form-label small" for="ev-product">Product</label>
            <input id="ev-product" v-model="f.product" class="form-control" maxlength="80" placeholder="e.g. Penstrep, Albendazole" />
          </div>
          <div class="col-sm-3 col-6">
            <label class="form-label small" for="ev-dose">Dose</label>
            <input id="ev-dose" v-model="f.dose" class="form-control" maxlength="40" placeholder="e.g. 20 ml" />
          </div>
          <div class="col-sm-3 col-6">
            <label class="form-label small" for="ev-course">Days of doses</label>
            <input id="ev-course" v-model="f.course_days" type="number" inputmode="numeric" min="1" max="30" class="form-control" />
          </div>
          <div class="col-sm-6">
            <label class="form-label small" for="ev-milk">Milk withdrawal <span class="text-secondary">(from the label)</span></label>
            <div class="input-group">
              <input id="ev-milk" v-model="f.milk_value" type="text" inputmode="decimal" class="form-control" :class="{ 'is-invalid': Number.isNaN(milkHours) }" placeholder="0" />
              <select v-model="f.milk_unit" class="form-select ev-unit" aria-label="Milk withdrawal unit">
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
            <div v-if="Number.isNaN(milkHours)" class="small text-danger mt-1">Up to 90 days, in whole hours.</div>
          </div>
          <div class="col-sm-6">
            <label class="form-label small" for="ev-meat">Meat withdrawal (days)</label>
            <input id="ev-meat" v-model="f.meat_days" type="number" inputmode="numeric" min="0" max="365" class="form-control" :class="{ 'is-invalid': Number.isNaN(meatDays) }" placeholder="0" />
          </div>
          <div class="col-sm-6">
            <label class="form-label small" for="ev-next">Next dose due (optional)</label>
            <input id="ev-next" v-model="f.next_due_on" type="date" class="form-control" :min="f.event_date" />
          </div>
          <div class="col-sm-6">
            <label class="form-label small" for="ev-by">Given by (optional)</label>
            <input id="ev-by" v-model="f.given_by" class="form-control" maxlength="80" placeholder="e.g. Dr. Wanjiru" />
          </div>
          <p v-if="milkHours" class="col-12 small ev-hint mb-0">
            <Icon name="alert" :size="14" /> Her milk will be recorded as discarded on the milking sheet until the withdrawal ends.
          </p>
        </template>
        <div class="col-12">
          <label class="form-label small" for="ev-notes">Notes (optional)</label>
          <textarea id="ev-notes" v-model="f.notes" class="form-control" rows="2" maxlength="1000" placeholder="e.g. Given by Dr. Wanjiru, next dose in 6 months"></textarea>
        </div>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-primary btn-sm" :disabled="saving || formInvalid"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Save record</button>
        <button type="button" class="btn btn-outline btn-sm" @click="adding = false">Cancel</button>
      </div>
    </form>

    <div v-if="error" class="mc-alert mc-alert-error my-2" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

    <div v-if="loading" class="mc-skeleton" style="height: 90px"></div>
    <p v-else-if="!list.length && !waiting.length" class="small text-secondary mb-0">
      {{ readonly ? 'The owner hasn’t recorded any events.' : 'No records yet. Vaccinations, deworming and AI services make a certificate more convincing to buyers.' }}
    </p>
    <ul v-if="waiting.length" class="ev-list">
      <li v-for="w in waiting" :key="w.id">
        <span class="ev-icon"><Icon :name="TYPES[w.body.type]?.icon || 'edit'" :size="16" /></span>
        <span class="ev-main">
          <strong>{{ TYPES[w.body.type]?.label || w.body.type }}</strong>
          <span v-if="w.body.product || w.body.details">{{ w.body.product || w.body.details }}</span>
          <span class="mc-chip mc-chip-gold align-self-start"><Icon name="clock" :size="13" /> Waiting to send</span>
        </span>
        <span class="ev-date">{{ formatDate(w.body.event_date) }}</span>
      </li>
    </ul>
    <ul v-if="!loading && list.length" class="ev-list">
      <li v-for="ev in list" :key="ev.id">
        <span class="ev-icon"><Icon :name="TYPES[ev.type]?.icon || 'edit'" :size="16" /></span>
        <span class="ev-main">
          <strong>{{ TYPES[ev.type]?.label || ev.type }}<template v-if="ev.type === 'weight' && ev.value"> · {{ ev.value }} kg</template></strong>
          <span v-if="ev.details">{{ ev.details }}</span>
          <span v-if="ev.product || ev.dose">{{ [ev.product, ev.dose].filter(Boolean).join(' · ') }}<template v-if="ev.course_days > 1"> · {{ ev.course_days }} days</template><template v-if="ev.given_by"> · by {{ ev.given_by }}</template></span>
          <span v-if="isActive(ev.milk_clear_on, today())" class="ev-flag">{{ withdrawalText(ev.milk_clear_on, null) }}</span>
          <span v-if="isActive(ev.meat_clear_on, today())" class="ev-flag">{{ withdrawalText(ev.meat_clear_on, null, 'No slaughter') }}</span>
          <span v-if="ev.next_due_on" class="ev-notes">Next dose {{ formatDate(ev.next_due_on) }}</span>
          <span v-if="ev.notes" class="ev-notes">{{ ev.notes }}</span>
        </span>
        <span class="ev-date">{{ formatDate(ev.event_date) }}</span>
        <button v-if="canRemove(ev)" class="btn btn-sm ev-del" :aria-label="`Delete ${TYPES[ev.type]?.label} record`" @click="remove(ev)">
          <Icon name="trash" :size="15" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ev-form { border: 1px solid var(--mc-border, #e6e2d6); border-radius: 12px; padding: .85rem; margin-bottom: .75rem; background: var(--mc-surface-2); }
.ev-list { list-style: none; padding: 0; margin: 0; }
.ev-list li { display: flex; gap: .7rem; align-items: flex-start; padding: .6rem 0; border-top: 1px solid var(--mc-border, #e6e2d6); }
.ev-list li:first-child { border-top: 0; }
.ev-icon { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--mc-green-50); color: var(--mc-green-700); flex: none; }
.ev-main { display: flex; flex-direction: column; gap: .1rem; flex: 1; min-width: 0; font-size: .9rem; }
.ev-main > span { color: var(--mc-ink-2); overflow-wrap: anywhere; }
.ev-notes { font-size: .84rem; color: var(--mc-muted) !important; }
.ev-date { font-size: .84rem; color: var(--mc-muted); white-space: nowrap; }
.ev-del { color: var(--mc-muted); padding: .15rem .35rem; }
.ev-unit { max-width: 6.5rem; }
.ev-hint { color: var(--mc-danger); display: flex; align-items: center; gap: .3rem; }
.ev-flag { font-size: .8rem; font-weight: 600; color: var(--mc-danger) !important; }
.ev-del:hover { color: var(--mc-danger); }
</style>
