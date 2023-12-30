import { createRouter, createWebHistory } from 'vue-router';
import Landing from '../components/Landing.vue';
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import AdminDashboard from '../components/admin/AdminDashboard.vue'
import AllUsers from '../components/admin/AllUsers.vue'
import AllPosts from '../components/admin/AllPosts.vue'
import Forgot from '../components/Forgot.vue'
import Reset from '../components/Reset.vue'
import CertifiedCows from '../components/admin/Certified.vue'
import UserPost from '../components/user/UserPost.vue'
import Testing from '../components/Testing.vue'
const routes = [
  {
    path: '/',
    name: 'Landing',
    component: Landing
  },
  {
  path: '/forgotpassword',
  name: 'Forgot',
  component: Forgot
},
{
  path: '/reset',
  name: 'Reset',
  component: Reset
},
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/testing',
    name: 'Testing',
    component: Testing
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  },
  {
    path: '/admin/AdminDashboard',
    name: 'AdminDashboard',
    component: AdminDashboard
  },
 
  {
    path: '/admin/all/users',
    name: 'AllUsers',
    component: AllUsers
  },
  {
    path: '/admin/certified/cows',
    name: 'CertifiedCows',
    component: CertifiedCows
  },
  {
    path: '/admin/all/posts',
    name: 'AllPosts',
    component: AllPosts
  },
  {
    path: '/user/userpost',
    name: 'UserPost',
    component: UserPost
  },


];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
