<template>
  <div class="container">
  <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
  <div class="col" v-for="post in posts.data" :key="post.id">
  <div class="card">
  <img :src="'http://45.55.126.45:8001/storage/' + post.image" class="post-image" />
  
  <div class="card-body">
  <p class="card-text">Cow Name :{{ post.cow_name }}</p>
  <p class="card-text">Owner{{ post.user.owner }}</p>
  <p class="card-text">Predicted class: {{ post.predicted_class }}</p>
  <p class="card-text">Confidence: {{ post.confidence }}</p>
  <button class="btn btn-success btn-sm" @click="certify(post.id)">Certify</button>
  </div>
  </div>
  </div>
  </div>
  
  <!-- Pagination Controls -->
  <ul class="pagination">
  <!-- Previous Page -->
  <li class="page-item" :class="{ disabled: posts.current_page === 1 }">
  <button class="page-link" @click="fetchPosts(posts.current_page - 1)" :disabled="posts.current_page === 1">Previous</button>
  </li>
  
  <!-- Page Numbers -->
  <li class="page-item" v-for="page in posts.last_page + 1" :key="page" :class="{ active: posts.current_page === page }">
  <button class="page-link" @click="fetchPosts(page)">{{ page }}</button>
  </li>
  
  <!-- Next Page -->
  <li class="page-item" :class="{ disabled: posts.current_page === posts.last_page }">
  <button class="page-link" @click="fetchPosts(posts.current_page + 1)" :disabled="posts.current_page === posts.last_page">Next</button>
  </li>
  </ul>
  
  </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import Swal from 'sweetalert2';
  
  const posts = ref({
  data: [],
  current_page: 1,
  last_page: 1
  });
  
  const fetchPosts = async (page = 1) => {
  try {
  const token = localStorage.getItem('token');
  const headers = {
  'Authorization': `Bearer ${token}`,
  };
  
  const response = await fetch(`http://45.55.126.45:8001/api/admin/unverified?page=${page}`, { headers });
  const data = await response.json();
  
  console.log('Fetched data:', data); // Log the entire response to see its structure
  
  posts.value = data.posts; // Update the 'posts' ref with fetched data
  } catch (error) {
  console.error('Error fetching data:', error);
  }
  };
  
  const certify = async (id) => {
  try {
  const token = localStorage.getItem('token');
  const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  };
  const response = await fetch(`http://45.55.126.45:8001/api/admin/${id}/accept`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ id }),
  });
  if (response.ok) {
  console.log(`Post ${id} certified successfully.`);
  Swal.fire('Success', 'Post certified successfully', 'success').then((result) => {
  // Delay the reload after 2 seconds if the user clicks 'OK'
  if (result.isConfirmed) {
  setTimeout(() => {
  window.location.reload();
  }, 2000); // Reload after 2 seconds (2000 milliseconds)
  }
  });
  } else {
  console.error('Failed to certify post:', response.statusText);
  Swal.fire('Error', 'Failed to certify post', 'error');
  }
  } catch (error) {
  console.error('Error certifying post:', error);
  Swal.fire('Error', 'Error certifying post', 'error');
  }
  };
  
  // Fetch data and images on component mount
  onMounted(() => {
  fetchPosts(); // Fetch initial posts
  });
  </script>
  
  <style>
  /* Define the dimensions for the images */
  .post-image {
  width: 257px;
  height: 200px;
  object-fit: cover;
  }
  </style>