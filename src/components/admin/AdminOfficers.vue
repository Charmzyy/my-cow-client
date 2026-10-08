<script setup>
import { computed, onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import { api } from '../../api';
import { CADRES, formatDate } from '../../requests';

const officers = ref([]);
const loading = ref(true);
const error = ref('');
const tab = ref('pending');
const busyId = ref(null);

const STATUS = {
  pending: { label: 'Pending', chip: 'mc-chip-gold' },
  approved: { label: 'Verified', chip: 'mc-chip-green' },
  rejected: { label: 'Rejected', chip: 'mc-chip-ochre' },
  suspended: { label: 'Suspended', chip: 'mc-chip-ochre' },
};
const groups = computed(() => ({
  pending: officers.value.filter((o) => o.status === 'pending'),
  approved: officers.value.filter((o) => o.status === 'approved'),
  other: officers.value.filter((o) => ['rejected', 'suspended'].includes(o.status)),
}));
const shown = computed(() => groups.value[tab.value]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    officers.value = (await api('/admin/officers')).officers;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function act(o, action) {
  let body;
  if (action === 'approve') {
    const { isConfirmed } = await Swal.fire({
      titleText: `Approve ${o.user.fullname}?`,
      text: `Only approve after confirming licence ${o.licence_number} is current with the Kenya Veterinary Board. They will be able to certify animals under it.`,
      input: 'checkbox',
      inputPlaceholder: 'I have verified this licence',
      inputValidator: (checked) => (!checked ? 'Please confirm you verified the licence.' : undefined),
      showCancelButton: true,
      confirmButtonText: 'Approve officer',
    });
    if (!isConfirmed) return;
  } else {
    const { isConfirmed, value } = await Swal.fire({
      titleText: action === 'reject' ? `Reject ${o.user.fullname}’s application?` : `Suspend ${o.user.fullname}?`,
      text: action === 'suspend' ? 'Their open requests go back to the queue for reassignment.' : '',
      input: 'textarea',
      inputLabel: 'Reason (the applicant will see this)',
      inputValidator: (v) => (!v?.trim() ? 'Please give a reason.' : undefined),
      showCancelButton: true,
      confirmButtonText: action === 'reject' ? 'Reject' : 'Suspend',
      customClass: { confirmButton: 'mc-danger' },
    });
    if (!isConfirmed) return;
    body = { note: value.trim() };
  }

  busyId.value = o.id;
  try {
    await api(`/admin/officers/${o.id}/${action}`, { method: 'PUT', body });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t update', text: e.message });
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 1000px">
      <header class="mc-page-head">
        <span class="mc-eyebrow">People</span>
        <h1>Officers</h1>
        <p>Vets and livestock officers who certify animals. Check each licence with the Kenya Veterinary Board before approving.</p>
      </header>

      <div class="seg mb-4" role="tablist">
        <button v-for="[key, label] in [['pending', 'Applications'], ['approved', 'Verified'], ['other', 'Rejected / suspended']]" :key="key"
          role="tab" :aria-selected="tab === key" :class="{ on: tab === key }" @click="tab = key">
          {{ label }} <span class="seg-count">{{ groups[key].length }}</span>
        </button>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div v-if="loading" class="mc-skeleton" style="height: 240px"></div>
      <EmptyState v-else-if="!shown.length" icon="shield" :title="tab === 'pending' ? 'No applications waiting' : 'No officers here'"
        :text="tab === 'pending' ? 'Vets apply from their account (My herd → Apply to certify animals).' : ''" />

      <div v-else class="d-grid gap-3">
        <article v-for="o in shown" :key="o.id" class="mc-card officer-card">
          <div class="d-flex flex-wrap justify-content-between gap-2">
            <div>
              <strong class="d-block">{{ o.user.fullname }}</strong>
              <span class="small text-secondary">{{ o.user.email }} · <a :href="`tel:${o.phone}`">{{ o.phone }}</a></span>
            </div>
            <span class="mc-chip" :class="STATUS[o.status].chip">{{ STATUS[o.status].label }}</span>
          </div>
          <dl class="officer-facts">
            <div><dt>Cadre</dt><dd>{{ CADRES[o.cadre] }}</dd></div>
            <div><dt>Licence no.</dt><dd class="font-monospace-num">{{ o.licence_number }}</dd></div>
            <div><dt>County</dt><dd>{{ o.county?.name }}</dd></div>
            <div v-if="o.organisation"><dt>Organisation</dt><dd>{{ o.organisation }}</dd></div>
            <div><dt>Applied</dt><dd>{{ formatDate(o.created_at) }}</dd></div>
            <div v-if="o.status === 'approved'"><dt>Open requests</dt><dd>{{ o.open_requests }}</dd></div>
          </dl>
          <p v-if="o.review_note" class="small mb-2"><strong>Note:</strong> {{ o.review_note }}</p>
          <div class="d-flex gap-2 flex-wrap">
            <button v-if="['pending', 'suspended'].includes(o.status)" class="btn btn-primary btn-sm" :disabled="busyId === o.id" @click="act(o, 'approve')">
              <Icon name="check" :size="16" /> Approve
            </button>
            <button v-if="o.status === 'pending'" class="btn btn-danger-soft btn-sm" :disabled="busyId === o.id" @click="act(o, 'reject')">Reject</button>
            <button v-if="o.status === 'approved'" class="btn btn-danger-soft btn-sm" :disabled="busyId === o.id" @click="act(o, 'suspend')">Suspend</button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<style>
.officer-card { padding: 1.1rem 1.25rem; box-shadow: none; }
.officer-facts { margin: .85rem 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: .5rem 1.25rem; }
.officer-facts dt { font-size: .78rem; font-weight: 600; color: var(--mc-muted); }
.officer-facts dd { margin: 0; font-weight: 650; }
</style>
