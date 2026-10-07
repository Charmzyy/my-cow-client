<script setup>
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import PostCard from '../ui/PostCard.vue';
import EmptyState from '../ui/EmptyState.vue';
import { apiList } from '../../api';
import { firstName } from '../../auth';

const loading = ref(true);
const error = ref('');
const pending = ref([]);
const certified = ref([]);
const users = ref([]);

const tiles = computed(() => [
  { label: 'Awaiting review', value: pending.value.length, icon: 'clock', tone: 'gold', to: '/admin/all/posts', cta: 'Open review queue' },
  { label: 'Certified cattle', value: certified.value.length, icon: 'award', tone: 'green', to: '/admin/certified/cows', cta: 'View certified' },
  { label: 'Registered users', value: users.value.length, icon: 'users', tone: 'ink', to: '/admin/all/users', cta: 'Manage users' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    [pending.value, certified.value, users.value] = await Promise.all([
      apiList('/admin/unverified', 'posts'),
      apiList('/admin/verified', 'posts'),
      apiList('/admin/users'),
    ]);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head">
        <span class="mc-eyebrow">Officer workspace</span>
        <h1>{{ firstName() ? `Good to see you, ${firstName()}` : 'Overview' }}</h1>
        <p>Review new submissions and keep your certified register up to date.</p>
      </header>

      <div v-if="error" class="mc-alert mc-alert-error mb-4" role="alert">
        <Icon name="alert" :size="18" /><span>{{ error }} <button class="btn btn-link btn-sm p-0 align-baseline" @click="load">Try again</button></span>
      </div>

      <div class="row g-3 mb-5">
        <div v-for="t in tiles" :key="t.label" class="col-sm-6 col-lg-4">
          <router-link :to="t.to" class="mc-card stat-tile">
            <div class="d-flex justify-content-between align-items-start">
              <span class="stat-label">{{ t.label }}</span>
              <span class="stat-icon" :class="`tone-${t.tone}`"><Icon :name="t.icon" :size="20" /></span>
            </div>
            <div v-if="loading" class="mc-skeleton" style="height: 44px; width: 70px; margin: .4rem 0 .9rem"></div>
            <div v-else class="stat-value">{{ t.value.toLocaleString() }}</div>
            <span class="stat-cta">{{ t.cta }} <Icon name="arrow-right" :size="16" /></span>
          </router-link>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-end mb-3 gap-3">
        <div>
          <h2 class="h4 mb-1">Waiting for review</h2>
          <p class="text-secondary mb-0">Cow photos from farmers that need an officer’s decision.</p>
        </div>
        <router-link v-if="pending.length > 3" to="/admin/all/posts" class="btn btn-outline btn-sm flex-none">See all {{ pending.length }}</router-link>
      </div>

      <div v-if="loading" class="row g-3">
        <div v-for="n in 3" :key="n" class="col-md-6 col-lg-4"><div class="mc-skeleton" style="height: 340px"></div></div>
      </div>
      <EmptyState v-else-if="!pending.length" icon="check-circle" title="You’re all caught up" text="New cow photos from farmers will appear here for review." />
      <div v-else class="row g-3">
        <div v-for="post in pending.slice(0, 3)" :key="post.id" class="col-md-6 col-lg-4">
          <PostCard :post="post">
            <template #badge><span class="mc-chip mc-chip-gold"><Icon name="clock" :size="13" /> Pending</span></template>
            <template #actions>
              <router-link to="/admin/all/posts" class="btn btn-primary btn-sm w-100">Review</router-link>
            </template>
          </PostCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.stat-tile { display: flex; flex-direction: column; padding: 1.25rem 1.35rem; color: var(--mc-ink); height: 100%; transition: border-color .15s, transform .15s; }
.stat-tile:hover { color: var(--mc-ink); border-color: var(--mc-green-700); transform: translateY(-2px); }
.stat-label { font-weight: 650; color: var(--mc-ink-2); }
.stat-value { font-size: 2.6rem; font-weight: 800; line-height: 1.1; margin: .4rem 0 .9rem; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.stat-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; }
.stat-icon.tone-gold { background: var(--mc-gold-50); color: var(--mc-gold-600); }
.stat-icon.tone-green { background: var(--mc-green-50); color: var(--mc-green-700); }
.stat-icon.tone-ink { background: #f1efe8; color: var(--mc-ink-2); }
.stat-cta { margin-top: auto; display: inline-flex; align-items: center; gap: .35rem; font-weight: 650; font-size: .92rem; color: var(--mc-green-700); }
.flex-none { flex: none; }
</style>
