<script setup>
import { ref } from 'vue';

const users = ref(null);

// Fetching users from the API
let token = localStorage.getItem('token');
const headers = {
  'Authorization': `Bearer ${token}`,
};

fetch('http://45.55.126.45:8001/api/admin/users', {
  headers
})
  .then(response => response.json())
  .then(data => users.value = data)
  .catch(error => console.error('Error fetching users:', error));

const deleteUser = (id) => {
  fetch(`http://45.55.126.45:8001/api/admin/${id}/delete`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  })
    .then(response => {
      if (response.ok) {
        console.log(`User ${id} deleted successfully.`);
        // Update the UI or refresh users after deletion if needed
        // You might want to remove the deleted user from the 'users' array
        users.value = users.value.filter(user => user.id !== id);
      } else {
        console.error('Failed to delete user:', response.statusText);
      }
    })
    .catch(error => {
      console.error('Error deleting user:', error);
    });
};
</script>
<template>
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <h3 class="text-center text-dark mt-2">All Users</h3>
        <table class="table table-dark">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <button class="btn btn-danger" @click="deleteUser(user.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

