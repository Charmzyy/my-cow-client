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
import MyHerd from '../components/herd/MyHerd.vue'
import AnimalForm from '../components/herd/AnimalForm.vue'
import AnimalProfile from '../components/herd/AnimalProfile.vue'
import OfficerApply from '../components/officer/OfficerApply.vue'
import OfficerQueue from '../components/officer/OfficerQueue.vue'
import OfficerReview from '../components/officer/OfficerReview.vue'
import AdminRequests from '../components/admin/AdminRequests.vue'
import AdminOfficers from '../components/admin/AdminOfficers.vue'
import Verify from '../components/Verify.vue'
import FarmsPage from '../components/herd/FarmsPage.vue'
import FarmTeam from '../components/herd/FarmTeam.vue'
import FarmHome from '../components/farm/FarmHome.vue'
import MilkSession from '../components/farm/MilkSession.vue'
import MilkSales from '../components/farm/MilkSales.vue'
import CowByCode from '../components/farm/CowByCode.vue'

// meta.guest: only for signed-out visitors · meta.role: the role (or list of roles) required
// Farm workers (phone + PIN) share the herd screens; what they can change there comes from the API's `can`.
const FARM_TEAM = ['farmer', 'worker'];
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
  { path: '/user/userpost', name: 'UserPost', component: UserPost, meta: { role: 'farmer', title: 'Quick breed check' } },
  { path: '/farm/:id?', name: 'FarmHome', component: FarmHome, meta: { role: FARM_TEAM, title: 'Farm' } },
  { path: '/farm/:id/milk', name: 'MilkSession', component: MilkSession, meta: { role: FARM_TEAM, title: 'Record milking' } },
  { path: '/farm/:id/sales', name: 'MilkSales', component: MilkSales, meta: { role: FARM_TEAM, title: 'Deliveries' } },
  // What an ear-tag QR sticker holds: scanning it with the phone camera opens the cow
  { path: '/c/:code', name: 'CowByCode', component: CowByCode, meta: { role: FARM_TEAM, title: 'Cow' } },
  { path: '/herd', name: 'MyHerd', component: MyHerd, meta: { role: FARM_TEAM, title: 'Herd' } },
  { path: '/herd/new', name: 'AnimalNew', component: AnimalForm, meta: { role: 'farmer', title: 'Register animal' } },
  { path: '/herd/:id', name: 'AnimalProfile', component: AnimalProfile, meta: { role: FARM_TEAM, title: 'Animal' } },
  { path: '/herd/:id/edit', name: 'AnimalEdit', component: AnimalForm, meta: { role: 'farmer', title: 'Edit animal' } },
  { path: '/farms', name: 'Farms', component: FarmsPage, meta: { role: 'farmer', title: 'Farms' } },
  { path: '/farms/:id/team', name: 'FarmTeam', component: FarmTeam, meta: { role: 'farmer', title: 'Farm team' } },
  { path: '/become-officer', name: 'OfficerApply', component: OfficerApply, meta: { role: 'farmer', title: 'Become an officer' } },
  { path: '/officer', name: 'OfficerQueue', component: OfficerQueue, meta: { role: 'officer', title: 'My queue' } },
  { path: '/officer/requests/:id', name: 'OfficerReview', component: OfficerReview, meta: { role: 'officer', title: 'Review' } },
  { path: '/admin/requests', name: 'AdminRequests', component: AdminRequests, meta: { role: 'admin', title: 'Requests' } },
  { path: '/admin/officers', name: 'AdminOfficers', component: AdminOfficers, meta: { role: 'admin', title: 'Officers' } },
  // Public: no guest/role meta, so buyers (signed out) and members (signed in) both get it
  { path: '/verify/:code?', name: 'Verify', component: Verify, meta: { title: 'Verify certificate' } },
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
    const allowed = Array.isArray(to.meta.role) ? to.meta.role : [to.meta.role];
    if (!allowed.includes(auth.role)) return homePath();
  }
  // Signed-in people skip the guest pages, unless their home *is* a guest page (avoids a redirect loop)
  if (to.meta.guest && signedIn && homePath() !== to.path) return homePath();
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · MyCow` : 'MyCow';
});

export default router;
