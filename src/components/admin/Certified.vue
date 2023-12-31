
<script setup>
  import { ref, onMounted } from 'vue';
  
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
  
  const response = await fetch(`https://45.55.126.45:8001/api/admin/verified?page=${page}`, { headers });
  const data = await response.json();
  
  console.log('Fetched data:', data); // Log the entire response to see its structure
  
  posts.value = data.posts; // Update the 'posts' ref with fetched data
  } catch (error) {
  console.error('Error fetching data:', error);
  }
  };
  
  
  
  // Fetch data and images on component mount
  onMounted(() => {
  fetchPosts(); // Fetch initial posts
  });
  </script>

<template>
  <div class="container">
  <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
  <div class="col" v-for="post in posts.data" :key="post.id">
  <div class="card">
  <img :src="'https://45.55.126.45:8001/storage/' + post.image" class="post-image" />
  
  <div class="card-body">
  <p class="card-text">Cow Name{{ post.cow_name }}</p>
  <p class="card-text">Owner{{ post.user.owner }}</p>
  <p class="card-text">Predicted class: {{ post.predicted_class }}</p>
  <p class="card-text">Confidence: {{ post.confidence }}</p>
  
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

<style>
/* Define the dimensions for the images */
.post-image {
  width: 257px; /* Set the width */
  height: 200px; /* Set the height */
  object-fit: cover; /* Maintain aspect ratio and cover the space */
}
</style>
