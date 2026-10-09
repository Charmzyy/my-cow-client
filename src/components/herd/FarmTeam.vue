<script setup>
// One farm's team. Workers are added with phone + PIN (no email needed) and only log records;
// managers are existing MyCow accounts added by email and run the herd. Matches FarmMemberController.
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { auth } from '../../auth';
import { FARM_ROLES, canManageMember } from '../../farms';

const route = useRoute();
const farm = ref(null);
const members = ref([]);
const loading = ref(true);
const error = ref('');

const adding = ref(null);   // 'worker' | 'manager' | null
const worker = reactive({ fullname: '', phone: '', pin: '' });
const managerEmail = ref('');
const errors = ref({});
const saving = ref(false);
const added = ref(null);    // what to tell the new worker

const myRole = computed(() => farm.value?.my_role);
const signInUrl = `${window.location.origin}/login?mode=pin`;

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [{ holdings }, team] = await Promise.all([api('/holdings'), api(`/holdings/${route.params.id}/members`)]);
    farm.value = holdings.find((h) => h.id === route.params.id) || null;
    members.value = team.members;
  } catch (e) {
    error.value = e.status === 403 || e.status === 404 ? 'Only the farm’s owner and managers can see its team.' : e.message;
  } finally {
    loading.value = false;
  }
}

function open(kind) {
  adding.value = kind;
  errors.value = {};
  added.value = null;
}

function fieldErrors(e) {
  return e.data?.errors ? Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]])) : {};
}

async function addWorker() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  try {
    const res = await api(`/holdings/${farm.value.id}/workers`, { method: 'POST', body: { ...worker } });
    added.value = { name: worker.fullname.trim(), phone: res.member.user.login_phone, pin: worker.pin, existing: res.existing_account };
    Object.assign(worker, { fullname: '', phone: '', pin: '' });
    adding.value = null;
    await load();
  } catch (e) {
    errors.value = fieldErrors(e);
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t add the worker', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function addManager() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  try {
    await api(`/holdings/${farm.value.id}/managers`, { method: 'POST', body: { email: managerEmail.value.trim() } });
    managerEmail.value = '';
    adding.value = null;
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Manager added', showConfirmButton: false, timer: 2000 });
    await load();
  } catch (e) {
    errors.value = fieldErrors(e);
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t add the manager', text: e.message });
  }
  saving.value = false;
}

async function resetPin(m) {
  const { value: pin } = await Swal.fire({
    title: `New PIN for ${m.user.fullname}`,
    text: 'They’ll be signed out on their phone and need this PIN to sign in again.',
    input: 'text',
    inputAttributes: { inputmode: 'numeric', maxlength: 6, autocomplete: 'off' },
    inputPlaceholder: '4 to 6 digits',
    showCancelButton: true,
    confirmButtonText: 'Set PIN',
    inputValidator: (v) => (/^\d{4,6}$/.test(v || '') ? null : 'Use 4 to 6 digits.'),
  });
  if (!pin) return;
  try {
    await api(`/holdings/${farm.value.id}/members/${m.id}/pin`, { method: 'PUT', body: { pin } });
    Swal.fire({ icon: 'success', title: 'PIN changed', text: `Tell ${m.user.fullname} the new PIN: ${pin}` });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t change the PIN', text: e.message });
  }
}

