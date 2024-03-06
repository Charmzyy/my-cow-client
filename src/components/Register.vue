<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
let fullname = ref('');
let email = ref('');
let password = ref('');
let confirm_password = ref('');

function register() {
  const formData = new FormData();
  formData.append('fullname', fullname.value);
  formData.append('email', email.value);
  formData.append('password', password.value);
  formData.append('password_confirmation', confirm_password.value);

  // Log the JSON data before making the API call
  for (const [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }

  fetch('https://my-cow-rest.onrender.com/api/register', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      localStorage.setItem('token', data.token);
      // check role 
      router.push('/login');
    });
}
</script>
<template>
  <section class="vh-100">
    <div class="container py-3 py-md-5 h-100">
      <div class="row d-flex align-items-center justify-content-center h-100">
        <div class="col-md-8 col-lg-7 col-xl-6">
          <img src="../assets/logo.png" class="img-fluid" alt="logo">
        </div>
        <div class="col-md-7 col-lg-5 col-xl-5 offset-xl-1">
          <form>
            <!-- Name input -->
            <div class="form-outline mb-3 mb-md-4">
              <input v-model="fullname"  type="text" id="name" class="form-control form-control-lg" />
              <label class="form-label" for="name">Full Name</label>
            </div>

            <!-- Email input -->
            <div class="form-outline mb-3 mb-md-4">
              <input v-model="email"  type="email" id="email" class="form-control form-control-lg" />
              <label class="form-label" for="email">Email address</label>
            </div>

            <!-- Password input -->
            <div class="form-outline mb-4">
              <input v-model="password"  type="password" id="password" class="form-control form-control-lg" />
              <label class="form-label" for="password">Password</label>
              <small v-if="invalidPassword" class="text-danger">Password must be at least 8 characters</small>
            </div>

            <!-- Confirm Password input -->
            <div class="form-outline mb-4">
              <input v-model="confirm_password"  type="password" id="confirmPassword" class="form-control form-control-lg" />
              <label class="form-label" for="confirmPassword">Confirm Password</label>
              
            </div>

            <div class="d-flex justify-content-around align-items-center mb-4">
              <!-- Checkbox -->
              <!-- <div class="form-check">
                <input v-model="formData.agreeTerms" class="form-check-input" type="checkbox" value="" id="agreeTerms" />
                <label class="form-check-label" for="agreeTerms"> I agree to the terms </label>
              </div> -->
            </div>

            <!-- Submit button -->
            <button type="submit" class="btn btn-primary btn-lg btn-block" @click.prevent="register">Register</button>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>



<style>
/* Your existing styles */
</style>
