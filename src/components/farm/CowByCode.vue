<script setup>
// What an ear-tag QR opens when scanned with the phone's own camera: /c/{code} -> that cow's profile.
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../ui/Icon.vue';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const error = ref('');

onMounted(async () => {
  try {
    const { animal } = await api(`/tags/${encodeURIComponent(route.params.code)}`);
    router.replace(`/herd/${animal.id}`);
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 560px">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div v-else class="d-flex align-items-center gap-2 text-secondary"><span class="spinner-border spinner-border-sm"></span> Finding the cow…</div>
      <router-link v-if="error" to="/farm" class="btn btn-outline btn-sm mt-3">Go to the farm</router-link>
    </div>
  </div>
</template>
