<script setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from './components/ui/Icon.vue';
import { auth, clearSession, firstName, homePath, refreshSession, roleLabel } from './auth';
import { api } from './api';
import { API_URL } from './config';
import { ORG_TYPES, org, resetOrg, setOrganisations, switchOrg } from './org';
import { applyCurrentTheme, resetPrefs, setPrefs } from './preferences';

const route = useRoute();
const router = useRouter();

const navItems = computed(() => {
  if (auth.isAdmin) {
    return [
      { to: '/admin/AdminDashboard', label: 'Overview', icon: 'grid' },
      { to: '/admin/requests', label: 'Requests', icon: 'review' },
      { to: '/admin/officers', label: 'Officers', icon: 'shield' },
      { to: '/admin/all/posts', label: 'Quick checks', icon: 'camera' },
      { to: '/admin/all/users', label: 'Users', icon: 'users' },
    ];
  }
  if (auth.isOfficer) {
    return [{ to: '/officer', label: 'My queue', icon: 'review' }];
  }
  if (auth.isWorker) {
    return [
      { to: '/farm', label: 'Farm', icon: 'sprout' },
      { to: '/herd', label: 'Herd', icon: 'herd' },
    ];
  }
  if (auth.isFarmer) {
    return [
      { to: '/farm', label: 'Farm', icon: 'sprout' },
      { to: '/herd', label: 'Herd', icon: 'herd' },
      { to: '/farms', label: 'Farms', icon: 'pin' },
      { to: '/user/userpost', label: 'Quick check', icon: 'camera' },
      { to: '/org', label: 'Organisation', icon: 'users' },
    ];
  }
  return [];
});

// On app start and after each sign-in: pick up role changes made on the server (e.g. officer
// application approved) and the workspaces this person is in
watch(() => auth.token, async (token) => {
  if (!token) return;
  try {
    const me = await api('/me');
    setOrganisations(me.organisations);
    setPrefs(me.preferences);
    if (refreshSession(me)) router.replace(homePath());
  } catch {
    /* offline: keep the saved session */
  }
}, { immediate: true });

// A co-op's brand colour paints the app while you work in it; switching workspace repaints
watch(() => [org.currentId, org.current?.brand_color], applyCurrentTheme);

// White-label: a co-op or company with a logo shows it next to its name instead of MyCow's mark
const brandOrg = computed(() => (org.current && org.current.type !== 'personal' && org.current.logo_url ? org.current : null));

// Switching workspace re-opens the current screen (the router-view is keyed on it) with that workspace's data.
// Farm/animal pages belong to one workspace, so those go back to the home screen instead.
function onSwitchOrg(event) {
  switchOrg(event.target.value);
  if (route.params.id || route.params.code) router.push(homePath());
}

// Auth pages have their own full-screen layout (with its own logo), so no header there
const isAuthPage = computed(() => ['Login', 'Register', 'Forgot', 'Reset'].includes(route.name));

async function logout() {
  api('/logout', { method: 'POST' }).catch(() => {}); // revoke the token server-side; don't wait for it
  clearSession();
  resetOrg();
  resetPrefs();
  router.push('/');
}
</script>

