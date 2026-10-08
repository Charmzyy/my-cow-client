<script setup>
// Public certificate check: the page a certificate's QR code opens. Works signed in or out.
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from './ui/Icon.vue';
import { api } from '../api';
import { STORAGE_URL } from '../config';
import { breedLabel } from '../breeds';
import { INSPECTION, formatDate } from '../requests';

const route = useRoute();
const router = useRouter();

const code = ref('');
const cert = ref(null);
const loading = ref(false);
const error = ref('');

const BANNER = {
  valid: { cls: 'ok', icon: 'shield', title: 'Valid certificate', text: 'This certificate is genuine and in force.' },
  revoked: { cls: 'bad', icon: 'x', title: 'Revoked', text: 'This certificate has been withdrawn and must not be relied on.' },
  superseded: { cls: 'warn', icon: 'alert', title: 'Replaced', text: 'A newer certificate has been issued for this animal. Ask the owner for the current one.' },
};
const banner = computed(() => cert.value && BANNER[cert.value.status]);

const age = computed(() => {
  const a = cert.value?.animal;
  if (!a) return '—';
  if (a.date_of_birth) return formatDate(a.date_of_birth);
  return a.age_estimate_months != null ? `About ${a.age_estimate_months} months (estimated)` : '—';
});

async function lookup(value) {
  cert.value = null;
  error.value = '';
  if (!value) return;
  code.value = value;
  loading.value = true;
  try {
    cert.value = (await api(`/verify/${encodeURIComponent(value)}`)).certificate;
  } catch (e) {
    error.value = e.status === 429 ? 'Too many checks in a short time. Wait a minute and try again.' : e.message;
  } finally {
    loading.value = false;
  }
}

function submit() {
  const value = code.value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (value) router.push(`/verify/${value}`);
}

watch(() => route.params.code, (c) => lookup(c ? String(c).toUpperCase() : ''), { immediate: true });
</script>

<template>
  <div class="mc-page">
    <div class="container verify">
      <header class="mc-page-head">
        <span class="mc-eyebrow">MyCow certificates</span>
        <h1>Verify a certificate</h1>
        <p>Scan the QR code on the certificate, or type the 10-character code printed next to it.</p>
      </header>

      <form class="verify-form mb-4" @submit.prevent="submit">
        <label class="visually-hidden" for="v-code">Verification code</label>
        <input id="v-code" v-model="code" class="form-control" placeholder="e.g. K7QM2X9RTA" maxlength="20"
          autocapitalize="characters" autocomplete="off" spellcheck="false" />
        <button class="btn btn-primary" :disabled="loading || !code.trim()"><Icon name="search" :size="18" /> Check</button>
      </form>

      <div v-if="loading" class="mc-skeleton" style="height: 320px"></div>

      <div v-else-if="error" class="verify-banner bad" role="alert">
        <Icon name="x" :size="28" />
        <div><strong>Not found</strong><span>{{ error }}</span></div>
      </div>

      <template v-else-if="cert">
        <div class="verify-banner" :class="banner.cls" role="status">
          <Icon :name="banner.icon" :size="28" />
          <div>
            <strong>{{ banner.title }}</strong>
            <span>{{ banner.text }}<template v-if="cert.status === 'revoked' && cert.revoked_at"> Revoked {{ formatDate(cert.revoked_at) }}.</template></span>
          </div>
        </div>

        <section class="mc-card verify-card">
          <div class="verify-head">
            <div>
              <span class="mc-eyebrow">Certificate {{ cert.certificate_no }}</span>
              <h2>{{ breedLabel(cert.breed) }}</h2>
              <p class="mb-0">{{ cert.purity === 'purebred' ? 'Purebred' : `Crossbreed${cert.purity_note ? ` · ${cert.purity_note}` : ''}` }}</p>
            </div>
            <img v-if="cert.photo" :src="STORAGE_URL + cert.photo" alt="Side photo of the certified animal" class="verify-photo" />
          </div>

          <dl class="verify-facts">
            <div><dt>Ear tag</dt><dd>{{ cert.animal.tag_number }}</dd></div>
            <div v-if="cert.animal.national_id"><dt>National livestock ID</dt><dd>{{ cert.animal.national_id }}</dd></div>
            <div v-if="cert.animal.name"><dt>Name</dt><dd>{{ cert.animal.name }}</dd></div>
            <div><dt>Sex</dt><dd>{{ cert.animal.sex === 'female' ? 'Female' : 'Male' }}</dd></div>
            <div><dt>Born</dt><dd>{{ age }}</dd></div>
            <div v-if="cert.animal.colour"><dt>Colour &amp; markings</dt><dd>{{ cert.animal.colour }}</dd></div>
            <div><dt>County</dt><dd>{{ cert.animal.county || '—' }}</dd></div>
            <div><dt>Issued</dt><dd>{{ formatDate(cert.issued_at) }}</dd></div>
            <div><dt>Inspection</dt><dd>{{ INSPECTION[cert.inspection_method] || '—' }}</dd></div>
            <div><dt>Certified by</dt><dd>{{ cert.officer.fullname }}<br /><span class="fw-normal text-secondary">{{ cert.officer.cadre }} · Licence {{ cert.officer.licence_number }}</span></dd></div>
          </dl>
          <p class="small text-secondary mb-0">Check the ear tag on the animal matches. The owner’s contact details are never shown here.</p>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verify { max-width: 720px; }
.verify-form { display: flex; gap: .5rem; }
.verify-form input { text-transform: uppercase; letter-spacing: .08em; font-weight: 650; }
.verify-form .btn { flex: none; display: inline-flex; align-items: center; gap: .35rem; }
.verify-banner { display: flex; gap: .85rem; align-items: center; padding: 1rem 1.15rem; border-radius: 14px; border: 1px solid; margin-bottom: 1rem; }
.verify-banner strong { display: block; font-size: 1.2rem; }
.verify-banner svg { flex: none; }
.verify-banner.ok { background: var(--mc-green-50); border-color: var(--mc-green-100); color: var(--mc-green-800); }
.verify-banner.bad { background: #fdf0ee; border-color: #f3c9c3; color: #7a1a12; }
.verify-banner.warn { background: var(--mc-ochre-50); border-color: var(--mc-ochre-50); color: var(--mc-ochre-700); }
.verify-card { padding: 1.25rem; }
.verify-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
.verify-head h2 { font-size: 1.6rem; margin: .2rem 0 .1rem; }
.verify-photo { width: 132px; height: 100px; object-fit: cover; border-radius: 10px; flex: none; }
.verify-facts { margin: 1.1rem 0; display: grid; gap: .55rem; }
.verify-facts > div { display: flex; justify-content: space-between; gap: 1rem; font-size: .93rem; border-bottom: 1px solid var(--mc-border, #e6e2d6); padding-bottom: .5rem; }
.verify-facts dt { font-weight: 600; color: var(--mc-muted); }
.verify-facts dd { margin: 0; font-weight: 650; text-align: right; }
@media (max-width: 480px) {
  .verify-photo { width: 96px; height: 76px; }
}
</style>
