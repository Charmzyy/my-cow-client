<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthLayout from './ui/AuthLayout.vue';
import Icon from './ui/Icon.vue';
import { api, form, messageFrom } from '../api';
import { setSession, homePath } from '../auth';

const router = useRouter();
const route = useRoute();
// 'email': farmers, officers, admins · 'pin': farm workers (account made by the farmer, phone + PIN)
const mode = ref(route.query.mode === 'pin' ? 'pin' : 'email');
const email = ref('');
const password = ref('');
const phone = ref('');
const pin = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

function switchTo(next) {
  mode.value = next;
  error.value = '';
}

async function login() {
  error.value = '';
  loading.value = true;
  try {
    const data = mode.value === 'pin'
      ? await api('/login/pin', { method: 'POST', body: { phone: phone.value.trim(), pin: pin.value.trim() } })
      : await api('/login', { method: 'POST', body: form({ email: email.value.trim(), password: password.value }) });
    if (!data?.token) throw new Error(messageFrom(data) || 'Sign in failed. Please try again.');
    setSession(data);
    const next = route.query.next;
    router.push(typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : homePath());
  } catch (e) {
    if (e.status === 401) {
      error.value = mode.value === 'pin' ? 'That phone number and PIN don’t match.' : 'That email and password don’t match an account.';
    } else if (e.status === 429) {
      error.value = 'Too many tries. Wait a minute, then try again.';
    } else {
      error.value = e.message;
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Welcome back" :subtitle="mode === 'pin' ? 'Farm worker? Sign in with the phone number and PIN the farmer gave you.' : 'Sign in to manage your herd and farm records.'">
    <div class="seg w-100 mb-1" role="tablist" aria-label="How to sign in">
      <button type="button" role="tab" class="flex-fill" :class="{ on: mode === 'email' }" :aria-selected="mode === 'email'" @click="switchTo('email')">
        <Icon name="mail" :size="16" /> Email
      </button>
      <button type="button" role="tab" class="flex-fill" :class="{ on: mode === 'pin' }" :aria-selected="mode === 'pin'" @click="switchTo('pin')">
        <Icon name="phone" :size="16" /> Farm worker
      </button>
    </div>

    <form novalidate @submit.prevent="login">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <template v-if="mode === 'email'">
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
      </template>

      <template v-else>
        <div>
          <label class="form-label" for="login-phone">Phone number</label>
          <input id="login-phone" v-model="phone" type="tel" class="form-control" autocomplete="tel" inputmode="tel" placeholder="0712 345 678" required />
        </div>
        <div>
          <label class="form-label" for="login-pin">PIN</label>
          <input id="login-pin" v-model="pin" :type="showPassword ? 'text' : 'password'" class="form-control pin-input"
            inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" required />
          <p class="form-hint mt-1">Forgot your PIN? Ask the farmer to set a new one.</p>
        </div>
      </template>

      <button type="submit" class="btn btn-primary btn-lg w-100"
        :disabled="loading || (mode === 'email' ? !email || !password : !phone || pin.length < 4)">
        <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <template #footer>New to MyCow? <router-link to="/register">Create a free account</router-link></template>
  </AuthLayout>
</template>

<style>
.pin-input { letter-spacing: .4em; font-size: 1.25rem; font-variant-numeric: tabular-nums; }
</style>
