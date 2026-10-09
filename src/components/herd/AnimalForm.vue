<script setup>
// Register (or edit) an animal in three short steps. Photos are added on the next screen,
// once the record exists, so each photo can upload (and be retried) on its own.
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { getCounties } from '../../lookups';
import { BREEDS, breedLabel } from '../../breeds';
import { PURPOSES } from '../../animals';
import FarmFields from './FarmFields.vue';
import { blankFarm, canManageFarm, farmPlace, saveFarm } from '../../farms';

const route = useRoute();
const router = useRouter();
const editId = computed(() => route.params.id || null);
const DRAFT_KEY = 'mc-animal-draft';

const STEPS = [
  { title: 'Identity', fields: ['tag_number', 'national_id', 'name', 'sex', 'date_of_birth', 'age_estimate_months', 'colour', 'purpose', 'breed_claimed'] },
  { title: 'Breeding & production', fields: ['sire_name', 'sire_tag', 'dam_name', 'dam_tag', 'ai_straw_code', 'weight_kg', 'body_condition_score', 'lactation_number', 'milk_litres_per_day'] },
  { title: 'Farm', fields: ['holding_id', 'county_id', 'sub_county', 'ward', 'village', 'latitude', 'longitude'] },
];

const blank = () => ({
  tag_number: '', national_id: '', name: '', sex: '', date_of_birth: '', age_estimate_months: '', colour: '',
  purpose: '', breed_claimed: '',
  sire_name: '', sire_tag: '', dam_name: '', dam_tag: '', ai_straw_code: '',
  weight_kg: '', body_condition_score: '', lactation_number: '', milk_litres_per_day: '',
  county_id: '', sub_county: '', ward: '', village: '', latitude: '', longitude: '',
  holding_id: '',
});

const f = reactive(blank());
const step = ref(0);
const dobUnknown = ref(false);
const counties = ref([]);
const loading = ref(!!editId.value);
const saving = ref(false);
const error = ref('');
const fieldErrors = ref({});

// Step 3: the animal lives on one of the farmer's farms (or a new one, created on save)
const farms = ref([]);
const newFarm = reactive(blankFarm());
const farmErrors = ref({});
const addingFarm = computed(() => f.holding_id === 'new');

const breedOptions = [...Object.keys(BREEDS).map((b) => ({ value: b, label: breedLabel(b) })),
  { value: 'Crossbreed', label: 'Crossbreed' }, { value: 'Other', label: 'Other / local' }];
const showMilk = computed(() => f.sex === 'female' && f.purpose !== 'beef');
const isLast = computed(() => step.value === STEPS.length - 1);

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (saved) {
      Object.assign(f, blank(), saved.f);
      dobUnknown.value = !!saved.dobUnknown;
      return true;
    }
  } catch { /* ignore a corrupt draft */ }
  return false;
}
const restored = ref(false);

watch(f, () => {
  if (editId.value) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, dobUnknown: dobUnknown.value })); } catch { /* storage full / private */ }
}, { deep: true });

function discardDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  Object.assign(f, blank());
  dobUnknown.value = false;
  restored.value = false;
  step.value = 0;
}

