<script setup>
import Icon from './Icon.vue';
import { REQUEST_STATUS } from '../../requests';

defineProps({ status: { type: String, required: true } });
</script>

<template>
  <span v-if="REQUEST_STATUS[status]" class="mc-chip" :class="REQUEST_STATUS[status].chip">
    <Icon :name="REQUEST_STATUS[status].icon" :size="13" /> {{ REQUEST_STATUS[status].label }}
  </span>
</template>
