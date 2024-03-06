<template>
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
      <div class="col" v-for="post in posts" :key="post.id">
        <div class="card">
          <img :src="'https://my-cow-rest.onrender.com/storage/' + post.image" class="post-image" />

          <div class="card-body">
            <p class="card-text">Cow Name: {{ post.cow_name }}</p>
            <!-- <p class="card-text">Owner: {{ post.user.owner }}</p> -->
            <p class="card-text">Predicted class: {{ post.predicted_class }}</p>
            <p class="card-text">Confidence: {{ post.confidence }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const posts = ref([]);

const fetchPosts = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch('https://my-cow-rest.onrender.com/api/admin/verified', { headers });
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

<style>
/* Define the dimensions for the images */
.post-image {
  width: 257px;
  height: 200px;
  object-fit: cover;
}
</style>
