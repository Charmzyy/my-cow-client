<script setup>
import { ref } from 'vue';
import router from './router';

const userData = ref()

userData.value = JSON.parse(localStorage.getItem('user'));

if (!userData.value) router.push('/')


const logout = async () => {
  // TODO: logout from server

  localStorage.clear()
  router.push('/')
};



</script>
<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <router-link to="/" class="navbar-brand">MyCowApp</router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
          aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">


          <ul class="navbar-nav">
            <li v-if="userData" class="nav-item">
              <span class="me-3"> Hello {{ userData?.fullname }}</span>
            </li>

            <li v-if="userData" class="nav-item">
              <span @click.prevent="logout">Logout</span>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main>
      <section class="hero">
        <router-view></router-view>
      </section>
    </main>
  </div>
</template>