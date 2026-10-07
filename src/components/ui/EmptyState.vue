<script setup>
import Icon from './Icon.vue';

defineProps({
  icon: { type: String, default: 'image' },
  title: { type: String, required: true },
  text: { type: String, default: '' },
});
</script>

<template>
  <div class="mc-empty">
    <div class="mc-empty-icon"><Icon :name="icon" :size="26" /></div>
    <h3>{{ title }}</h3>
    <p v-if="text" class="mb-0">{{ text }}</p>
    <div v-if="$slots.default" class="mt-3"><slot /></div>
  </div>
</template>
