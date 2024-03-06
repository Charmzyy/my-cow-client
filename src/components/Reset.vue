<script setup>
import axios from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const token = ref('');
const password = ref('');
const password_confirmation = ref('');



async function post() {
  const formData = new FormData();
  formData.append('email', email.value);
  formData.append('token', token.value);
  formData.append('password', password.value);
  formData.append('password_confirmation', password_confirmation.value);
  

  try {
    
    const response = await axios.post('https://my-cow-rest.onrender.com/api/reset/password', formData, {
      headers: {
        
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Response:', response.data);
    router.push('/login');

  } catch (error) {
    console.error('Error occurred:', error);
    // Handle error or show an error message here
  }
}
</script>
<template>
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card border-dark border-2 p-4">
            <h2 class="text-center mb-4">Reset Password</h2>
            <div class="form-group">
             
              <input type="text" v-model="email" placeholder="email" class="form-control mb-4" />
              <input type="text" v-model="token" placeholder="token" class="form-control mb-4" />
              <input type="text" v-model="password" placeholder="password" class="form-control mb-4" />
              <input type="text" v-model="password_confirmation" placeholder="confirm_password" class="form-control mb-4" />
              
            </div>
            <button type="submit" class="btn btn-primary btn-lg btn-block" @click.prevent="post">Submit</button>
          </div>
        </div>
      </div>
    </div>
  </template>