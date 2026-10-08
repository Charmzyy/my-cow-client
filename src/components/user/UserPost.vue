<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import { api, form, messageFrom } from '../../api';
import { firstName } from '../../auth';
import { BREEDS, NOT_A_COW, breedLabel, confidenceLevel, formatPct } from '../../breeds';
import { MAX_UPLOAD_MB, preparePhoto } from '../../image';

const cowName = ref('');
const file = ref(null);
const previewUrl = ref('');
const dragging = ref(false);
const loading = ref(false);
const error = ref('');
const result = ref(null);
const resultEl = ref(null);

const locked = computed(() => loading.value || !!result.value);
const isCow = computed(() => result.value && result.value.predictedClass && result.value.predictedClass !== NOT_A_COW);
const level = computed(() => confidenceLevel(result.value?.confidence));
const breedInfo = computed(() => BREEDS[result.value?.predictedClass] || null);

async function pick(selected) {
  if (locked.value) return;
  error.value = '';
  const { file: ready, error: problem } = await preparePhoto(selected);
  if (!ready) {
    error.value = problem;
    return;
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = ready;
  previewUrl.value = URL.createObjectURL(ready);
}

function onFileChange(e) {
  pick(e.target.files?.[0]);
  e.target.value = ''; // allow choosing the same file again
}

function onDrop(e) {
  dragging.value = false;
  pick(e.dataTransfer?.files?.[0]);
}

async function identify() {
  // One request per photo: ignore taps while sending, and once a result is showing
  // the form stays locked until "Identify another cow" resets it.
  if (loading.value || result.value) return;
  if (!file.value) {
    error.value = 'Add a photo of the cow first.';
    return;
  }
  if (!cowName.value.trim()) {
    error.value = 'Give the cow a name or tag number so you can find it later.';
    return;
  }
  error.value = '';
  loading.value = true;
  try {
    const data = await api('/mypost', { method: 'POST', body: form({ cow_name: cowName.value.trim(), image: file.value }) });
    // The API reports some failures as ["message"] with HTTP 200, so check for a prediction
    if (!data || !('predictedClass' in data)) throw new Error(messageFrom(data) || 'We couldn’t analyse that photo. Please try again.');
    result.value = data;
    await nextTick();
    resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    error.value = e.data?.errors?.image
      ? 'That file couldn’t be used. Please choose a JPG or PNG photo.'
      : e.message;
  } finally {
    loading.value = false;
  }
}

function startOver() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  file.value = null;
  previewUrl.value = '';
  cowName.value = '';
  result.value = null;
  error.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onBeforeUnmount(() => previewUrl.value && URL.revokeObjectURL(previewUrl.value));
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head">
        <span class="mc-eyebrow">{{ firstName() ? `Hello, ${firstName()}` : 'Welcome' }}</span>
        <h1>Quick breed check</h1>
        <p>
          Free: one photo, an instant AI breed guess. For a certificate, <router-link to="/herd/new">register the animal</router-link>
          with its full record and photos instead.
        </p>
      </header>

      <div class="row g-4">
        <!-- Submission -->
        <div class="col-lg-7">
          <form class="mc-card p-3 p-sm-4" novalidate @submit.prevent="identify">
            <label
              class="dropzone"
              :class="{ dragging, filled: previewUrl, locked }"
              @dragover.prevent="dragging = !locked"
              @dragleave.prevent="dragging = false"
              @drop.prevent="onDrop"
            >
              <input type="file" accept="image/*" class="visually-hidden" @change="onFileChange" :disabled="locked" />
              <template v-if="previewUrl">
                <img :src="previewUrl" alt="Selected cow photo" class="dropzone-preview" />
                <span v-if="!locked" class="dropzone-change"><Icon name="refresh" :size="16" /> Change photo</span>
              </template>
              <template v-else>
                <span class="dropzone-icon"><Icon name="camera" :size="30" /></span>
                <strong class="dropzone-title">Take or upload a photo</strong>
                <span class="dropzone-sub"><span class="d-none d-md-inline">Drag a photo here or </span>tap to open your camera or gallery</span>
                <span class="dropzone-meta">JPG or PNG · up to {{ MAX_UPLOAD_MB }} MB</span>
              </template>
            </label>

            <div class="mt-4">
              <label class="form-label" for="cow-name">Cow name or tag number</label>
              <input id="cow-name" v-model="cowName" type="text" class="form-control" placeholder="e.g. Neema or KE-0425" maxlength="80" :disabled="locked" />
            </div>

            <div v-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

            <button v-if="result" type="button" class="btn btn-outline btn-lg w-100 mt-4" @click="startOver">
              <Icon name="camera" :size="20" /> Identify another cow
            </button>
            <button v-else type="submit" class="btn btn-primary btn-lg w-100 mt-4" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <Icon v-else name="sprout" :size="20" />
              {{ loading ? 'Analysing photo…' : 'Identify breed' }}
            </button>
            <p v-if="loading" class="form-hint text-center mb-0 mt-2">This can take up to 30 seconds on a slow connection.</p>
          </form>
        </div>

        <!-- Result / tips -->
        <div class="col-lg-5">
          <section v-if="result" ref="resultEl" class="mc-card result" aria-live="polite">
            <template v-if="isCow">
              <div class="result-head">
                <span class="mc-eyebrow">Most likely breed</span>
                <h2 class="result-breed">{{ breedLabel(result.predictedClass) }}</h2>
                <div v-if="breedInfo" class="d-flex flex-wrap gap-2">
                  <span class="mc-chip mc-chip-ink">{{ breedInfo.use }}</span>
                  <span class="mc-chip mc-chip-ink">{{ breedInfo.origin }}</span>
                </div>
              </div>

              <div class="result-body">
                <div class="d-flex justify-content-between align-items-baseline mb-2">
                  <span class="fw-semibold">{{ level.label }}</span>
                  <span class="result-pct">{{ formatPct(result.confidence) }}</span>
                </div>
                <div class="mc-meter" :class="level.key" role="meter" aria-valuemin="0" aria-valuemax="100"
                  :aria-valuenow="Math.round(result.confidence)" :aria-label="`Confidence ${formatPct(result.confidence)}`">
                  <span :style="{ width: `${Math.min(100, Number(result.confidence) || 0)}%` }"></span>
                </div>
                <p v-if="level.key === 'low'" class="form-hint mt-2 mb-0">
                  The model isn’t sure. A clearer side-on photo in daylight usually helps.
                </p>

                <p v-if="breedInfo" class="result-note">{{ breedInfo.note }}</p>

                <dl class="result-facts">
                  <div><dt>Cow</dt><dd>{{ result.userpost?.cow_name || cowName }}</dd></div>
                  <div>
                    <dt>Status</dt>
                    <dd><span class="mc-chip mc-chip-gold"><Icon name="clock" :size="14" /> Awaiting officer review</span></dd>
                  </div>
                </dl>
              </div>
            </template>

            <div v-else class="result-body text-center py-4">
              <span class="result-warn"><Icon name="alert" :size="28" /></span>
              <h2 class="h4 mt-3">We couldn’t recognise a cow</h2>
              <p class="text-secondary mb-0">
                Make sure one whole animal fills most of the photo, taken side-on in good light.
              </p>
            </div>

            <div v-if="result.duplicate" class="px-4 pb-3">
              <div class="mc-alert mc-alert-info"><Icon name="clock" :size="18" />You already sent this photo, so this is the earlier result. No new submission was created.</div>
            </div>

            <div class="result-foot">
              <button type="button" class="btn btn-outline w-100" @click="startOver">
                <Icon name="camera" :size="18" /> Identify another cow
              </button>
            </div>
          </section>

          <aside v-else class="mc-card tips">
            <h2 class="h5 mb-3">Tips for an accurate result</h2>
            <ul>
              <li><span class="tip-icon"><Icon name="frame" :size="18" /></span><div><strong>Whole animal, side-on</strong><p>Head to tail in the frame, standing broadside to you.</p></div></li>
              <li><span class="tip-icon"><Icon name="sun" :size="18" /></span><div><strong>Good daylight</strong><p>Avoid strong shadows, night shots and photos into the sun.</p></div></li>
              <li><span class="tip-icon"><Icon name="user" :size="18" /></span><div><strong>One cow per photo</strong><p>Other animals or people in the frame can confuse the model.</p></div></li>
              <li><span class="tip-icon"><Icon name="image" :size="18" /></span><div><strong>Steady and sharp</strong><p>Hold still; blurry photos lower the confidence score.</p></div></li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.dropzone {
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: .35rem;
  min-height: 260px; padding: 1.5rem; cursor: pointer; position: relative; overflow: hidden;
  border: 2px dashed var(--mc-border-strong); border-radius: var(--mc-radius); background: var(--mc-cream);
  transition: border-color .15s, background .15s;
}
.dropzone:hover, .dropzone.dragging { border-color: var(--mc-green-700); background: var(--mc-green-50); }
.dropzone:focus-within { outline: 3px solid var(--mc-gold-500); outline-offset: 2px; }
.dropzone.filled { padding: 0; border-style: solid; background: #000; min-height: 0; }
.dropzone.locked { cursor: default; }
.dropzone-icon { width: 64px; height: 64px; border-radius: 18px; display: grid; place-items: center; background: var(--mc-green-700); color: #fff; margin-bottom: .5rem; }
.dropzone-title { font-size: 1.1rem; }
.dropzone-sub { color: var(--mc-ink-2); }
.dropzone-meta { color: var(--mc-muted); font-size: .85rem; margin-top: .25rem; }
.dropzone-preview { width: 100%; max-height: 420px; object-fit: contain; display: block; }
.dropzone-change {
  position: absolute; right: .75rem; bottom: .75rem; display: inline-flex; align-items: center; gap: .4rem;
  padding: .5rem .85rem; border-radius: 999px; background: rgb(255 255 255 / 94%); color: var(--mc-ink);
  font-weight: 650; font-size: .88rem; box-shadow: var(--mc-shadow);
}

.result { overflow: hidden; scroll-margin-top: 80px; }
.result-head { padding: 1.4rem 1.5rem 1.1rem; background: var(--mc-green-50); border-bottom: 1px solid var(--mc-green-100); }
.result-breed { font-size: 2rem; font-weight: 800; margin: .2rem 0 .7rem; letter-spacing: -0.02em; }
.result-body { padding: 1.25rem 1.5rem; }
.result-pct { font-size: 1.5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.result-note { margin: 1.1rem 0 0; color: var(--mc-ink-2); }
.result-facts { margin: 1.1rem 0 0; display: grid; gap: .6rem; }
.result-facts > div { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: .6rem; border-top: 1px solid var(--mc-border); }
.result-facts dt { font-weight: 600; color: var(--mc-muted); }
.result-facts dd { margin: 0; font-weight: 650; text-align: right; }
.result-warn { width: 60px; height: 60px; border-radius: 18px; display: inline-grid; place-items: center; background: var(--mc-ochre-50); color: var(--mc-ochre-600); }
.result-foot { padding: 0 1.5rem 1.5rem; }

.tips { padding: 1.5rem; }
.tips ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem; }
.tips li { display: flex; gap: .85rem; }
.tips p { margin: .1rem 0 0; color: var(--mc-ink-2); font-size: .92rem; }
.tip-icon { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--mc-gold-50); color: var(--mc-gold-600); }
</style>
