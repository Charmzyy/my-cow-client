<template>
    <div>
      <img :src="imageUrl" alt="My Image" />
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        imageUrl: '' // Initialize imageUrl
      };
    },
    mounted() {
      // Make an API call to your Laravel backend to fetch the image URL
      fetch('https://my-cow-rest.onrender.com/image-url') // Update with your Laravel server URL
        .then(response => response.json())
        .then(data => {
          this.imageUrl = data.imageUrl; // Set the received image URL to imageUrl
        })
        .catch(error => {
          console.error('Error fetching image URL:', error);
        });
    }
  };
  </script>
  