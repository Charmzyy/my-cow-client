<script setup>
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import PostCard from '../ui/PostCard.vue';
import EmptyState from '../ui/EmptyState.vue';
import { api, apiList } from '../../api';
import { firstName } from '../../auth';
import { breedLabel } from '../../breeds';

const loading = ref(true);
const error = ref('');
const pending = ref([]);       // quick-check posts waiting for review
const stats = ref(null);       // /admin/stats: every number counted by the database

const n = (v) => (loading.value || !stats.value ? null : v(stats.value));

const tiles = computed(() => [
  { label: 'Requests needing an officer', value: n((s) => s.requests.unassigned), icon: 'review', tone: 'gold', to: '/admin/requests', cta: 'Assign officers' },
  { label: 'Officer applications', value: n((s) => s.officers.pending), icon: 'shield', tone: 'gold', to: '/admin/officers', cta: 'Verify licences' },
  { label: 'Valid certificates', value: n((s) => s.certificates.valid), icon: 'award', tone: 'green', to: '/admin/requests', cta: 'View requests', sub: n((s) => `${s.certificates.this_month} this month`) },
  { label: 'Registered users', value: n((s) => s.users.total), icon: 'users', tone: 'ink', to: '/admin/all/users', cta: 'Manage users', sub: n((s) => `${s.animals.toLocaleString()} animals`) },
]);

// Ranked breakdowns: one hue, bar length = share of the top item, number always printed
const breakdowns = computed(() => {
  if (!stats.value) return [];
  return [
    { title: 'Certified by breed', rows: stats.value.by_breed.map((r) => ({ ...r, label: breedLabel(r.label) })) },
    { title: 'Certified by county', rows: stats.value.by_county },
  ].map((b) => ({ ...b, max: Math.max(1, ...b.rows.map((r) => r.n)) }));
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    [pending.value, stats.value] = await Promise.all([
      apiList('/admin/unverified', 'posts'),
      api('/admin/stats'),
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
        <div v-for="t in tiles" :key="t.label" class="col-sm-6 col-xl-3">
          <router-link :to="t.to" class="mc-card stat-tile">
            <div class="d-flex justify-content-between align-items-start">
              <span class="stat-label">{{ t.label }}</span>
              <span class="stat-icon" :class="`tone-${t.tone}`"><Icon :name="t.icon" :size="20" /></span>
            </div>
            <div v-if="t.value === null" class="mc-skeleton" style="height: 44px; width: 70px; margin: .4rem 0 .9rem"></div>
            <div v-else class="stat-value" :class="{ 'mb-1': t.sub }">{{ t.value.toLocaleString() }}</div>
            <span v-if="t.sub" class="stat-sub">{{ t.sub }}</span>
            <span class="stat-cta">{{ t.cta }} <Icon name="arrow-right" :size="16" /></span>
          </router-link>
        </div>
      </div>

      <!-- Service level: is anyone waiting too long? -->
      <section v-if="stats" class="mc-card attention mb-5" :class="{ warn: stats.requests.overdue }">
        <Icon :name="stats.requests.overdue ? 'alert' : 'check-circle'" :size="22" />
        <div class="attention-main">
          <strong v-if="stats.requests.overdue">{{ stats.requests.overdue.toLocaleString() }} open {{ stats.requests.overdue === 1 ? 'request has' : 'requests have' }} waited more than {{ stats.requests.overdue_days }} days</strong>
          <strong v-else>No request has waited more than {{ stats.requests.overdue_days }} days</strong>
          <span>
            {{ stats.requests.in_progress.toLocaleString() }} with officers ·
            average decision time {{ stats.requests.turnaround_days === null ? '—' : `${stats.requests.turnaround_days} days` }} (last 90 days)
            <template v-if="stats.certificates.revoked"> · {{ stats.certificates.revoked }} revoked</template>
          </span>
        </div>
        <router-link to="/admin/requests" class="btn btn-outline btn-sm flex-none">Open queue</router-link>
      </section>

      <div v-if="breakdowns.length" class="row g-3 mb-5">
        <div v-for="b in breakdowns" :key="b.title" class="col-lg-6">
          <section class="mc-card p-3 h-100">
            <h2 class="h6 mb-3">{{ b.title }} <span class="text-secondary fw-normal">· valid certificates, top 8</span></h2>
            <p v-if="!b.rows.length" class="small text-secondary mb-0">No certificates issued yet.</p>
            <table v-else class="rank">
              <caption class="visually-hidden">{{ b.title }}</caption>
              <tbody>
                <tr v-for="r in b.rows" :key="r.label" :title="`${r.label}: ${r.n.toLocaleString()}`">
                  <th scope="row">{{ r.label }}</th>
                  <td class="rank-bar"><span :style="{ width: `${(r.n / b.max) * 100}%` }"></span></td>
                  <td class="rank-n">{{ r.n.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-end mb-3 gap-3">
        <div>
          <h2 class="h4 mb-1">Quick checks waiting</h2>
          <p class="text-secondary mb-0">Single-photo breed checks from farmers (not formal certification).</p>
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
.stat-sub { font-size: .85rem; color: var(--mc-muted); margin-bottom: .9rem; }
.attention { display: flex; align-items: center; gap: .9rem; padding: 1rem 1.2rem; }
.attention > svg { color: var(--mc-green-700); flex: none; }
.attention.warn { border-color: var(--mc-ochre-600); background: var(--mc-ochre-50); }
.attention.warn > svg { color: var(--mc-ochre-700); }
.attention-main { display: flex; flex-direction: column; gap: .15rem; flex: 1; min-width: 0; }
.attention-main span { font-size: .88rem; color: var(--mc-ink-2); }
@media (max-width: 576px) { .attention { flex-wrap: wrap; } }
.rank { width: 100%; border-collapse: separate; border-spacing: 0 .4rem; font-size: .9rem; }
.rank th { font-weight: 600; color: var(--mc-ink); white-space: nowrap; padding-right: .75rem; width: 1%; max-width: 12rem; overflow: hidden; text-overflow: ellipsis; }
.rank-bar { width: 100%; }
.rank-bar span { display: block; height: 8px; min-width: 4px; border-radius: 0 4px 4px 0; background: var(--mc-green-700); }
.rank-n { padding-left: .75rem; text-align: right; font-weight: 650; font-variant-numeric: tabular-nums; color: var(--mc-ink-2); }
</style>
