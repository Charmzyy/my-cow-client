<script setup>
// The officer's case file: every photo (with its AI read), the full record, the farmer's
// contact, and the decision. Approving signs the result under the officer's licence.
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import StatusChip from '../ui/StatusChip.vue';
import AnimalEvents from '../herd/AnimalEvents.vue';
import MapView from '../ui/MapView.vue';
import { hasPoint } from '../../geo';
import { STORAGE_URL } from '../../config';
import { api, apiDownload } from '../../api';
import { BREEDS, NOT_A_COW, breedLabel, confidenceLevel, formatPct } from '../../breeds';
import { PHOTO_ANGLES, displayName, recordSections } from '../../animals';
import { INSPECTION, formatDate } from '../../requests';

const route = useRoute();
const router = useRouter();
const req = ref(null);
const loading = ref(true);
const error = ref('');
const saving = ref(false);
const formError = ref('');

const decision = ref('approve');
const f = reactive({ approved_breed: '', purity: 'purebred', purity_note: '', inspection_method: 'photo', officer_note: '' });
const confirm = reactive({ tag: false, photos: false, record: false });

// Breeds the model knows + common Kenyan breeds it doesn't (officers may certify any breed)
const breedSuggestions = [...Object.keys(BREEDS).map(breedLabel), 'Friesian', 'Fleckvieh', 'Brown Swiss', 'Gir', 'Simmental', 'Charolais', 'Hereford', 'Red Poll'];

const animal = computed(() => req.value?.animal);

