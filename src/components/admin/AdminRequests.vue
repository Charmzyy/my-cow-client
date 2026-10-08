<script setup>
// Paged, filtered on the server: stays fast and correct with thousands of requests.
import { onMounted, ref, watch } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import StatusChip from '../ui/StatusChip.vue';
import { STORAGE_URL } from '../../config';
import { api } from '../../api';
import { breedLabel, formatPct } from '../../breeds';
import { coverPhoto, displayName } from '../../animals';
import { INSPECTION, OPEN_STATUSES, formatDate } from '../../requests';

const OVERDUE_DAYS = 3; // matches AdminStatsController::OVERDUE_DAYS

const requests = ref([]);
const officers = ref([]);
const counties = ref([]);
const counts = ref({ unassigned: 0, progress: 0, decided: 0 });
const meta = ref({ page: 1, last_page: 1, total: 0 });
const loading = ref(true);
const error = ref('');
const busyId = ref(null);
const autoBusy = ref(false);

// Filters (kept in the URL-free state of this page)
const tab = ref('unassigned');
const q = ref('');
const countyId = ref('');
const page = ref(1);

let seq = 0; // ignore slow, out-of-date responses when filters change quickly
async function load() {
  const mine = ++seq;
  loading.value = true;
  error.value = '';
  const params = new URLSearchParams({ tab: tab.value, page: page.value });
  if (q.value.trim()) params.set('q', q.value.trim());
  if (countyId.value) params.set('county_id', countyId.value);
  try {
    const r = await api(`/admin/certification-requests?${params}`);
    if (mine !== seq) return;
    requests.value = r.requests;
    counts.value = r.counts;
    meta.value = r.meta;
  } catch (e) {
    if (mine === seq) error.value = e.message;
  } finally {
    if (mine === seq) loading.value = false;
  }
}

async function loadOfficers() {
  try {
    officers.value = (await api('/admin/officers?status=approved')).officers;
  } catch {
    /* the assign dialog explains when there are none */
  }
}

// Search waits for a pause in typing; every filter change goes back to page 1
let timer;
watch(q, () => {
  clearTimeout(timer);
  timer = setTimeout(() => (page.value === 1 ? load() : (page.value = 1)), 350);
});
watch([tab, countyId], () => (page.value === 1 ? load() : (page.value = 1)));
watch(page, load);

function waitingDays(r) {
  return Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
}
function waitingLabel(r) {
  const d = waitingDays(r);
  return d === 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`;
}
function isOverdue(r) {
  return OPEN_STATUSES.includes(r.status) && waitingDays(r) >= OVERDUE_DAYS;
}

async function autoAssign() {
  const { isConfirmed } = await Swal.fire({
    title: 'Auto-assign waiting requests?',
    text: 'Each one goes to the least busy verified officer in the animal’s county. Requests in counties with no officer stay here for you to assign.',
    showCancelButton: true,
    confirmButtonText: 'Auto-assign',
  });
  if (!isConfirmed) return;
  autoBusy.value = true;
  try {
    const r = await api('/admin/certification-requests/auto-assign', { method: 'POST' });
    Swal.fire({ icon: r.skipped ? 'info' : 'success', title: r.assigned ? 'Done' : 'Nothing assigned', text: r.message });
    await Promise.all([load(), loadOfficers()]);
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t auto-assign', text: e.message });
  } finally {
    autoBusy.value = false;
  }
}

async function assign(r) {
  if (!officers.value.length) {
    Swal.fire({ icon: 'info', title: 'No verified officers yet', text: 'Approve an officer application first (Officers tab).' });
    return;
  }
  // Same-county officers first, then the least busy
  const sorted = [...officers.value].sort((a, b) =>
    (b.county_id === r.animal.county_id) - (a.county_id === r.animal.county_id) || a.open_requests - b.open_requests);
  // SweetAlert2 renders option labels as HTML: escape the user-entered names
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const options = Object.fromEntries(sorted.map((o) => [
    o.user_id,
    esc(`${o.user.fullname} · ${o.county?.name}${o.county_id === r.animal.county_id ? ' (same county)' : ''} · ${o.open_requests} open`),
  ]));

  const { isConfirmed, value } = await Swal.fire({
    titleText: `Assign ${displayName(r.animal)}`,
    text: `Animal is in ${r.animal.county?.name}. ${INSPECTION[r.inspection_method]} requested.`,
    input: 'select',
    inputOptions: options,
    inputValue: r.assigned_officer_id || sorted[0].user_id,
    showCancelButton: true,
    confirmButtonText: r.assigned_officer_id ? 'Reassign' : 'Assign',
  });
  if (!isConfirmed) return;

  busyId.value = r.id;
  try {
    await api(`/admin/certification-requests/${r.id}/assign`, { method: 'PUT', body: { officer_id: value } });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Officer assigned', showConfirmButton: false, timer: 2000 });
    await Promise.all([load(), loadOfficers()]);
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t assign', text: e.message });
  } finally {
    busyId.value = null;
  }
}

// Requests approved before certificates existed (v5) have none yet
async function issue(r) {
  busyId.value = r.id;
  try {
    const { certificate } = await api(`/admin/certification-requests/${r.id}/certificate`, { method: 'POST' });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Certificate ${certificate.certificate_no} issued`, showConfirmButton: false, timer: 2400 });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t issue', text: e.message });
  } finally {
    busyId.value = null;
  }
}

