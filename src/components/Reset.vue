<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import AuthLayout from './ui/AuthLayout.vue';
import Icon from './ui/Icon.vue';
import { api, form } from '../api';

const route = useRoute();
const router = useRouter();
// Prefilled when arriving from the Forgot screen or a link like /reset?email=…&token=…
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const token = ref(typeof route.query.token === 'string' ? route.query.token : '');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

const canSubmit = computed(
  () => email.value && token.value && password.value.length >= 8 && password.value === confirmPassword.value,
);

async function reset() {
  error.value = '';
  loading.value = true;
  try {
    await api('/reset/password', {
      method: 'POST',
      body: form({
        email: email.value.trim(),
        token: token.value.trim(),
        password: password.value,
        password_confirmation: confirmPassword.value,
      }),
    });
    await Swal.fire({ icon: 'success', title: 'Password updated', text: 'You can now sign in with your new password.' });
    router.push('/login');
  } catch (e) {
    error.value = e.status === 404 ? 'That reset code is not valid. Request a new one and try again.' : e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Choose a new password" subtitle="Enter the code from your email and a new password.">
    <form novalidate @submit.prevent="reset">
      <div v-if="error" class="mc-alert mc-alert-error" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div>
        <label class="form-label" for="reset-email">Email address</label>
        <input id="reset-email" v-model="email" type="email" class="form-control" autocomplete="email" required />
      </div>
      <div>
        <label class="form-label" for="reset-token">Reset code</label>
        <input id="reset-token" v-model="token" type="text" class="form-control" autocomplete="one-time-code" spellcheck="false" required />
      </div>
      <div>
        <label class="form-label" for="reset-password">New password</label>
        <div class="input-group-pw">
          <input id="reset-password" v-model="password" :type="showPassword ? 'text' : 'password'" class="form-control" autocomplete="new-password" required />
          <button type="button" class="pw-toggle" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
            <Icon :name="showPassword ? 'eye-off' : 'eye'" :size="20" />
          </button>
        </div>
        <div class="form-hint">At least 8 characters.</div>
      </div>
      <div>
        <label class="form-label" for="reset-confirm">Confirm new password</label>
        <input id="reset-confirm" v-model="confirmPassword" :type="showPassword ? 'text' : 'password'" class="form-control" autocomplete="new-password" required />
        <div v-if="confirmPassword && confirmPassword !== password" class="form-hint text-danger">Passwords don’t match.</div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg w-100" :disabled="loading || !canSubmit">
        <span v-if="loading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        {{ loading ? 'Saving…' : 'Save new password' }}
      </button>
    </form>

    <template #footer><router-link to="/login"><Icon name="arrow-left" :size="16" /> Back to sign in</router-link></template>
  </AuthLayout>
</template>