const downloading = ref(false);
async function downloadCertificate() {
  const c = req.value.certificate;
  downloading.value = true;
  try {
    await apiDownload(`/certificates/${c.id}/pdf`, `${c.certificate_no}.pdf`);
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t download', text: e.message });
  } finally {
    downloading.value = false;
  }
}
const sections = computed(() => recordSections(animal.value));
const canDecide = computed(() => ['assigned', 'in_review'].includes(req.value?.status));
const level = computed(() => confidenceLevel(animal.value?.ai_confidence));
const photos = computed(() => {
  const byAngle = Object.fromEntries((animal.value?.photos || []).map((p) => [p.angle, p]));
  return PHOTO_ANGLES.map((a) => ({ ...a, photo: byAngle[a.key] })).filter((a) => a.photo);
});
const allConfirmed = computed(() => confirm.tag && confirm.photos && confirm.record);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    req.value = (await api(`/officer/requests/${route.params.id}`)).request;
    f.inspection_method = req.value.inspection_method;
    f.approved_breed = req.value.animal.ai_breed ? breedLabel(req.value.animal.ai_breed) : '';
    // Opening an assigned case starts the review
    if (req.value.status === 'assigned') {
      const started = await api(`/officer/requests/${req.value.id}/start`, { method: 'PUT' });
      req.value.status = started.request.status;
    }
  } catch (e) {
    error.value = e.status === 403 || e.status === 404 ? 'This request isn’t assigned to you.' : e.message;
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (saving.value) return;
  formError.value = '';
  let path;
  let body;
  if (decision.value === 'approve') {
    if (!allConfirmed.value) {
      formError.value = 'Tick all three confirmations before approving.';
      return;
    }
    path = 'approve';
    body = { ...f, approved_breed: f.approved_breed.trim(), purity_note: f.purity === 'crossbreed' ? f.purity_note.trim() : null, officer_note: f.officer_note.trim() || null };
  } else {
    if (!f.officer_note.trim()) {
      formError.value = decision.value === 'needs_info' ? 'Tell the farmer what to add or fix.' : 'Give the reason for rejecting.';
      return;
    }
    path = decision.value === 'needs_info' ? 'needs-info' : 'reject';
    body = { officer_note: f.officer_note.trim() };
  }

  const verb = { approve: 'Approve and certify', needs_info: 'Ask the farmer for more information', reject: 'Reject this request' }[decision.value];
  const { isConfirmed } = await Swal.fire({
    title: `${verb}?`,
    text: decision.value === 'approve' ? `${displayName(animal.value)} will be certified as ${f.approved_breed} under your licence.` : '',
    showCancelButton: true,
    confirmButtonText: verb,
    customClass: decision.value === 'reject' ? { confirmButton: 'mc-danger' } : {},
  });
  if (!isConfirmed) return;

  saving.value = true;
  try {
    const res = await api(`/officer/requests/${req.value.id}/${path}`, { method: 'PUT', body });
    const certNo = res.request?.certificate?.certificate_no;
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: certNo ? `Certificate ${certNo} issued` : 'Decision saved', showConfirmButton: false, timer: 2600 });
    router.push('/officer');
  } catch (e) {
    formError.value = e.data?.errors ? Object.values(e.data.errors).flat()[0] : e.message;
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <router-link to="/officer" class="back-link"><Icon name="arrow-left" :size="16" /> My queue</router-link>

      <div v-if="loading" class="mc-skeleton mt-3" style="height: 520px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else-if="req">
        <header class="mc-page-head mt-2 d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <span class="mc-eyebrow">Tag {{ animal.tag_number }} · {{ INSPECTION[req.inspection_method] }}</span>
            <h1>{{ displayName(animal) }}</h1>
            <p>Requested {{ formatDate(req.created_at) }} by {{ req.requester?.fullname }}</p>
          </div>
          <StatusChip :status="req.status" />
        </header>

        <div class="row g-4">
          <div class="col-lg-8">
            <section class="mb-4">
              <h2 class="h5 mb-3">Photos ({{ photos.length }})</h2>
              <div class="review-photos">
                <a v-for="p in photos" :key="p.key" :href="STORAGE_URL + p.photo.path" target="_blank" rel="noopener" class="review-photo">
                  <img :src="STORAGE_URL + p.photo.path" :alt="p.label" loading="lazy" />
                  <span class="review-photo-cap">
                    <strong>{{ p.label }}</strong>
                    <template v-if="p.photo.ai_breed === NOT_A_COW"> · no cow recognised</template>
                    <template v-else-if="p.photo.ai_breed"> · AI {{ breedLabel(p.photo.ai_breed) }} {{ formatPct(p.photo.ai_confidence) }}</template>
                  </span>
                </a>
              </div>
              <p class="form-hint">Tap a photo to open it full size.</p>
            </section>

            <section v-for="s in sections" :key="s.title" class="mc-card details mb-3">
              <h2 class="h6">{{ s.title }}</h2>
              <dl><div v-for="[k, v] in s.rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div></dl>
            </section>
            <AnimalEvents :animal-id="animal.id" :sex="animal.sex" :events="animal.events || []" readonly />
          </div>

          <div class="col-lg-4">
            <aside class="side-stick d-grid gap-3">
              <section class="mc-card p-3">
                <span class="mc-eyebrow">Farmer</span>
                <p class="fw-bold mb-1 mt-1">{{ req.requester?.fullname }}</p>
                <a v-if="req.requester?.phone" :href="`tel:${req.requester.phone}`" class="d-block">{{ req.requester.phone }}</a>
                <a :href="`mailto:${req.requester?.email}`" class="d-block small">{{ req.requester?.email }}</a>
                <p v-if="req.owner_note" class="small mt-2 mb-0"><strong>Note:</strong> {{ req.owner_note }}</p>
              </section>

              <section class="mc-card p-3">
                <span class="mc-eyebrow">Farm</span>
                <p class="fw-bold mb-0 mt-1">{{ animal.holding?.name || animal.village || '—' }}</p>
                <p class="small text-secondary">{{ [animal.village, animal.ward, animal.sub_county, animal.county?.name].filter(Boolean).join(', ') }}</p>
                <MapView v-if="hasPoint(animal)" :latitude="animal.latitude" :longitude="animal.longitude" height="180px" directions />
                <p v-else class="small text-secondary mb-0">The farmer hasn’t pinned the farm on a map. Call them for directions.</p>
              </section>

              <section class="mc-card p-3">
                <span class="mc-eyebrow">AI breed check</span>
                <template v-if="animal.ai_breed">
                  <div class="d-flex justify-content-between align-items-baseline mt-1">
                    <span class="ai-breed">{{ breedLabel(animal.ai_breed) }}</span><strong>{{ formatPct(animal.ai_confidence) }}</strong>
                  </div>
                  <div class="mc-meter my-2" :class="level.key"><span :style="{ width: `${Math.min(100, animal.ai_confidence || 0)}%` }"></span></div>
                  <p class="small text-secondary mb-0">{{ animal.ai_photos_agreeing }} of {{ animal.ai_photos_total }} photos agree. The AI is a guide; your judgement decides.</p>
                </template>
                <p v-else class="small text-secondary mt-1 mb-0">No AI result for this animal.</p>
                <p v-if="animal.breed_claimed" class="small mt-2 mb-0">Owner says: <strong>{{ breedLabel(animal.breed_claimed) }}</strong></p>
              </section>

              <!-- Decision -->
              <section v-if="canDecide" class="mc-card p-3">
                <span class="mc-eyebrow">Your decision</span>
                <div class="seg w-100 my-2" role="radiogroup">
                  <button v-for="[key, label] in [['approve', 'Approve'], ['needs_info', 'Needs info'], ['reject', 'Reject']]" :key="key"
                    type="button" role="radio" :aria-checked="decision === key" :class="{ on: decision === key }" class="flex-fill" @click="decision = key">{{ label }}</button>
                </div>

                <form novalidate class="d-grid gap-3" @submit.prevent="submit">
                  <template v-if="decision === 'approve'">
                    <div>
                      <label class="form-label" for="d-breed">Certified breed</label>
                      <input id="d-breed" v-model="f.approved_breed" list="breed-list" class="form-control" maxlength="60" required />
                      <datalist id="breed-list"><option v-for="b in breedSuggestions" :key="b" :value="b" /></datalist>
                    </div>
                    <fieldset>
                      <legend class="form-label">Purity</legend>
                      <div class="choice-row">
                        <label class="choice" :class="{ on: f.purity === 'purebred' }"><input v-model="f.purity" type="radio" value="purebred" class="visually-hidden" />Purebred</label>
                        <label class="choice" :class="{ on: f.purity === 'crossbreed' }"><input v-model="f.purity" type="radio" value="crossbreed" class="visually-hidden" />Crossbreed</label>
                      </div>
                    </fieldset>
                    <div v-if="f.purity === 'crossbreed'">
                      <label class="form-label" for="d-cross">Describe the cross</label>
                      <input id="d-cross" v-model="f.purity_note" class="form-control" maxlength="120" placeholder="e.g. Friesian × Boran, about 50%" />
                    </div>
                    <div>
                      <label class="form-label" for="d-method">How you inspected</label>
                      <select id="d-method" v-model="f.inspection_method" class="form-select">
                        <option v-for="(label, key) in INSPECTION" :key="key" :value="key">{{ label }}</option>
                      </select>
                    </div>
                    <div class="confirms">
                      <label><input v-model="confirm.tag" type="checkbox" /> The ear tag in the photo matches tag {{ animal.tag_number }}</label>
                      <label><input v-model="confirm.photos" type="checkbox" /> All photos show the same animal</label>
                      <label><input v-model="confirm.record" type="checkbox" /> The record is consistent with what I inspected</label>
                    </div>
                  </template>

                  <div>
                    <label class="form-label" for="d-note">{{ decision === 'approve' ? 'Remarks (optional, shown on the record)' : decision === 'needs_info' ? 'What should the farmer add or fix?' : 'Reason for rejecting' }}</label>
                    <textarea id="d-note" v-model="f.officer_note" class="form-control" rows="3" maxlength="1000"
                      :placeholder="decision === 'needs_info' ? 'e.g. The ear tag photo is blurry. Please retake it close up.' : ''"></textarea>
                  </div>

                  <div v-if="formError" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ formError }}</div>

                  <button type="submit" class="btn w-100" :class="decision === 'reject' ? 'btn-danger-soft' : 'btn-primary'" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ decision === 'approve' ? 'Approve & certify' : decision === 'needs_info' ? 'Send to farmer' : 'Reject' }}
                  </button>
                </form>
              </section>

              <section v-else class="mc-card p-3">
                <span class="mc-eyebrow">Decision</span>
                <p class="mt-1 mb-1"><StatusChip :status="req.status" /></p>
                <p v-if="req.approved_breed" class="mb-1"><strong>{{ req.approved_breed }}</strong> · {{ req.purity === 'purebred' ? 'Purebred' : req.purity_note }}</p>
                <p v-if="req.officer_note" class="small mb-0">{{ req.officer_note }}</p>
                <template v-if="req.certificate">
                  <p class="small mt-2 mb-2">Certificate <strong>{{ req.certificate.certificate_no }}</strong>
                    <span v-if="req.certificate.status !== 'valid'" class="text-danger"> ({{ req.certificate.status }})</span></p>
                  <button class="btn btn-outline btn-sm" :disabled="downloading" @click="downloadCertificate">
                    <Icon name="download" :size="16" /> Download PDF
                  </button>
                </template>
              </section>
            </aside>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
.review-photos { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.review-photo { display: block; border-radius: var(--mc-radius-sm); overflow: hidden; border: 1px solid var(--mc-border); background: var(--mc-surface); color: var(--mc-ink); }
.review-photo img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.review-photo-cap { display: block; padding: .5rem .65rem; font-size: .85rem; color: var(--mc-ink-2); }
.review-photo:hover { border-color: var(--mc-green-700); color: var(--mc-ink); }
.confirms { display: grid; gap: .5rem; font-size: .9rem; padding: .75rem; border-radius: var(--mc-radius-sm); background: var(--mc-cream); }
.confirms label { display: flex; gap: .55rem; align-items: flex-start; cursor: pointer; }
.confirms input { margin-top: .25rem; width: 18px; height: 18px; accent-color: var(--mc-green-700); flex: none; }
</style>
