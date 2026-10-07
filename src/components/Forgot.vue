<script setup>
import { ref } from 'vue';
import AuthLayout from './ui/AuthLayout.vue';
import Icon from './ui/Icon.vue';
import { api, form } from '../api';

const email = ref('');
const loading = ref(false);
const error = ref('');
const sent = ref(false);

async function send() {
  error.value = '';
  loading.value = true;
  try {
    await api('/forgot/password', { method: 'POST', body: form({ email: email.value.trim() }) });
    sent.value = true;
  } catch (e) {
    error.value = e.status === 422 ? 'We couldn’t find an account with that email address.' : e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Reset your password" subtitle="Enter your email and we’ll send you a reset code.">
    <div v-if="sent" class="d-grid gap-3">
      <div class="mc-alert mc-alert-success" role="status">
        <Icon name="mail" :size="18" />
        <span>Check <strong>{{ email }}</strong> for your reset code, then enter it on the next screen.</span>
      </div>
      <router-link :to="{ path: '/reset', query: { email } }" class="btn btn-primary btn-lg w-100">
        Enter reset code <Icon name="arrow-right" :size="18" />
      </router-link>
    </div>

    <form v-else novalidate @submit.prevent="send">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>
      <div>
        <label class="form-label" for="forgot-email">Email address</label>
        <input id="forgot-email" v-model="email" type="email" class="form-control" autocomplete="email" inputmode="email" required />
      </div>
      <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading || !email">
        <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ loading ? 'Sending…' : 'Send reset code' }}
      </button>
    </form>

    <template #footer><router-link to="/login"><Icon name="arrow-left" :size="16" /> Back to sign in</router-link></template>
  </AuthLayout>
</template>
