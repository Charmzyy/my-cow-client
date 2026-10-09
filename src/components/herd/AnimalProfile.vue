<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import PhotoSlots from './PhotoSlots.vue';
import CertificationCard from './CertificationCard.vue';
import AnimalEvents from './AnimalEvents.vue';
import MilkCard from './MilkCard.vue';
import MapView from '../ui/MapView.vue';
import { hasPoint } from '../../geo';
import { auth } from '../../auth';
import { api } from '../../api';
import { BREEDS, breedLabel, confidenceLevel, formatPct } from '../../breeds';
import { SEXES, ageText, displayName, recordSections } from '../../animals';

const route = useRoute();
const router = useRouter();
const animal = ref(null);
const can = ref([]);            // what this person may do here (API: AnimalPolicy::abilities)
const loading = ref(true);
const error = ref('');
const justCreated = computed(() => route.query.new === '1');

const level = computed(() => confidenceLevel(animal.value?.ai_confidence));
const sections = computed(() => recordSections(animal.value));

async function load(silent = false) {
  if (!silent) loading.value = true;
  error.value = '';
  try {
    const data = await api(`/animals/${route.params.id}`);
    animal.value = data.animal;
    can.value = data.can || [];
  } catch (e) {
    error.value = e.status === 404 || e.status === 403 ? 'This animal doesn’t exist or isn’t in your herd.' : e.message;
  } finally {
    loading.value = false;
  }
}

async function removeAnimal() {
  const { isConfirmed } = await Swal.fire({
    icon: 'warning',
    titleText: `Remove ${displayName(animal.value)}?`,
    text: 'It will leave your herd. The tag number stays reserved for record-keeping.',
    showCancelButton: true,
    confirmButtonText: 'Remove animal',
    customClass: { confirmButton: 'mc-danger' },
    focusCancel: true,
  });
  if (!isConfirmed) return;
  try {
    await api(`/animals/${animal.value.id}`, { method: 'DELETE' });
    router.push('/herd');
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t remove animal', text: e.message });
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <router-link to="/herd" class="back-link"><Icon name="arrow-left" :size="16" /> {{ auth.isWorker ? 'Herd' : 'My herd' }}</router-link>

      <div v-if="loading" class="mc-skeleton mt-3" style="height: 480px"></div>
      <div v-else-if="error" class="mc-alert mc-alert-error mt-3" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-else-if="animal">
        <header class="mc-page-head mt-2 d-flex flex-wrap justify-content-between align-items-end gap-3">
          <div>
            <span class="mc-eyebrow">Tag {{ animal.tag_number }}</span>
            <h1>{{ displayName(animal) }}</h1>
            <p>{{ SEXES[animal.sex] }} · {{ ageText(animal) }}<template v-if="animal.county"> · {{ animal.county.name }}</template></p>
          </div>
          <div v-if="can.includes('update')" class="d-flex gap-2">
            <router-link :to="`/herd/${animal.id}/edit`" class="btn btn-outline btn-sm"><Icon name="edit" :size="16" /> Edit details</router-link>
            <button class="btn btn-danger-soft btn-sm" aria-label="Remove animal" @click="removeAnimal"><Icon name="trash" :size="16" /></button>
          </div>
        </header>

        <div v-if="justCreated" class="mc-alert mc-alert-success mb-4">
          <Icon name="check-circle" :size="18" />
          <span><strong>{{ displayName(animal) }} is registered.</strong> Now add photos: at least both sides and the ear tag.</span>
        </div>

        <div class="row g-4">
          <div class="col-lg-8">
            <section class="mb-4">
              <div class="d-flex justify-content-between align-items-end mb-3">
                <div>
                  <h2 class="h5 mb-1">Photos</h2>
                  <p v-if="can.includes('update')" class="text-secondary small mb-0">Take each one in daylight, with the animal standing still.</p>
                </div>
                <span class="text-secondary small">{{ animal.photos.length }} taken</span>
              </div>
              <PhotoSlots :animal="animal" :editable="can.includes('update')" @updated="animal = $event" />
            </section>

            <MilkCard v-if="animal.sex === 'female'" :key="animal.id" :animal="animal" :can-record="can.includes('log_event')" />

            <AnimalEvents :animal-id="animal.id" :sex="animal.sex" :readonly="!can.includes('log_event')" :can-manage="can.includes('update')" />

            <section v-for="s in sections" :key="s.title" class="mc-card details mb-3">
              <h2 class="h6">{{ s.title }}</h2>
              <dl>
                <div v-for="[k, v] in s.rows" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
              </dl>
            </section>
          </div>

          <div class="col-lg-4">
            <aside class="side-stick">
              <section class="mc-card p-3 mb-3">
                <span class="mc-eyebrow">AI breed check</span>
                <template v-if="animal.ai_breed">
                  <div class="d-flex justify-content-between align-items-baseline mt-1">
                    <span class="ai-breed">{{ breedLabel(animal.ai_breed) }}</span>
                    <strong>{{ formatPct(animal.ai_confidence) }}</strong>
                  </div>
                  <div class="mc-meter my-2" :class="level.key"><span :style="{ width: `${Math.min(100, animal.ai_confidence || 0)}%` }"></span></div>
                  <p class="small text-secondary mb-0">
                    {{ animal.ai_photos_agreeing }} of {{ animal.ai_photos_total }} photo{{ animal.ai_photos_total > 1 ? 's' : '' }} agree.
                    <template v-if="BREEDS[animal.ai_breed]">{{ BREEDS[animal.ai_breed].note }}</template>
                  </p>
                  <p v-if="animal.breed_claimed && animal.breed_claimed !== animal.ai_breed" class="small mt-2 mb-0 ai-diff">
                    <Icon name="alert" :size="14" /> You recorded {{ breedLabel(animal.breed_claimed) }}. The officer will check both.
                  </p>
                </template>
                <p v-else class="small text-secondary mt-1 mb-0">Add a side photo and the AI will suggest the breed.</p>
              </section>

              <CertificationCard v-if="can.includes('certify')" :animal="animal" @changed="load(true)" />

              <section class="mc-card p-3 mt-3">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <span class="mc-eyebrow">Farm</span>
                    <p class="fw-bold mb-0">{{ animal.holding?.name || animal.village || '—' }}</p>
                    <p class="small text-secondary mb-0">{{ [animal.village, animal.sub_county, animal.county?.name].filter(Boolean).join(', ') }}</p>
                  </div>
                  <router-link v-if="!auth.isWorker" to="/farms" class="btn btn-outline btn-sm flex-none">Farms</router-link>
                </div>
                <MapView v-if="hasPoint(animal)" :key="`${animal.latitude},${animal.longitude}`" :latitude="animal.latitude" :longitude="animal.longitude" height="170px" />
                <p v-else class="small text-secondary mb-0">No map pin yet. Add one under Farms so an officer can find you.</p>
              </section>
            </aside>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style>
</style>
