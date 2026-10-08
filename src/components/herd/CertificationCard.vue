<script setup>
// The certification panel on an animal's profile: readiness → request → status → outcome.
import { computed, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import StatusChip from '../ui/StatusChip.vue';
import { api, apiDownload } from '../../api';
import { readiness } from '../../animals';
import { breedLabel } from '../../breeds';
import { INSPECTION, OPEN_STATUSES, formatDate } from '../../requests';

const props = defineProps({ animal: { type: Object, required: true } });
const emit = defineEmits(['changed']);

const busy = ref(false);
const error = ref('');
const problems = ref([]);

const req = computed(() => props.animal.latest_request || null);
const isOpen = computed(() => req.value && OPEN_STATUSES.includes(req.value.status));
const checks = computed(() => readiness(props.animal));
const ready = computed(() => checks.value.every((c) => c.done));
const cert = computed(() => req.value?.certificate || null);
// A revoked certificate can be replaced by a fresh request
const canRequest = computed(() => !isOpen.value && (req.value?.status !== 'approved' || cert.value?.status === 'revoked'));
const downloading = ref(false);

async function download() {
  downloading.value = true;
  error.value = '';
  try {
    await apiDownload(`/certificates/${cert.value.id}/pdf`, `${cert.value.certificate_no}.pdf`);
  } catch (e) {
    error.value = e.message;
  } finally {
    downloading.value = false;
  }
}

async function requestCertification() {
  if (busy.value) return;
  const { isConfirmed, value } = await Swal.fire({
    title: 'Request certification',
    html: `
      <p style="margin:0 0 .75rem;color:#4a554c">A verified officer will review this animal’s record and photos.</p>
      <label style="display:block;text-align:left;font-weight:650;margin-bottom:.35rem">How should it be inspected?</label>
      <select id="mc-method" class="swal2-select" style="display:block;width:100%;margin:0 0 1rem">
        <option value="photo">Photo review: faster, from the photos you added</option>
        <option value="visit">Farm visit: the officer inspects in person</option>
      </select>
      <label style="display:block;text-align:left;font-weight:650;margin-bottom:.35rem" for="mc-note">Note for the officer (optional)</label>
      <textarea id="mc-note" class="swal2-textarea" style="display:block;width:100%;margin:0" maxlength="500" placeholder="e.g. Best time to visit is mornings"></textarea>`,
    showCancelButton: true,
    confirmButtonText: 'Send request',
    focusConfirm: false,
    preConfirm: () => ({
      inspection_method: document.getElementById('mc-method').value,
      owner_note: document.getElementById('mc-note').value.trim() || null,
    }),
  });
  if (!isConfirmed) return;
  await act(() => api(`/animals/${props.animal.id}/certification-requests`, { method: 'POST', body: value }), 'Request sent');
}

async function cancelRequest() {
  const { isConfirmed } = await Swal.fire({
    title: 'Cancel this request?', showCancelButton: true, confirmButtonText: 'Cancel request', cancelButtonText: 'Keep it',
    customClass: { confirmButton: 'mc-danger' },
  });
  if (isConfirmed) await act(() => api(`/certification-requests/${req.value.id}/cancel`, { method: 'PUT' }), 'Request cancelled');
}

async function resubmit() {
  const { isConfirmed, value } = await Swal.fire({
    title: 'Send back to the officer',
    input: 'textarea',
    inputLabel: 'What did you change? (optional)',
    inputPlaceholder: 'e.g. Added a clearer ear tag photo',
    showCancelButton: true,
    confirmButtonText: 'Resubmit',
  });
  if (isConfirmed) await act(() => api(`/certification-requests/${req.value.id}/resubmit`, { method: 'PUT', body: { owner_note: value?.trim() || null } }), 'Sent back to the officer');
}

async function act(call, success) {
  busy.value = true;
  error.value = '';
  problems.value = [];
  try {
    await call();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: success, showConfirmButton: false, timer: 2200 });
    emit('changed');
  } catch (e) {
    problems.value = e.data?.problems || [];
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="mc-card p-3">
    <div class="d-flex justify-content-between align-items-start gap-2">
      <span class="mc-eyebrow">Certification</span>
      <StatusChip v-if="req" :status="req.status" />
    </div>

    <!-- Request in progress or decided -->
    <template v-if="req && req.status !== 'cancelled'">
      <dl class="cert-facts">
        <div><dt>Requested</dt><dd>{{ formatDate(req.created_at) }}</dd></div>
        <div><dt>Inspection</dt><dd>{{ INSPECTION[req.inspection_method] }}</dd></div>
        <div v-if="req.officer"><dt>Officer</dt><dd>{{ req.officer.fullname }}</dd></div>
        <template v-if="req.status === 'approved'">
          <div><dt>Certified breed</dt><dd>{{ breedLabel(req.approved_breed) }}</dd></div>
          <div><dt>Purity</dt><dd>{{ req.purity === 'purebred' ? 'Purebred' : `Crossbreed${req.purity_note ? ` · ${req.purity_note}` : ''}` }}</dd></div>
          <div><dt>Decided</dt><dd>{{ formatDate(req.decided_at) }}</dd></div>
        </template>
      </dl>

      <div v-if="req.status === 'needs_info'" class="mc-alert mc-alert-info mb-3">
        <Icon name="alert" :size="18" /><span><strong>The officer asks:</strong> {{ req.officer_note }}</span>
      </div>
      <div v-else-if="req.status === 'rejected'" class="mc-alert mc-alert-error mb-3">
        <Icon name="x" :size="18" /><span><strong>Reason:</strong> {{ req.officer_note }}</span>
      </div>
      <template v-else-if="req.status === 'approved'">
        <p v-if="req.officer_note" class="small"><strong>Officer’s remarks:</strong> {{ req.officer_note }}</p>
        <div v-if="cert?.status === 'revoked'" class="mc-alert mc-alert-error mb-3">
          <Icon name="x" :size="18" /><span>Certificate {{ cert.certificate_no }} was <strong>revoked</strong> on {{ formatDate(cert.revoked_at) }}<template v-if="cert.revoke_reason">: {{ cert.revoke_reason }}</template>. You can request certification again.</span>
        </div>
        <div v-else-if="cert" class="cert-box mb-3">
          <span class="mc-eyebrow">Certificate</span>
          <strong class="cert-no">{{ cert.certificate_no }}</strong>
          <span class="small text-secondary">Verification code <b class="cert-code">{{ cert.verification_code }}</b></span>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-primary flex-fill" :disabled="downloading" @click="download">
              <span v-if="downloading" class="spinner-border spinner-border-sm"></span><Icon v-else name="download" :size="18" /> Download PDF
            </button>
            <router-link :to="`/verify/${cert.verification_code}`" class="btn btn-outline flex-fill"><Icon name="shield" :size="16" /> Public page</router-link>
          </div>
        </div>
        <div v-else class="mc-alert mc-alert-info mb-3">
          <Icon name="clock" :size="18" /><span>Certified. Your certificate is being prepared; it will appear here shortly.</span>
        </div>
      </template>
      <p v-else class="small text-secondary">
        {{ req.status === 'submitted' ? 'An admin will assign a verified officer shortly.' : 'The officer is reviewing the record and photos. You can still add photos or fix details.' }}
      </p>
    </template>

    <!-- Readiness checklist (no request yet, or the last one was cancelled / rejected) -->
    <template v-if="canRequest">
      <h3 class="h6 mt-2">{{ ready ? 'Ready to request certification' : 'Before you can request certification' }}</h3>
      <ul class="checklist">
        <li v-for="c in checks" :key="c.label" :class="{ done: c.done }">
          <Icon :name="c.done ? 'check-circle' : 'clock'" :size="16" />{{ c.label }}
        </li>
      </ul>
    </template>

    <div v-if="error" class="mc-alert mc-alert-error mb-3" role="alert">
      <Icon name="alert" :size="18" />
      <span>{{ error }}<ul v-if="problems.length" class="mb-0 mt-1 ps-3"><li v-for="p in problems" :key="p">{{ p }}</li></ul></span>
    </div>

    <button v-if="canRequest" class="btn btn-primary w-100" :disabled="!ready || busy" @click="requestCertification">
      <span v-if="busy" class="spinner-border spinner-border-sm"></span><Icon v-else name="award" :size="18" />
      {{ ['rejected', 'approved'].includes(req?.status) ? 'Request again' : 'Request certification' }}
    </button>
    <div v-else-if="isOpen" class="d-flex gap-2">
      <button v-if="req.status === 'needs_info'" class="btn btn-primary flex-fill" :disabled="busy" @click="resubmit">
        <Icon name="refresh" :size="16" /> Resubmit
      </button>
      <button v-if="['submitted', 'assigned', 'needs_info'].includes(req.status)" class="btn btn-outline flex-fill" :disabled="busy" @click="cancelRequest">
        Cancel request
      </button>
    </div>
  </section>
</template>

<style>
.cert-facts { margin: .75rem 0; display: grid; gap: .45rem; }
.cert-facts > div { display: flex; justify-content: space-between; gap: 1rem; font-size: .9rem; }
.cert-facts dt { font-weight: 600; color: var(--mc-muted); }
.cert-facts dd { margin: 0; font-weight: 650; text-align: right; }
.cert-box { display: flex; flex-direction: column; gap: .2rem; padding: .9rem 1rem; border-radius: 12px; background: var(--mc-green-50); border: 1px solid var(--mc-green-100); }
.cert-no { font-size: 1.15rem; letter-spacing: .02em; }
.cert-code { letter-spacing: .1em; color: var(--mc-ink); }
.checklist { list-style: none; padding: 0; margin: .5rem 0 1rem; display: grid; gap: .45rem; font-size: .9rem; }
.checklist li { display: flex; align-items: center; gap: .5rem; color: var(--mc-ink-2); }
.checklist li svg { color: var(--mc-gold-600); flex: none; }
.checklist li.done svg { color: var(--mc-green-700); }
</style>