async function revoke(r) {
  const { isConfirmed, value } = await Swal.fire({
    titleText: `Revoke ${r.certificate.certificate_no}?`,
    text: 'The public verify page will show it as revoked at once. This can’t be undone.',
    input: 'textarea',
    inputLabel: 'Reason (kept in the audit log, shown to the owner)',
    inputValidator: (v) => (!v?.trim() ? 'Give a reason.' : undefined),
    showCancelButton: true,
    confirmButtonText: 'Revoke',
    customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;

  busyId.value = r.id;
  try {
    await api(`/admin/certificates/${r.certificate.id}/revoke`, { method: 'PUT', body: { reason: value.trim() } });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Certificate revoked', showConfirmButton: false, timer: 2200 });
    await load();
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t revoke', text: e.message });
  } finally {
    busyId.value = null;
  }
}

onMounted(async () => {
  load();
  loadOfficers();
  try {
    counties.value = await api('/counties');
  } catch {
    /* county filter just stays empty */
  }
});
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">Certification</span>
          <h1>Requests</h1>
          <p>Assign each request to a verified officer. Oldest requests are at the top; those waiting {{ OVERDUE_DAYS }}+ days are flagged.</p>
        </div>
        <div class="d-flex gap-2">
          <button v-if="tab === 'unassigned' && counts.unassigned" class="btn btn-primary btn-sm" :disabled="autoBusy" @click="autoAssign">
            <span v-if="autoBusy" class="spinner-border spinner-border-sm"></span><Icon v-else name="users" :size="16" /> Auto-assign by county
          </button>
          <button class="btn btn-outline btn-sm" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
        </div>
      </header>

      <div class="seg mb-3" role="tablist">
        <button v-for="[key, label] in [['unassigned', 'Needs an officer'], ['progress', 'In progress'], ['decided', 'Decided']]" :key="key"
          role="tab" :aria-selected="tab === key" :class="{ on: tab === key }" @click="tab = key">
          {{ label }} <span class="seg-count">{{ counts[key].toLocaleString() }}</span>
        </button>
      </div>

      <div class="req-filters mb-3">
        <div class="req-search">
          <Icon name="search" :size="16" />
          <label class="visually-hidden" for="rq-q">Search</label>
          <input id="rq-q" v-model="q" type="search" class="form-control" placeholder="Ear tag, animal or farmer name, phone" maxlength="80" />
        </div>
        <label class="visually-hidden" for="rq-county">County</label>
        <select id="rq-county" v-model="countyId" class="form-select">
          <option value="">All counties</option>
          <option v-for="c in counties" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div v-if="loading && !requests.length" class="mc-skeleton" style="height: 260px"></div>
      <EmptyState v-else-if="!requests.length" :icon="q || countyId ? 'search' : 'check-circle'"
        :title="q || countyId ? 'No requests match' : tab === 'unassigned' ? 'Every request has an officer' : 'Nothing here'"
        :text="q || countyId ? 'Try a different search or county.' : ''" />

      <ul v-else class="mc-card queue" :class="{ 'is-loading': loading }">
        <li v-for="r in requests" :key="r.id" class="queue-row">
          <img v-if="coverPhoto(r.animal)" :src="STORAGE_URL + coverPhoto(r.animal).path" alt="" class="queue-thumb" loading="lazy" />
          <span v-else class="queue-thumb queue-thumb-empty"><Icon name="image" :size="20" /></span>
          <span class="queue-main">
            <strong>{{ displayName(r.animal) }} <span class="text-secondary fw-normal">· Tag {{ r.animal.tag_number }}</span></strong>
            <span class="queue-sub">{{ r.requester?.fullname }} · {{ r.animal.county?.name }} · {{ INSPECTION[r.inspection_method] }} · {{ formatDate(r.created_at) }}</span>
            <span class="queue-sub">
              <template v-if="r.officer">Officer: {{ r.officer.fullname }}</template><template v-else>No officer yet</template>
              <template v-if="r.animal.ai_breed"> · AI: {{ breedLabel(r.animal.ai_breed) }} {{ formatPct(r.animal.ai_confidence) }}</template>
            </span>
            <span v-if="r.certificate" class="queue-sub">
              Certificate <router-link :to="`/verify/${r.certificate.verification_code}`">{{ r.certificate.certificate_no }}</router-link>
              <template v-if="r.certificate.status !== 'valid'"> · <strong>{{ r.certificate.status }}</strong></template>
            </span>
          </span>
          <span v-if="OPEN_STATUSES.includes(r.status)" class="mc-chip flex-none" :class="isOverdue(r) ? 'mc-chip-ochre' : 'mc-chip-ink'"
            :title="`Requested ${formatDate(r.created_at)}`">
            <Icon :name="isOverdue(r) ? 'alert' : 'clock'" :size="13" /> {{ waitingLabel(r) }}
          </span>
          <StatusChip :status="r.status" class="d-none d-md-inline-flex" />
          <button v-if="['submitted', 'assigned', 'in_review'].includes(r.status)" class="btn btn-sm flex-none"
            :class="r.status === 'submitted' ? 'btn-primary' : 'btn-outline'" :disabled="busyId === r.id" @click="assign(r)">
            {{ r.status === 'submitted' ? 'Assign' : 'Reassign' }}
          </button>
          <button v-else-if="r.status === 'approved' && !r.certificate" class="btn btn-sm btn-primary flex-none"
            :disabled="busyId === r.id" @click="issue(r)">Issue certificate</button>
          <button v-else-if="r.certificate?.status === 'valid'" class="btn btn-sm btn-outline flex-none"
            :disabled="busyId === r.id" @click="revoke(r)">Revoke</button>
        </li>
      </ul>

      <nav v-if="meta.last_page > 1" class="pager mt-3" aria-label="Pages">
        <button class="btn btn-outline btn-sm" :disabled="page <= 1 || loading" @click="page--"><Icon name="arrow-left" :size="16" /> Previous</button>
        <span class="small text-secondary">Page {{ meta.page }} of {{ meta.last_page }} · {{ meta.total.toLocaleString() }} requests</span>
        <button class="btn btn-outline btn-sm" :disabled="page >= meta.last_page || loading" @click="page++">Next <Icon name="arrow-right" :size="16" /></button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.req-filters { display: flex; gap: .5rem; flex-wrap: wrap; }
.req-search { position: relative; flex: 1 1 260px; }
.req-search svg { position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); color: var(--mc-muted); pointer-events: none; }
.req-search input { padding-left: 2.2rem; }
.req-filters select { flex: 0 1 220px; }
.queue.is-loading { opacity: .55; transition: opacity .15s; }
.pager { display: flex; justify-content: space-between; align-items: center; gap: .75rem; }
</style>