<template>
  <div class="shell">
    <header v-if="!isAuthPage" class="topbar">
      <div class="container topbar-inner">
        <router-link v-if="brandOrg" :to="homePath()" class="brand" :aria-label="`${brandOrg.name} home`">
          <img :src="`${API_URL}${brandOrg.logo_url}`" alt="" class="brand-logo" />
          <span class="brand-text brand-text-org">{{ brandOrg.name }}</span>
        </router-link>
        <router-link v-else :to="homePath()" class="brand" aria-label="MyCow home">
          <span class="mc-mark" aria-hidden="true"></span>
          <span class="brand-text">MyCow</span>
        </router-link>

        <nav v-if="navItems.length" class="topnav d-none d-md-flex" aria-label="Main">
          <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="topnav-link">
            <Icon :name="item.icon" :size="18" />{{ item.label }}
          </router-link>
        </nav>

        <div class="topbar-actions">
          <template v-if="auth.token">
            <label v-if="org.list.length > 1" class="org-switch">
              <span class="visually-hidden">Workspace</span>
              <select class="form-select form-select-sm" :value="org.currentId" @change="onSwitchOrg">
                <option v-for="o in org.list" :key="o.id" :value="o.id">{{ o.type === 'personal' ? ORG_TYPES.personal : o.name }}</option>
              </select>
            </label>
            <span class="hello d-none d-sm-inline-flex">
              <Icon name="user" :size="16" />{{ firstName() || 'Account' }}
              <span v-if="auth.role && !auth.isFarmer" class="mc-chip mc-chip-gold ms-1">{{ roleLabel() }}</span>
            </span>
            <router-link to="/settings" class="btn btn-outline btn-sm settings-link" aria-label="Settings" title="Settings">
              <Icon name="settings" :size="17" />
            </router-link>
            <button class="btn btn-outline btn-sm" type="button" @click="logout">
              <Icon name="logout" :size="16" /><span class="d-none d-sm-inline">Sign out</span>
            </button>
          </template>
          <template v-else>
            <router-link to="/verify" class="btn btn-sm btn-link d-none d-sm-inline-flex"><Icon name="shield" :size="16" />Verify a certificate</router-link>
            <router-link to="/login" class="btn btn-outline btn-sm">Sign in</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm d-none d-sm-inline-flex">Get started</router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="shell-main">
      <router-view :key="org.currentId || 'none'" />
    </main>

    <!-- Bottom tab bar on phones: thumb-reachable navigation whenever there's more than one section -->
    <nav v-if="navItems.length > 1" class="tabbar d-md-none" aria-label="Main">
      <router-link v-for="item in navItems" :key="item.to" :to="item.to" class="tab">
        <Icon :name="item.icon" :size="22" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<style>
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.shell-main { flex: 1; }

.topbar {
  position: sticky; top: 0; z-index: 1020;
  background: var(--mc-topbar-bg); backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--mc-border);
}
.topbar-inner { display: flex; align-items: center; gap: 1.5rem; min-height: 64px; }

.brand { display: inline-flex; align-items: center; gap: .6rem; color: var(--mc-ink); }
.brand:hover { color: var(--mc-ink); }
.brand-text { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
.brand-logo { height: 36px; width: auto; max-width: 120px; object-fit: contain; border-radius: 8px; }
.brand-text-org { font-size: 1.05rem; max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 575px) { .brand-text-org { display: none; } }
.settings-link { padding-left: .6rem; padding-right: .6rem; }
.settings-link.router-link-active { border-color: var(--mc-primary-text); background: var(--mc-green-50); }

.topnav { gap: .25rem; }
.topnav-link {
  display: inline-flex; align-items: center; gap: .45rem;
  padding: .5rem .8rem; border-radius: 10px; color: var(--mc-ink-2); font-weight: 600; font-size: .95rem;
}
.topnav-link:hover { color: var(--mc-ink); background: var(--mc-green-50); }
.topnav-link.router-link-active { color: var(--mc-green-800); background: var(--mc-green-50); }

.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: .6rem; }
.org-switch select { max-width: 11rem; min-height: 38px; font-weight: 600; }
.hello { align-items: center; gap: .35rem; color: var(--mc-ink-2); font-weight: 600; font-size: .92rem; }

.tabbar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 1020;
  display: flex; background: var(--mc-surface); border-top: 1px solid var(--mc-border);
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -4px 16px rgb(28 37 30 / 6%);
}
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: .55rem 0 .5rem; min-height: 60px; color: var(--mc-muted); font-size: .75rem; font-weight: 650;
}
.tab.router-link-active { color: var(--mc-primary-text); }
.tab.router-link-active svg { stroke-width: 2.4; }
</style>
