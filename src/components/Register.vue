<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AuthLayout from './ui/AuthLayout.vue';
import Icon from './ui/Icon.vue';
import { api, form, messageFrom } from '../api';
import { setSession, homePath } from '../auth';

const router = useRouter();
const fullname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const touched = ref(false);
const loading = ref(false);
const error = ref('');

const passwordTooShort = computed(() => password.value.length > 0 && password.value.length < 8);
const mismatch = computed(() => confirmPassword.value.length > 0 && confirmPassword.value !== password.value);
const canSubmit = computed(
  () => fullname.value.trim() && email.value.trim() && password.value.length >= 8 && password.value === confirmPassword.value,
);

async function register() {
  touched.value = true;
  if (!canSubmit.value) return;
  error.value = '';
  loading.value = true;
  try {
    const data = await api('/register', {
      method: 'POST',
      body: form({
        fullname: fullname.value.trim(),
        email: email.value.trim(),
        password: password.value,
        password_confirmation: confirmPassword.value,
      }),
    });
    // The API reports validation problems as ["message"] with HTTP 200, so check for the token
    if (!data?.token) throw new Error(messageFrom(data) || 'We couldn’t create your account. Please try again.');
    setSession(data);
    router.push(homePath());
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Create your account" subtitle="Free to use. Identify your first cow in about a minute.">
    <form novalidate @submit.prevent="register">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div>
        <label class="form-label" for="reg-name">Full name</label>
        <input id="reg-name" v-model="fullname" type="text" class="form-control" autocomplete="name"
          :class="{ 'is-invalid': touched && !fullname.trim() }" required />
      </div>

      <div>
        <label class="form-label" for="reg-email">Email address</label>
        <input id="reg-email" v-model="email" type="email" class="form-control" autocomplete="email" inputmode="email"
          :class="{ 'is-invalid': touched && !email.trim() }" required />
      </div>

      <div>
        <label class="form-label" for="reg-password">Password</label>
        <div class="input-group-pw">
          <input id="reg-password" v-model="password" :type="showPassword ? 'text' : 'password'" class="form-control"
            autocomplete="new-password" :class="{ 'is-invalid': passwordTooShort }" aria-describedby="reg-password-hint" required />
          <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="20" />
          </button>
        </div>
        <div id="reg-password-hint" class="form-hint" :class="{ 'text-danger': passwordTooShort }">At least 8 characters.</div>
      </div>

      <div>
        <label class="form-label" for="reg-confirm">Confirm password</label>
        <input id="reg-confirm" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="form-control"
          autocomplete="new-password" :class="{ 'is-invalid': mismatch }" required />
        <div v-if="mismatch" class="form-hint text-danger">Passwords don’t match.</div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading">
        <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <template #footer>Already have an account? <router-link to="/login">Sign in</router-link></template>
  </AuthLayout>
</template>
