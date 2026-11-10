<script setup>
// Workspaces (organisations): the ones I'm in, starting a co-op or company, and — for owners and
// admins — its name, its people and which farms are in it. Matches OrganisationController.
// Being in a workspace doesn't open its farms: each farm's own team (FarmTeam.vue) decides that.
import { computed, onMounted, reactive, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';
import { auth } from '../../auth';
import { ORG_ROLES, ORG_TYPES, canManageOrg, canManageOrgMember, org, setOrganisations, switchOrg } from '../../org';

const current = computed(() => org.current);
const manages = computed(() => canManageOrg(current.value));

const members = ref([]);
const myFarms = ref([]);          // every farm I own, across workspaces (for "bring a farm in")
const loading = ref(true);
const error = ref('');

const creating = ref(false);
const newOrg = reactive({ name: '', type: 'coop' });
const name = ref('');
const invite = reactive({ email: '', role: 'member' });
const errors = ref({});
const saving = ref(false);

const farmsElsewhere = computed(() => myFarms.value.filter((f) => f.my_role === 'owner' && f.organisation_id !== org.currentId));

function fieldErrors(e) {
  return e.data?.errors ? Object.fromEntries(Object.entries(e.data.errors).map(([k, v]) => [k, v[0]])) : {};
}

function toast(title) {
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title, showConfirmButton: false, timer: 2000 });
}

