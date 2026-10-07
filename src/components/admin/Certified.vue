<script setup>
import { computed, onMounted, ref } from 'vue';
import Icon from '../ui/Icon.vue';
import PostCard from '../ui/PostCard.vue';
import EmptyState from '../ui/EmptyState.vue';
import { apiList } from '../../api';
import { BREEDS, breedLabel } from '../../breeds';

const posts = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const breed = ref('');

const breedOptions = Object.keys(BREEDS);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return posts.value.filter(
    (p) =>
      (!breed.value || p.predicted_class === breed.value) &&
      (!q || `${p.cow_name} ${p.owner || ''}`.toLowerCase().includes(q)),
  );
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    posts.value = await apiList('/admin/verified', 'posts');
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
        <span class="mc-eyebrow">Register</span>
        <h1>Certified cattle</h1>
        <p>Every animal an officer has confirmed. Search by cow name or owner.</p>
      </header>

      <div class="filters mc-card">
        <div class="filters-search">
          <label class="visually-hidden" for="cert-search">Search</label>
          <input id="cert-search" v-model="search" type="search" class="form-control" placeholder="Search cow name or owner" />
        </div>
        <div>
          <label class="visually-hidden" for="cert-breed">Breed</label>
          <select id="cert-breed" v-model="breed" class="form-select">
            <option value="">All breeds</option>
            <option v-for="b in breedOptions" :key="b" :value="b">{{ breedLabel(b) }}</option>
          </select>
        </div>
        <span class="filters-count">{{ filtered.length }} of {{ posts.length }}</span>
      </div>

      <div v-if="error" class="mc-alert mc-alert-error mb-4" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div v-if="loading" class="row g-3">
        <div v-for="n in 4" :key="n" class="col-sm-6 col-lg-4 col-xl-3"><div class="mc-skeleton" style="height: 320px"></div></div>
      </div>
      <EmptyState v-else-if="!posts.length && !error" icon="award" title="No certified cattle yet"
        text="Animals you certify from the review queue will be listed here.">
        <router-link to="/admin/all/posts" class="btn btn-primary">Open review queue</router-link>
      </EmptyState>
      <EmptyState v-else-if="!filtered.length" icon="image" title="No matches" text="Try a different name or breed." />
      <div v-else class="row g-3">
        <div v-for="post in filtered" :key="post.id" class="col-sm-6 col-lg-4 col-xl-3">
          <PostCard :post="post">
            <template #badge><span class="mc-chip mc-chip-green"><Icon name="award" :size="13" /> Certified</span></template>
          </PostCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.filters { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; padding: .85rem; margin-bottom: 1.5rem; box-shadow: none; }
.filters-search { flex: 1 1 240px; }
.filters .form-select { min-height: 50px; border-radius: var(--mc-radius-sm); border-color: var(--mc-border-strong); }
.filters-count { margin-left: auto; color: var(--mc-muted); font-size: .9rem; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
