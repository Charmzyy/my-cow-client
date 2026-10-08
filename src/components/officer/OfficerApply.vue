<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { getCounties } from '../../lookups';
import { CADRES, formatDate } from '../../requests';

const application = ref(null);
const counties = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const fieldErrors = ref({});
const f = reactive({ licence_number: '', cadre: 'vet', phone: '', county_id: '', organisation: '' });

const canApply = computed(() => !application.value || application.value.status === 'rejected');

onMounted(async () => {
  try {
    const [app, list] = await Promise.all([api('/officer-application'), getCounties()]);
    application.value = app.application;
    counties.value = list;
    if (app.application) {
      Object.keys(f).forEach((k) => (f[k] = app.application[k] ?? f[k]));
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});

async function submit() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  fieldErrors.value = {};
  try {
    application.value = (await api('/officer-application', { method: 'POST', body: { ...f, organisation: f.organisation || null } })).application;
  } catch (e) {
    if (e.data?.errors) fieldErrors.value = Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]]));
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 720px">
      <router-link to="/herd" class="back-link"><Icon name="arrow-left" :size="16" /> My herd</router-link>
      <header class="mc-page-head mt-2">
        <span class="mc-eyebrow">For vets & officers</span>
        <h1>Become a certifying officer</h1>
        <p>Licensed vets and livestock officers review animals and sign certificates under their licence number. We verify every licence before approval.</p>
      </header>

      <div v-if="loading" class="mc-skeleton" style="height: 380px"></div>

      <template v-else>
        <div v-if="application?.status === 'pending'" class="mc-alert mc-alert-info mb-4">
          <Icon name="clock" :size="18" />
          <span><strong>Application received {{ formatDate(application.created_at) }}.</strong> We’re verifying licence {{ application.licence_number }}. You’ll be switched to the officer workspace automatically once approved.</span>
        </div>
        <div v-else-if="application?.status === 'approved'" class="mc-alert mc-alert-success mb-4">
          <Icon name="check-circle" :size="18" /><span>You’re a verified officer. Sign out and back in if you don’t see your queue yet.</span>
        </div>
        <div v-else-if="application?.status === 'rejected'" class="mc-alert mc-alert-error mb-4">
          <Icon name="x" :size="18" /><span><strong>Not approved:</strong> {{ application.review_note }} You can correct the details and apply again.</span>
        </div>
        <div v-else-if="application?.status === 'suspended'" class="mc-alert mc-alert-error mb-4">
          <Icon name="alert" :size="18" /><span><strong>Suspended:</strong> {{ application.review_note }}</span>
        </div>

        <form v-if="canApply" class="mc-card p-3 p-sm-4" novalidate @submit.prevent="submit">
          <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
          <div class="form-grid">
            <div class="span-2">
              <label class="form-label" for="o-cadre">I am a…</label>
              <select id="o-cadre" v-model="f.cadre" class="form-select">
                <option v-for="(label, key) in CADRES" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="o-licence">Licence / registration number <span class="req">*</span></label>
              <input id="o-licence" v-model="f.licence_number" class="form-control" maxlength="40" :class="{ 'is-invalid': fieldErrors.licence_number }" placeholder="As issued by the Kenya Veterinary Board" />
              <div v-if="fieldErrors.licence_number" class="form-hint text-danger">{{ fieldErrors.licence_number }}</div>
            </div>
            <div>
              <label class="form-label" for="o-phone">Mobile number <span class="req">*</span></label>
              <input id="o-phone" v-model="f.phone" type="tel" inputmode="tel" class="form-control" :class="{ 'is-invalid': fieldErrors.phone }" placeholder="0712 345 678" />
              <div v-if="fieldErrors.phone" class="form-hint text-danger">{{ fieldErrors.phone }}</div>
            </div>
            <div>
              <label class="form-label" for="o-county">County you cover <span class="req">*</span></label>
              <select id="o-county" v-model="f.county_id" class="form-select" :class="{ 'is-invalid': fieldErrors.county_id }">
                <option value="">Choose county…</option>
                <option v-for="c in counties" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <div v-if="fieldErrors.county_id" class="form-hint text-danger">{{ fieldErrors.county_id }}</div>
            </div>
            <div>
              <label class="form-label" for="o-org">Organisation</label>
              <input id="o-org" v-model="f.organisation" class="form-control" maxlength="120" placeholder="e.g. County Government of Nakuru" />
            </div>
          </div>
          <p class="form-hint mt-3 mb-0">By applying you confirm the licence is yours and current. Certificates you sign carry your name and licence number.</p>
          <div class="form-actions">
            <span></span>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span>
              {{ application?.status === 'rejected' ? 'Apply again' : 'Submit application' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
