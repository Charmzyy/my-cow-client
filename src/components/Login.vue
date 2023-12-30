<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
  let email, password;
  const rememberMe = ref(false); // Remember Me checkbox value

  function login() {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    fetch('http://127.0.0.1:8001/api/login', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // check role 
        if (data.role[0] === "admin") {
          router.push('/admin/AdminDashboard');
        } else {
          router.push('/user/userpost');
        }

        // If rememberMe is checked, make a request to set remember token
        if (rememberMe.value) {
          fetch(`http://127.0.0.1:8001/api/remember/${data.user.id}/me`, {
            method: 'POST'
          })
            .then(response => response.json())
            .then(data => {
              console.log(data.Message); // Log the response
            })
            .catch(error => {
              console.error('Remember Me failed:', error.message);
              // Handle Remember Me error here
            });
        }
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
            <!-- Email input -->
            <div class="form-outline mb-3 mb-md-4">
              <input type="email" id="form1Example13" class="form-control form-control-lg" v-model="email" />
              <label class="form-label" for="form1Example13">Email address</label>
            </div>

            <!-- Password input -->
            <div class="form-outline mb-4">
              <input type="password" id="form1Example23" class="form-control form-control-lg " v-model="password" />
              <label class="form-label" for="form1Example23">Password</label>
            </div>

            <div class="d-flex justify-content-around align-items-center mb-4">
              <!-- Checkbox -->
              <!-- Checkbox -->
<div class="form-check">
  <input v-model="rememberMe" class="form-check-input" type="checkbox" id="form1Example3" />
  <label class="form-check-label" for="form1Example3"> Remember me </label>
</div>

<router-link to="/forgotpassword" class="me-3">Forgot Password</router-link>
            </div>

            <!-- Submit button -->
            <button type="submit" class="btn btn-primary btn-lg btn-block" @click.prevent="login">Sign in</button>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
  
<style>
/* Adjust the placeholder height and reduce the gap from the navbar */
.form-outline {
  position: relative;
}

.form-outline input {
  padding-top: 1.2rem;
  /* Adjust the top padding for input */
}

.form-outline label {
  position: absolute;
  top: 0.5rem;
  /* Adjust the label's top position */
  left: 0;
  padding: 0.5rem;
  /* Adjust padding for the label */
  transition: 0.3s;
  pointer-events: none;
  color: #aaa;
  opacity: 0.5;
}

.form-outline input:focus~label,
.form-outline input:valid~label {
  transform: translateY(-1rem);
  /* Adjust the label translation */
  font-size: 0.8rem;
  color: #6c757d;
  opacity: 1;
}

/* Reduce the gap from the navbar */
.py-3.py-md-5 {
  padding-top: 1rem;
  /* Reduce the top padding */
  padding-bottom: 1rem;
  /* Reduce the bottom padding */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .col-xl-5.offset-xl-1 {
    margin-top: 2rem;
    /* Adjust the margin-top for smaller screens */
  }
}
</style>

  