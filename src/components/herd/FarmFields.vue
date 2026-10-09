<script setup>
// The fields of one farm (name, county, village, map pin). Edits the `farm` object in place;
// used by the register-animal wizard and the Farms page.
import { onMounted, ref } from 'vue';
import MapPicker from '../ui/MapPicker.vue';
import { getCounties } from '../../lookups';

defineProps({
  farm: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  idPrefix: { type: String, default: 'farm' },
});

const counties = ref([]);
onMounted(() => getCounties().then((c) => (counties.value = c)).catch(() => {}));
</script>

<template>
  <div class="form-grid">
    <div class="span-2">
      <label class="form-label" :for="`${idPrefix}-name`">Farm name <span class="req">*</span></label>
      <input :id="`${idPrefix}-name`" v-model="farm.name" class="form-control" :class="{ 'is-invalid': errors.name }" maxlength="80" placeholder="e.g. Home farm, Njoro plot" />
      <div v-if="errors.name" class="form-hint text-danger">{{ errors.name }}</div>
    </div>
    <div class="span-2">
      <label class="form-label" :for="`${idPrefix}-county`">County <span class="req">*</span></label>
      <select :id="`${idPrefix}-county`" v-model="farm.county_id" class="form-select" :class="{ 'is-invalid': errors.county_id }">
        <option value="">Choose county…</option>
        <option v-for="c in counties" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div v-if="errors.county_id" class="form-hint text-danger">{{ errors.county_id }}</div>
    </div>
    <div>
      <label class="form-label" :for="`${idPrefix}-sub`">Sub-county</label>
      <input :id="`${idPrefix}-sub`" v-model="farm.sub_county" class="form-control" maxlength="80" />
    </div>
    <div>
      <label class="form-label" :for="`${idPrefix}-ward`">Ward</label>
      <input :id="`${idPrefix}-ward`" v-model="farm.ward" class="form-control" maxlength="80" />
    </div>
    <div class="span-2">
      <label class="form-label" :for="`${idPrefix}-village`">Village / landmark</label>
      <input :id="`${idPrefix}-village`" v-model="farm.village" class="form-control" maxlength="80" placeholder="e.g. Behind Kihingo primary school" />
    </div>
    <div class="span-2">
      <label class="form-label" :for="`${idPrefix}-milkings`">Milkings a day</label>
      <select :id="`${idPrefix}-milkings`" v-model.number="farm.milkings_per_day" class="form-select">
        <option :value="1">Once (morning)</option>
        <option :value="2">Twice (morning and evening)</option>
        <option :value="3">Three times (morning, midday, evening)</option>
      </select>
    </div>
    <div class="span-2">
      <span class="form-label d-block">Farm location on the map</span>
      <p class="form-hint mt-0">Optional, but it lets an officer drive straight to the farm for a visit. Only you and the assigned officer see it.</p>
      <MapPicker
        v-model:latitude="farm.latitude"
        v-model:longitude="farm.longitude"
        v-model:source="farm.location_source"
        v-model:accuracy="farm.location_accuracy_m"
      />
      <div v-if="errors.latitude || errors.longitude" class="form-hint text-danger">That location is outside Kenya.</div>
    </div>
  </div>
</template>