async function refreshOrgs() {
  const me = await api('/me');
  setOrganisations(me.organisations);
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    await refreshOrgs();
    name.value = current.value?.name || '';
    const [team, farms] = await Promise.all([
      manages.value ? api(`/orgs/${org.currentId}/members`) : Promise.resolve({ members: [] }),
      auth.isFarmer ? api('/holdings', { org: false }) : Promise.resolve({ holdings: [] }),
    ]);
    members.value = team.members;
    myFarms.value = farms.holdings;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  try {
    const { organisation } = await api('/orgs', { method: 'POST', body: { name: newOrg.name.trim(), type: newOrg.type } });
    await refreshOrgs();
    switchOrg(organisation.id);   // re-keys the page: it reloads inside the new workspace
    toast('Organisation created');
  } catch (e) {
    errors.value = fieldErrors(e);
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t create it', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function rename() {
  if (saving.value || !name.value.trim()) return;
  saving.value = true;
  try {
    await api(`/orgs/${org.currentId}`, { method: 'PUT', body: { name: name.value.trim() } });
    await refreshOrgs();
    toast('Name saved');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t save the name', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function addMember() {
  if (saving.value) return;
  saving.value = true;
  errors.value = {};
  try {
    await api(`/orgs/${org.currentId}/members`, { method: 'POST', body: { email: invite.email.trim(), role: invite.role } });
    Object.assign(invite, { email: '', role: 'member' });
    toast('Added');
    await load();
  } catch (e) {
    errors.value = fieldErrors(e);
    if (!e.data?.errors) Swal.fire({ icon: 'error', title: 'Couldn’t add them', text: e.message });
  } finally {
    saving.value = false;
  }
}

async function setRole(m, role) {
  try {
    await api(`/orgs/${org.currentId}/members/${m.id}`, { method: 'PUT', body: { role } });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t change the role', text: e.message });
  }
}

async function remove(m) {
  const { isConfirmed } = await Swal.fire({
    title: `Remove ${m.user.fullname}?`,
    text: 'They leave this organisation. Anyone still on one of its farm teams must be removed from those farms first.',
    showCancelButton: true, confirmButtonText: 'Remove', customClass: { confirmButton: 'mc-danger' }, focusCancel: true,
  });
  if (!isConfirmed) return;
  try {
    await api(`/orgs/${org.currentId}/members/${m.id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t remove them', text: e.message });
  }
}

async function bringIn(farm) {
  const { isConfirmed } = await Swal.fire({
    title: `Move ${farm.name} into ${current.value.name}?`,
    text: 'Its animals, milk records and team move with it. You stay its owner.',
    showCancelButton: true, confirmButtonText: 'Move farm', focusCancel: true,
  });
  if (!isConfirmed) return;
  try {
    // Across workspaces: the farm is still in its old one, so don't send the current workspace
    await api(`/holdings/${farm.id}/organisation`, { method: 'PUT', body: { organisation_id: org.currentId }, org: false });
    toast('Farm moved');
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t move the farm', text: e.message });
  }
}

function contact(m) {
  return m.user.email || m.user.login_phone || m.user.phone || '';
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 760px">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">{{ current ? ORG_TYPES[current.type] : 'Workspaces' }}</span>
          <h1>{{ current?.type === 'personal' ? 'My farms' : current?.name || 'Organisation' }}</h1>
          <p>A workspace groups farms and people. A co-op or company can run many farms here; who may do what on each farm is still set on that farm’s team.</p>
        </div>
        <button v-if="!creating && auth.isFarmer" class="btn btn-outline btn-sm" @click="creating = true"><Icon name="plus" :size="16" /> Start a co-op or company</button>
      </header>

      <div v-if="loading" class="mc-skeleton" style="height: 320px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else>
        <form v-if="creating" class="mc-card p-3 p-sm-4 mb-4" novalidate @submit.prevent="create">
          <h2 class="h5 mb-3">New organisation</h2>
          <div class="row g-3">
            <div class="col-sm-7">
              <label class="form-label" for="o-name">Name</label>
              <input id="o-name" v-model="newOrg.name" class="form-control" :class="{ 'is-invalid': errors.name }" maxlength="120" required />
              <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
            </div>
            <div class="col-sm-5">
              <label class="form-label" for="o-type">Type</label>
              <select id="o-type" v-model="newOrg.type" class="form-select">
                <option value="coop">{{ ORG_TYPES.coop }}</option>
                <option value="company">{{ ORG_TYPES.company }}</option>
              </select>
            </div>
          </div>
          <p class="form-hint mt-2 mb-0">You become its owner. Your own farms stay in “My farms” until you move them.</p>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-primary" :disabled="saving || !newOrg.name.trim()"><span v-if="saving" class="spinner-border spinner-border-sm"></span> Create</button>
            <button type="button" class="btn btn-outline" @click="creating = false">Cancel</button>
          </div>
        </form>

        <p v-if="!current" class="mc-card p-3 p-sm-4">You’re not in a workspace yet. Your first farm creates “My farms” for you.</p>

        <template v-else>
          <section v-if="manages && current.type !== 'personal'" class="mc-card p-3 p-sm-4 mb-4">
            <h2 class="h5 mb-3">Name</h2>
            <form class="d-flex gap-2" @submit.prevent="rename">
              <label class="visually-hidden" for="o-rename">Organisation name</label>
              <input id="o-rename" v-model="name" class="form-control" maxlength="120" />
              <button class="btn btn-primary" :disabled="saving || !name.trim() || name.trim() === current.name">Save</button>
            </form>
          </section>

          <section v-if="manages" class="mb-4">
            <h2 class="h5 mb-2">People</h2>
            <form class="mc-card p-3 mb-3 d-flex flex-wrap gap-2 align-items-start" novalidate @submit.prevent="addMember">
              <div class="flex-grow-1">
                <label class="visually-hidden" for="i-email">Their account’s email</label>
                <input id="i-email" v-model="invite.email" type="email" inputmode="email" placeholder="Their account’s email"
                  class="form-control" :class="{ 'is-invalid': errors.email }" />
                <div v-if="errors.email" class="invalid-feedback">{{ errors.email }}</div>
              </div>
              <label class="visually-hidden" for="i-role">Role</label>
              <select id="i-role" v-model="invite.role" class="form-select" style="width: auto">
                <option value="member">{{ ORG_ROLES.member }}</option>
                <option v-if="current.my_role === 'owner'" value="admin">{{ ORG_ROLES.admin }}</option>
              </select>
              <button class="btn btn-primary" :disabled="saving || !invite.email.trim()"><Icon name="plus" :size="16" /> Add</button>
            </form>

            <ul class="team-list mc-card">
              <li v-for="m in members" :key="m.id">
                <span class="team-avatar" aria-hidden="true"><Icon name="user" :size="18" /></span>
                <span class="team-main">
                  <strong>{{ m.user.fullname }}<template v-if="m.user_id === auth.user?.id"> (you)</template></strong>
                  <span>{{ contact(m) }}</span>
                </span>
                <span class="mc-chip" :class="m.role === 'owner' ? 'mc-chip-green' : m.role === 'admin' ? 'mc-chip-gold' : 'mc-chip-ink'">{{ ORG_ROLES[m.role] }}</span>
                <span v-if="canManageOrgMember(current.my_role, m)" class="d-flex gap-1">
                  <button v-if="current.my_role === 'owner'" class="btn btn-outline btn-sm" @click="setRole(m, m.role === 'admin' ? 'member' : 'admin')">
                    {{ m.role === 'admin' ? 'Make member' : 'Make admin' }}
                  </button>
                  <button class="btn btn-danger-soft btn-sm" :aria-label="`Remove ${m.user.fullname}`" @click="remove(m)"><Icon name="trash" :size="15" /></button>
                </span>
              </li>
            </ul>
          </section>

          <section v-if="manages && farmsElsewhere.length" class="mb-4">
            <h2 class="h5 mb-1">Bring a farm in</h2>
            <p class="small text-secondary">Farms you own in your other workspaces.</p>
            <ul class="team-list mc-card">
              <li v-for="f in farmsElsewhere" :key="f.id">
                <span class="team-avatar" aria-hidden="true"><Icon name="pin" :size="18" /></span>
                <span class="team-main"><strong>{{ f.name }}</strong><span>{{ f.animals_count }} animals</span></span>
                <button class="btn btn-outline btn-sm" @click="bringIn(f)">Move here</button>
              </li>
            </ul>
          </section>

          <p v-if="!manages" class="mc-card p-3 p-sm-4">
            You’re a {{ ORG_ROLES[current.my_role]?.toLowerCase() }} here. Its owner and admins manage its people and farms.
          </p>
        </template>
      </template>
    </div>
  </div>
</template>
