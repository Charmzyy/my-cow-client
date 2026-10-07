import { createRouter, createWebHistory } from 'vue-router';
import { auth, homePath } from '../auth';
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

// meta.guest: only for signed-out visitors · meta.role: 'user' | 'admin' required
const routes = [
  { path: '/', name: 'Landing', component: Landing, meta: { guest: true, title: 'Cattle breed identification' } },
  { path: '/forgotpassword', name: 'Forgot', component: Forgot, meta: { guest: true, title: 'Forgot password' } },
  { path: '/reset', name: 'Reset', component: Reset, meta: { guest: true, title: 'Reset password' } },
  { path: '/login', name: 'Login', component: Login, meta: { guest: true, title: 'Sign in' } },
  { path: '/register', name: 'Register', component: Register, meta: { guest: true, title: 'Create account' } },
  { path: '/testing', name: 'Testing', component: Testing },
  { path: '/admin/AdminDashboard', name: 'AdminDashboard', component: AdminDashboard, meta: { role: 'admin', title: 'Overview' } },
  { path: '/admin/all/users', name: 'AllUsers', component: AllUsers, meta: { role: 'admin', title: 'Users' } },
  { path: '/admin/certified/cows', name: 'CertifiedCows', component: CertifiedCows, meta: { role: 'admin', title: 'Certified cattle' } },
  { path: '/admin/all/posts', name: 'AllPosts', component: AllPosts, meta: { role: 'admin', title: 'Review queue' } },
  { path: '/user/userpost', name: 'UserPost', component: UserPost, meta: { role: 'user', title: 'Identify a cow' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const signedIn = !!auth.token && !!auth.role;
  if (to.meta.role) {
    if (!signedIn) return { path: '/login', query: { next: to.fullPath } };
    if (auth.role !== to.meta.role) return homePath();
  }
  if (to.meta.guest && signedIn) return homePath();
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · MyCow` : 'MyCow';
});

export default router;
