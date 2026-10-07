<script setup>
import { computed } from 'vue';
import { STORAGE_URL } from '../../config';
import { NOT_A_COW, breedLabel, confidenceLevel, formatPct } from '../../breeds';

const props = defineProps({ post: { type: Object, required: true } });

const level = computed(() => confidenceLevel(props.post.confidence));
const notCow = computed(() => !props.post.predicted_class || props.post.predicted_class === NOT_A_COW);
</script>

<template>
  <article class="mc-card mc-photo-card">
    <img :src="STORAGE_URL + post.image" :alt="`Photo of ${post.cow_name}`" class="mc-photo" loading="lazy" />
    <div class="mc-photo-body">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <h3>{{ notCow ? 'Not recognised' : breedLabel(post.predicted_class) }}</h3>
        <slot name="badge" />
      </div>

      <div>
        <div class="d-flex justify-content-between small mb-1">
          <span class="text-secondary">{{ notCow ? 'No cow detected' : level.label }}</span>
          <strong class="font-monospace-num">{{ formatPct(post.confidence) }}</strong>
        </div>
        <div class="mc-meter" :class="notCow ? 'low' : level.key">
          <span :style="{ width: `${Math.min(100, Number(post.confidence) || 0)}%` }"></span>
        </div>
      </div>

      <div class="mc-meta">
        <span>Cow: <b>{{ post.cow_name }}</b></span>
        <span v-if="post.owner">Submitted by: <b>{{ post.owner }}</b></span>
      </div>

      <div v-if="$slots.actions" class="d-flex gap-2 mt-auto pt-1"><slot name="actions" /></div>
    </div>
  </article>
</template>

<style>
.font-monospace-num { font-variant-numeric: tabular-nums; }
</style>
