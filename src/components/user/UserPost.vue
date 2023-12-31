<script setup>
import axios from 'axios';
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {Modal} from 'bootstrap'

const router = useRouter();
const cow_name = ref('');
const image = ref(null); // Use null to handle file data

const state = reactive({
  modal_demo: null,
  response: null
})

onMounted(() => {
  state.modal_demo = new Modal('#modal_demo', {})
})

function openModal() {
  state.modal_demo.show()
}

function closeModal() {
  state.modal_demo.hide()
  cow_name.value = '';
  image.value = null;
}

function handleImageChange(event) {
  const selectedFile = event.target.files[0]; // Get the first selected file
  if (selectedFile) {
    image.value = selectedFile; // Update the image reference with the selected file
  }
}

async function post() {
  const formData = new FormData();
  formData.append('cow_name', cow_name.value);
  formData.append('image', image.value);

  try {
    const token = localStorage.getItem('token');
    const response = await axios.post('http://localhost:8001/api/mypost', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Response:', response.data);
    // Handle successful response or show a success message here

    // set response data to state/variable | state.response = |
    state.response = response.data
    
    openModal()

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
        <div class="card border-dark border-3 p-3">
          <h2 class="text-center mb-4">Submit Cow Image</h2>
          <div class="form-group">

            <input type="text" v-model="cow_name" placeholder="cow_name" class="form-control mb-4" />
            <small class="text-danger mb-2">Please select a valid image file (JPEG, PNG, BMP) within 20KB.</small>
            <input type="file" @change="handleImageChange" class="form-control mb-4" />
          </div>
          <button type="submit" class="btn btn-primary btn-sm" @click.prevent="post">Submit</button>

        </div>
      </div>
    </div>
  </div>

  <!-- get response data from state.reponse -->
  <div class="modal fade" id="modal_demo" tabindex="-1" aria-labelledby="modal_demo_label" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title mx-auto" id="modal_demo_label">Results</h5>
        <button type="button" class="btn-close btn-close-white" aria-label="Close" @click="closeModal"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <strong>Cow Name:</strong> {{ state.response?.userpost?.cow_name }}
        </div>
        <div class="mb-3">
          <strong>Predicted Class:</strong> {{ state.response?.predictedClass }}
        </div>
        <div class="mb-3">
          <strong>Percentage:</strong> {{ state.response?.confidence }} %
        </div>
        <hr>
        <div class="text-center">
          Thank you for using our platform
        </div>
      </div>
    </div>
  </div>
</div>

</template>



<style>
.card {
  border: 2px solid #343a40;
  margin-top: 2rem;
}

.btn {}
</style>
