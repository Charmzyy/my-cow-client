<script setup>
import router from './router';

let userData;

userData = localStorage.getItem('user');

if (userData) {
  try {
    userData = JSON.parse(userData);
  } catch (error) {
    console.error('Error parsing user data:', error);
    // Handle the parsing error here, such as setting userData to a default value
    userData = {}; // Or any appropriate default value
  }
} else {
  // Handle the case when 'user' data is not present in localStorage
  userData = {}; // Or any appropriate default value
}

const logout = async () => {
  localStorage.clear()

  router.push('/')
  // try {
  //   const token = localStorage.getItem('token');
  //   const headers = {
  //     'Authorization': `Bearer ${token}`,
  //     'Content-Type': 'application/json', // Assuming JSON content
  //   };

  //   const requestOptions = {
  //     method: 'POST', // Use POST method
  //     headers: headers,
  //     body: JSON.stringify({}), // If your endpoint requires a body, adjust this object accordingly
  //   };

  //   const response = await fetch('http://45.55.126.45:8001/logout', requestOptions);

  //   if (response.ok) {
  //     console.log('Logout successful');
  //     // Clear local storage or perform any other necessary actions upon successful logout
  //   } else {
  //     console.error('Logout failed:', response.statusText);
  //     // Handle failed logout
  //   }
  // } catch (error) {
  //   console.error('Error during logout:', error);
  //   // Handle error while attempting logout
  // }
};



</script>
<template>
  <div>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <router-link to="/" class="navbar-brand">MyCowApp</router-link>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          

          <ul class="navbar-nav">
            <li  v-if="userData.fullname" class="nav-item">
              <span class="me-3"> Hello {{ userData.fullname }}</span>
            </li>
            
            <li class="nav-item">
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




