<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthLayout from './ui/AuthLayout.vue';
import Icon from './ui/Icon.vue';
import { api, form, messageFrom } from '../api';
import { setSession, homePath } from '../auth';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function login() {
  error.value = '';
  loading.value = true;
  try {
    const data = await api('/login', { method: 'POST', body: form({ email: email.value.trim(), password: password.value }) });
    if (!data?.token) throw new Error(messageFrom(data) || 'Sign in failed. Please try again.');
    setSession(data);
    const next = route.query.next;
    router.push(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : homePath());
  } catch (e) {
    error.value = e.status === 401 ? 'That email and password don’t match an account.' : e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to identify cattle and see your results.">
    <form novalidate @submit.prevent="login">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div>
        <label class="form-label" for="login-email">Email address</label>
        <input id="login-email" v-model="email" type="email" class="form-control" autocomplete="email" inputmode="email" required />
      </div>

      <div>
        <div class="d-flex justify-content-between align-items-baseline">
          <label class="form-label" for="login-password">Password</label>
          <router-link to="/forgotpassword" class="small fw-semibold">Forgot password?</router-link>
        </div>
        <div class="input-group-pw">
          <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'" class="form-control" autocomplete="current-password" required />
          <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="20" />
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading || !email || !password">
        <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <template #footer>New to MyCow? <router-link to="/register">Create a free account</router-link></template>
  </AuthLayout>
</template>
