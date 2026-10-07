<script setup>
import { computed, onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import EmptyState from '../ui/EmptyState.vue';
import { api, apiList } from '../../api';
import { auth } from '../../auth';

const users = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? users.value.filter((u) => `${displayName(u)} ${u.email}`.toLowerCase().includes(q)) : users.value;
});

function displayName(u) {
  return u.fullname || u.name || '—';
}

function initials(u) {
  return displayName(u).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    users.value = await apiList('/admin/users');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function remove(user) {
  const { isConfirmed } = await Swal.fire({
    icon: 'warning',
    title: `Delete ${displayName(user)}?`,
    text: 'Their account and all of their cow submissions will be permanently removed.',
    showCancelButton: true,
    confirmButtonText: 'Delete user',
    customClass: { confirmButton: 'mc-danger' },
    focusCancel: true,
  });
  if (!isConfirmed) return;
  try {
    await api(`/admin/${user.id}/delete`, { method: 'DELETE', body: { id: user.id } });
    users.value = users.value.filter((u) => u.id !== user.id);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'User deleted', showConfirmButton: false, timer: 2200 });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t delete user', text: e.message });
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container" style="max-width: 960px">
      <header class="mc-page-head">
        <span class="mc-eyebrow">People</span>
        <h1>Users</h1>
        <p>Everyone with a MyCow account.</p>
      </header>

      <div class="filters mc-card">
        <div class="filters-search">
          <label class="visually-hidden" for="user-search">Search users</label>
          <input id="user-search" v-model="search" type="search" class="form-control" placeholder="Search name or email" />
        </div>
        <span class="filters-count">{{ filtered.length }} {{ filtered.length === 1 ? 'user' : 'users' }}</span>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-4" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div v-if="loading" class="mc-skeleton" style="height: 280px"></div>
      <EmptyState v-else-if="!filtered.length && !error" icon="users" :title="users.length ? 'No matches' : 'No users yet'" />
      <ul v-else class="mc-card user-list">
        <li v-for="u in filtered" :key="u.id" class="user-row">
          <span class="avatar" aria-hidden="true">{{ initials(u) }}</span>
          <div class="user-main">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <strong>{{ displayName(u) }}</strong>
              <span v-if="u.role == 1" class="mc-chip mc-chip-gold">Officer</span>
              <span v-if="u.id === auth.user?.id" class="mc-chip mc-chip-ink">You</span>
            </div>
            <span class="user-email">{{ u.email }}</span>
          </div>
          <button v-if="u.id !== auth.user?.id" class="btn btn-danger-soft btn-sm" :aria-label="`Delete ${displayName(u)}`" @click="remove(u)">
            <Icon name="trash" :size="16" /><span class="d-none d-sm-inline">Delete</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.user-list { list-style: none; padding: 0; margin: 0; overflow: hidden; }
.user-row { display: flex; align-items: center; gap: .9rem; padding: .9rem 1.1rem; }
.user-row + .user-row { border-top: 1px solid var(--mc-border); }
.avatar {
  flex: none; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center;
  background: var(--mc-green-100); color: var(--mc-green-800); font-weight: 750; font-size: .9rem;
}
.user-main { flex: 1; min-width: 0; }
.user-email { display: block; color: var(--mc-ink-2); font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