async function remove(m) {
  const { isConfirmed } = await Swal.fire({
    title: `Remove ${m.user.fullname}?`,
    text: m.role === 'worker' ? 'They’ll lose access to this farm straight away. Records they entered stay.' : 'They’ll lose access to this farm straight away.',
    showCancelButton: true, confirmButtonText: 'Remove', customClass: { confirmButton: 'mc-danger' }, focusCancel: true,
  });
  if (!isConfirmed) return;
  try {
    await api(`/holdings/${farm.value.id}/members/${m.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t remove them', text: e.message });
  }
}

function contact(m) {
  return m.user.login_phone || m.user.email || m.user.phone || '';
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 760px">
      <router-link to="/farms" class="back-link"><Icon name="arrow-left" :size="16" /> Farms</router-link>

      <div v-if="loading" class="mc-skeleton mt-3" style="height: 320px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else-if="farm">
        <header class="mc-page-head mt-2 d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <span class="mc-eyebrow">{{ farm.name }}</span>
            <h1>Team</h1>
            <p>Workers sign in with their phone number and a PIN, and can only add records. Managers run the herd with you.</p>
          </div>
          <div v-if="!adding" class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" @click="open('worker')"><Icon name="plus" :size="16" /> Add worker</button>
            <button v-if="myRole === 'owner'" class="btn btn-outline btn-sm" @click="open('manager')"><Icon name="plus" :size="16" /> Add manager</button>
          </div>
        </header>

        <!-- What to tell the worker who was just added -->
        <div v-if="added" class="mc-alert mc-alert-success mb-4" role="status">
          <Icon name="check-circle" :size="18" />
          <span>
            <strong>{{ added.name }} is on the team.</strong>
            <template v-if="added.existing"> They already have a MyCow PIN from another farm, so they keep using that one.</template>
            <template v-else> Tell them: open <b>{{ signInUrl }}</b>, choose <b>Farm worker</b>, phone <b>{{ added.phone }}</b>, PIN <b>{{ added.pin }}</b>.</template>
          </span>
        </div>

        <form v-if="adding === 'worker'" class="mc-card p-3 p-sm-4 mb-4" novalidate @submit.prevent="addWorker">
          <h2 class="h5 mb-3">Add a worker</h2>
          <div class="row g-3">
            <div class="col-sm-6">
              <label class="form-label" for="w-name">Name</label>
              <input id="w-name" v-model="worker.fullname" class="form-control" :class="{ 'is-invalid': errors.fullname }" maxlength="80" required />
              <div v-if="errors.fullname" class="invalid-feedback">{{ errors.fullname }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label" for="w-phone">Phone number</label>
              <input id="w-phone" v-model="worker.phone" type="tel" inputmode="tel" class="form-control" :class="{ 'is-invalid': errors.phone }" placeholder="0712 345 678" required />
              <div v-if="errors.phone" class="invalid-feedback">{{ errors.phone }}</div>
            </div>
            <div class="col-sm-6">
              <label class="form-label" for="w-pin">PIN for signing in</label>
              <input id="w-pin" v-model="worker.pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off"
                class="form-control pin-input" :class="{ 'is-invalid': errors.pin }" required />
              <div v-if="errors.pin" class="invalid-feedback">{{ errors.pin }}</div>
              <p v-else class="form-hint mt-1">4 to 6 digits. Not 1234 or 0000.</p>
            </div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary" :disabled="saving || !worker.fullname || !worker.phone || worker.pin.length < 4">
              <span v-if="saving" class="spinner-border spinner-border-sm"></span> Add worker
            </button>
            <button type="button" class="btn btn-outline" @click="adding = null">Cancel</button>
          </div>
        </form>

        <form v-if="adding === 'manager'" class="mc-card p-3 p-sm-4 mb-4" novalidate @submit.prevent="addManager">
          <h2 class="h5 mb-1">Add a manager</h2>
          <p class="small text-secondary">They need their own MyCow account first. Managers can register, edit and remove animals and add workers, but can’t remove the farm or request certificates.</p>
          <label class="form-label" for="m-email">Their account’s email</label>
          <input id="m-email" v-model="managerEmail" type="email" inputmode="email" class="form-control" :class="{ 'is-invalid': errors.email }" required />
          <div v-if="errors.email" class="invalid-feedback">{{ errors.email }}</div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary" :disabled="saving || !managerEmail"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Add manager</button>
            <button type="button" class="btn btn-outline" @click="adding = null">Cancel</button>
          </div>
        </form>

        <ul class="team-list mc-card">
          <li v-for="m in members" :key="m.id">
            <span class="team-avatar" aria-hidden="true"><Icon :name="m.role === 'worker' ? 'phone' : 'user'" :size="18" /></span>
            <span class="team-main">
              <strong>{{ m.user.fullname }}<template v-if="m.user_id === auth.user?.id"> (you)</template></strong>
              <span>{{ contact(m) }}</span>
            </span>
            <span class="mc-chip" :class="m.role === 'owner' ? 'mc-chip-green' : m.role === 'manager' ? 'mc-chip-gold' : 'mc-chip-ink'">{{ FARM_ROLES[m.role] }}</span>
            <span v-if="canManageMember(myRole, m)" class="d-flex gap-1">
              <button v-if="m.user.login_phone" class="btn btn-outline btn-sm" :aria-label="`New PIN for ${m.user.fullname}`" @click="resetPin(m)">PIN</button>
              <button class="btn btn-danger-soft btn-sm" :aria-label="`Remove ${m.user.fullname}`" @click="remove(m)"><Icon name="trash" :size="15" /></button>
            </span>
          </li>
        </ul>
        <p v-if="members.length === 1" class="small text-secondary mt-3 mb-0">Just you so far. Add the people who milk and look after the animals, so they can record what they do.</p>
      </template>
    </div>
  </div>
</template>

<style>
.team-list { list-style: none; margin: 0; padding: 0; }
.team-list li { display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border-bottom: 1px solid var(--mc-border); flex-wrap: wrap; }
.team-list li:last-child { border-bottom: 0; }
.team-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--mc-green-50); color: var(--mc-green-800); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.team-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.team-main span { font-size: .85rem; color: var(--mc-muted); overflow-wrap: anywhere; }
</style>
