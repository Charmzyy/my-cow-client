<script setup>
import axios from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');




async function post() {
  const formData = new FormData();
  formData.append('email', email.value);
  

  try {
    const token = localStorage.getItem('token');
    const response = await axios.post('http://127.0.0.1:8001/api/forgot/password', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Response:', response.data);
    router.push('/reset');

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
            <h2 class="text-center mb-4">Enter Email</h2>
            <div class="form-group">
             
              <input type="text" v-model="email" placeholder="email" class="form-control mb-4" />
              
            </div>
            <button type="submit" class="btn btn-primary btn-lg btn-block" @click.prevent="post">Submit</button>
          </div>
        </div>
      </div>
    </div>
  </template>