onMounted(async () => {
  getCounties().then((c) => (counties.value = c)).catch(() => (error.value = 'Couldn’t load the county list. Check your connection.'));
  // Only farms this person may add animals to (owner / manager), not ones they just work on
  const farmsLoaded = api('/holdings').then((r) => (farms.value = r.holdings.filter(canManageFarm))).catch(() => (farms.value = []));
  if (editId.value) {
    try {
      const { animal } = await api(`/animals/${editId.value}`);
      Object.keys(f).forEach((k) => (f[k] = animal[k] ?? ''));
      dobUnknown.value = !animal.date_of_birth && animal.age_estimate_months != null;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  } else {
    restored.value = restoreDraft();
  }
  await farmsLoaded;
  // Pre-select: the only farm, or "new farm" (pre-filled from an older draft's location) when there are none
  if (!f.holding_id || (f.holding_id !== 'new' && !farms.value.some((h) => h.id === f.holding_id))) {
    if (farms.value.length === 1) f.holding_id = farms.value[0].id;
    else if (!farms.value.length) {
      f.holding_id = 'new';
      Object.assign(newFarm, {
        name: f.village || 'My farm', county_id: f.county_id, sub_county: f.sub_county, ward: f.ward, village: f.village,
        latitude: f.latitude || null, longitude: f.longitude || null,
      });
    } else f.holding_id = '';
  }
});

function stepProblems(i) {
  const p = {};
  if (i === 0) {
    if (!f.tag_number.trim()) p.tag_number = 'Enter the ear tag number.';
    if (!f.sex) p.sex = 'Choose the sex.';
  }
  if (i === 2) {
    if (!f.holding_id) p.holding_id = 'Choose the farm this animal is kept on.';
    if (addingFarm.value) {
      const fe = {};
      if (!newFarm.name.trim()) fe.name = 'Give the farm a name.';
      if (!newFarm.county_id) fe.county_id = 'Choose the county.';
      farmErrors.value = fe;
      if (Object.keys(fe).length) p.farm = 'Complete the new farm’s details.';
    }
  }
  return p;
}

function next() {
  const p = stepProblems(step.value);
  fieldErrors.value = p;
  if (Object.keys(p).length) return;
  step.value++;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function back() {
  fieldErrors.value = {};
  if (step.value > 0) step.value--;
}


function payload() {
  const out = {};
  Object.entries(f).forEach(([k, v]) => {
    const value = typeof v === 'string' ? v.trim() : v;
    out[k] = value === '' ? null : value;
  });
  if (dobUnknown.value) out.date_of_birth = null;
  else out.age_estimate_months = null;
  if (!showMilk.value) {
    out.lactation_number = null;
    out.milk_litres_per_day = null;
  }
  return out;
}

async function save() {
  if (saving.value) return; // no double submits
  for (let i = 0; i < STEPS.length; i++) {
    const p = stepProblems(i);
    if (Object.keys(p).length) {
      fieldErrors.value = p;
      step.value = i;
      return;
    }
  }
  saving.value = true;
  error.value = '';
  fieldErrors.value = {};
  try {
    if (addingFarm.value) {
      try {
        const { holding } = await saveFarm(newFarm);
        farms.value.push(holding);
        f.holding_id = holding.id;
      } catch (e) {
        if (e.data?.errors) {
          farmErrors.value = Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]]));
          step.value = 2;
          error.value = 'Please check the new farm’s details.';
          return;
        }
        throw e;
      }
    }
    const data = editId.value
      ? await api(`/animals/${editId.value}`, { method: 'PUT', body: payload() })
      : await api('/animals', { method: 'POST', body: payload() });
    if (!editId.value) {
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    }
    router.push({ path: `/herd/${data.animal.id}`, query: editId.value ? {} : { new: '1' } });
  } catch (e) {
    const errs = e.data?.errors;
    if (errs) {
      fieldErrors.value = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]]));
      const first = STEPS.findIndex((s) => s.fields.some((fld) => errs[fld]));
      if (first >= 0) step.value = first;
      error.value = 'Please check the highlighted fields.';
    } else {
      error.value = e.message;
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 760px">
      <router-link :to="editId ? `/herd/${editId}` : '/herd'" class="back-link"><Icon name="arrow-left" :size="16" /> {{ editId ? 'Back to animal' : 'My herd' }}</router-link>
      <header class="mc-page-head mt-2">
        <h1>{{ editId ? 'Edit animal' : 'Register an animal' }}</h1>
        <p>{{ editId ? 'Update this animal’s record.' : 'Three short steps, then you’ll add photos. Only the starred fields are required.' }}</p>
      </header>

      <div v-if="restored" class="mc-alert mc-alert-info mb-3">
        <Icon name="clock" :size="18" />
        <span>We restored the form you started earlier. <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="discardDraft">Start over</button></span>
      </div>

      <ol class="stepper" aria-label="Progress">
        <li v-for="(s, i) in STEPS" :key="s.title" :class="{ active: i === step, done: i < step }">
          <button type="button" :disabled="!editId && i > step" @click="step = i">
            <span class="stepper-num"><Icon v-if="i < step" name="check" :size="14" /><template v-else>{{ i + 1 }}</template></span>
            <span class="stepper-label">{{ s.title }}</span>
          </button>
        </li>
        <li v-if="!editId" class="upcoming"><span class="stepper-num">4</span><span class="stepper-label">Photos</span></li>
      </ol>

      <div v-if="loading" class="mc-skeleton" style="height: 420px"></div>

      <form v-else class="mc-card p-3 p-sm-4" novalidate @submit.prevent="isLast ? save() : next()">
        <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

        <!-- Step 1: identity -->
        <div v-show="step === 0" class="form-grid">
          <div class="span-2">
            <label class="form-label" for="a-tag">Ear tag number <span class="req">*</span></label>
            <input id="a-tag" v-model="f.tag_number" class="form-control" :class="{ 'is-invalid': fieldErrors.tag_number }" maxlength="40" autocomplete="off" placeholder="e.g. KE-0425" />
            <div v-if="fieldErrors.tag_number" class="form-hint text-danger">{{ fieldErrors.tag_number }}</div>
          </div>
          <div>
            <label class="form-label" for="a-name">Name</label>
            <input id="a-name" v-model="f.name" class="form-control" maxlength="80" placeholder="e.g. Neema" />
          </div>
          <div>
            <label class="form-label" for="a-nid">National livestock ID</label>
            <input id="a-nid" v-model="f.national_id" class="form-control" maxlength="60" placeholder="If issued" />
          </div>

          <fieldset class="span-2">
            <legend class="form-label">Sex <span class="req">*</span></legend>
            <div class="choice-row">
              <label v-for="s in ['female', 'male']" :key="s" class="choice" :class="{ on: f.sex === s }">
                <input v-model="f.sex" type="radio" :value="s" class="visually-hidden" />{{ s === 'female' ? 'Female (cow / heifer)' : 'Male (bull / steer)' }}
              </label>
            </div>
            <div v-if="fieldErrors.sex" class="form-hint text-danger">{{ fieldErrors.sex }}</div>
          </fieldset>

          <div class="span-2">
            <div class="d-flex justify-content-between align-items-baseline">
              <label class="form-label" :for="dobUnknown ? 'a-age' : 'a-dob'">{{ dobUnknown ? 'Estimated age (months)' : 'Date of birth' }}</label>
              <button type="button" class="btn btn-link btn-sm p-0" @click="dobUnknown = !dobUnknown">{{ dobUnknown ? 'I know the date' : 'I don’t know the exact date' }}</button>
            </div>
            <input v-if="!dobUnknown" id="a-dob" v-model="f.date_of_birth" type="date" class="form-control" :max="new Date().toISOString().slice(0, 10)" :class="{ 'is-invalid': fieldErrors.date_of_birth }" />
            <input v-else id="a-age" v-model="f.age_estimate_months" type="number" inputmode="numeric" min="0" max="360" class="form-control" placeholder="e.g. 30" :class="{ 'is-invalid': fieldErrors.age_estimate_months }" />
            <div v-if="fieldErrors.date_of_birth || fieldErrors.age_estimate_months" class="form-hint text-danger">{{ fieldErrors.date_of_birth || fieldErrors.age_estimate_months }}</div>
          </div>

          <div>
            <label class="form-label" for="a-purpose">Purpose</label>
            <select id="a-purpose" v-model="f.purpose" class="form-select">
              <option value="">Not sure</option>
              <option v-for="(label, key) in PURPOSES" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="form-label" for="a-breed">Breed (your belief)</label>
            <select id="a-breed" v-model="f.breed_claimed" class="form-select">
              <option value="">Don’t know</option>
              <option v-for="b in breedOptions" :key="b.value" :value="b.value">{{ b.label }}</option>
            </select>
          </div>
          <div class="span-2">
            <label class="form-label" for="a-colour">Colour & markings</label>
            <input id="a-colour" v-model="f.colour" class="form-control" maxlength="120" placeholder="e.g. Red with white patches on the face" />
          </div>
        </div>

        <!-- Step 2: breeding & production -->
        <div v-show="step === 1" class="form-grid">
          <p class="span-2 form-hint mt-0">All optional, but a full record makes certification faster and the certificate more valuable.</p>
          <div>
            <label class="form-label" for="a-sire">Sire (father) name</label>
            <input id="a-sire" v-model="f.sire_name" class="form-control" maxlength="80" />
          </div>
          <div>
            <label class="form-label" for="a-sire-tag">Sire tag / ID</label>
            <input id="a-sire-tag" v-model="f.sire_tag" class="form-control" maxlength="40" />
          </div>
          <div>
            <label class="form-label" for="a-dam">Dam (mother) name</label>
            <input id="a-dam" v-model="f.dam_name" class="form-control" maxlength="80" />
          </div>
          <div>
            <label class="form-label" for="a-dam-tag">Dam tag / ID</label>
            <input id="a-dam-tag" v-model="f.dam_tag" class="form-control" maxlength="40" />
          </div>
          <div class="span-2">
            <label class="form-label" for="a-straw">AI straw code</label>
            <input id="a-straw" v-model="f.ai_straw_code" class="form-control" maxlength="60" placeholder="If conceived by artificial insemination" />
          </div>
          <div>
            <label class="form-label" for="a-weight">Weight (kg)</label>
            <input id="a-weight" v-model="f.weight_kg" type="number" inputmode="decimal" step="0.1" min="10" max="2000" class="form-control" :class="{ 'is-invalid': fieldErrors.weight_kg }" />
            <div v-if="fieldErrors.weight_kg" class="form-hint text-danger">{{ fieldErrors.weight_kg }}</div>
          </div>
          <div>
            <label class="form-label" for="a-bcs">Body condition score (1–5)</label>
            <input id="a-bcs" v-model="f.body_condition_score" type="number" inputmode="decimal" step="0.5" min="1" max="5" class="form-control" :class="{ 'is-invalid': fieldErrors.body_condition_score }" />
            <div v-if="fieldErrors.body_condition_score" class="form-hint text-danger">{{ fieldErrors.body_condition_score }}</div>
          </div>
          <template v-if="showMilk">
            <div>
              <label class="form-label" for="a-lact">Lactation number</label>
              <input id="a-lact" v-model="f.lactation_number" type="number" inputmode="numeric" min="0" max="20" class="form-control" placeholder="0 if not yet calved" />
            </div>
            <div>
              <label class="form-label" for="a-milk">Milk per day (litres)</label>
              <input id="a-milk" v-model="f.milk_litres_per_day" type="number" inputmode="decimal" step="0.1" min="0" max="100" class="form-control" />
            </div>
          </template>
        </div>

        <!-- Step 3: farm (its location is copied onto the animal by the API) -->
        <div v-show="step === 2">
          <fieldset>
            <legend class="form-label">Which farm is this animal kept on? <span class="req">*</span></legend>
            <div class="farm-choices">
              <label v-for="h in farms" :key="h.id" class="farm-choice" :class="{ on: f.holding_id === h.id }">
                <input v-model="f.holding_id" type="radio" :value="h.id" class="visually-hidden" />
                <Icon name="pin" :size="18" />
                <span><strong>{{ h.name }}</strong><small>{{ farmPlace(h) || '—' }}{{ h.latitude ? ' · on the map' : '' }}</small></span>
              </label>
              <label class="farm-choice" :class="{ on: addingFarm }">
                <input v-model="f.holding_id" type="radio" value="new" class="visually-hidden" />
                <Icon name="plus" :size="18" />
                <span><strong>{{ farms.length ? 'A different farm' : 'Add my farm' }}</strong><small>Name, county and map pin</small></span>
              </label>
            </div>
            <div v-if="fieldErrors.holding_id" class="form-hint text-danger">{{ fieldErrors.holding_id }}</div>
          </fieldset>

          <div v-if="addingFarm" class="new-farm mt-3">
            <FarmFields :farm="newFarm" :errors="farmErrors" id-prefix="nf" />
          </div>
          <p v-else-if="f.holding_id" class="form-hint mt-2">The animal takes this farm’s county, village and map pin. Change them any time under <router-link to="/farms">Farms</router-link>.</p>
        </div>

        <div class="form-actions">
          <button v-if="step > 0" type="button" class="btn btn-outline" @click="back"><Icon name="arrow-left" :size="16" /> Back</button>
          <span v-else></span>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            <template v-if="isLast">{{ saving ? 'Saving…' : editId ? 'Save changes' : 'Save & add photos' }}</template>
            <template v-else>Next <Icon name="arrow-right" :size="16" /></template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style>
.stepper { list-style: none; padding: 0; margin: 0 0 1.25rem; display: flex; gap: .5rem; overflow-x: auto; }
.stepper li { flex: 1; min-width: 0; }
.stepper button, .stepper .upcoming { width: 100%; }
.stepper button, .stepper li.upcoming {
  display: flex; align-items: center; gap: .5rem; padding: .55rem .7rem; border-radius: 10px;
  border: 1px solid var(--mc-border); background: var(--mc-surface); color: var(--mc-muted); font-weight: 650; font-size: .85rem;
}
.stepper li.active button { border-color: var(--mc-green-700); color: var(--mc-green-800); background: var(--mc-green-50); }
.stepper li.done button { color: var(--mc-ink); }
.stepper button:disabled { cursor: default; }
.stepper-num {
  flex: none; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center;
  background: #ece8dc; font-size: .8rem;
}
.stepper li.active .stepper-num, .stepper li.done .stepper-num { background: var(--mc-green-700); color: #fff; }
.stepper-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 575px) { .stepper li:not(.active) .stepper-label { display: none; } .stepper li:not(.active) { flex: none; } }


.farm-choices { display: grid; gap: .5rem; }
.farm-choice { display: flex; align-items: center; gap: .75rem; padding: .8rem 1rem; border: 1.5px solid var(--mc-border); border-radius: var(--mc-radius-sm); cursor: pointer; background: #fff; }
.farm-choice > svg { color: var(--mc-green-700); flex: none; }
.farm-choice span { display: flex; flex-direction: column; }
.farm-choice small { color: var(--mc-muted); }
.farm-choice.on { border-color: var(--mc-green-700); background: var(--mc-green-50); }
.farm-choice:focus-within { outline: 3px solid var(--mc-gold-100); }
.new-farm { padding-top: .25rem; border-top: 1px dashed var(--mc-border); }
</style>
