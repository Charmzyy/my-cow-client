<script setup>
import { onMounted, ref } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import PostCard from '../ui/PostCard.vue';
import EmptyState from '../ui/EmptyState.vue';
import { api, apiList } from '../../api';
import { breedLabel } from '../../breeds';

const posts = ref([]);
const loading = ref(true);
const error = ref('');
const busyId = ref(null);

const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, timerProgressBar: true });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    posts.value = await apiList('/admin/unverified', 'posts');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function removeFromQueue(id) {
  posts.value = posts.value.filter((p) => p.id !== id);
}

async function certify(post) {
  busyId.value = post.id;
  try {
    await api(`/admin/${post.id}/accept`, { method: 'PUT', body: { id: post.id } });
    removeFromQueue(post.id);
    toast.fire({ icon: 'success', title: `${post.cow_name} certified as ${breedLabel(post.predicted_class)}` });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t certify', text: e.message });
    load(); // the server may have saved it before failing (e.g. sending the email)
  } finally {
    busyId.value = null;
  }
}

async function reject(post) {
  const { isConfirmed, value: reason } = await Swal.fire({
    title: `Reject ${post.cow_name}?`,
    input: 'textarea',
    inputLabel: 'Tell the farmer why (they’ll receive this by email)',
    inputPlaceholder: 'e.g. Photo is blurry. Please retake it side-on in daylight.',
    inputValidator: (v) => (!v?.trim() ? 'Please give a short reason.' : undefined),
    showCancelButton: true,
    confirmButtonText: 'Reject submission',
    customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;

  busyId.value = post.id;
  try {
    await api(`/admin/${post.id}/reject`, { method: 'PUT', body: { reason: reason.trim() } });
    removeFromQueue(post.id);
    toast.fire({ icon: 'info', title: `${post.cow_name} rejected` });
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Couldn’t reject', text: e.message });
    load();
  } finally {
    busyId.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="mc-page">
    <div class="container">
      <header class="mc-page-head d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div>
          <span class="mc-eyebrow">Review queue</span>
          <h1>Submissions to review</h1>
          <p>Check each photo against the predicted breed. Certify it if it’s right, or reject it with a reason.</p>
        </div>
        <button class="btn btn-outline btn-sm" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
      </header>

      <div v-if="error" class="mc-alert mc-alert-error mb-4" role="alert"><Icon name="alert" :size="18" />{{ error }}</div>

      <div v-if="loading" class="row g-3">
        <div v-for="n in 6" :key="n" class="col-sm-6 col-lg-4 col-xl-3"><div class="mc-skeleton" style="height: 360px"></div></div>
      </div>
      <EmptyState v-else-if="!posts.length && !error" icon="check-circle" title="Nothing to review"
        text="Every submission has been handled. New photos will appear here automatically when you refresh." />
      <div v-else class="row g-3">
        <div v-for="post in posts" :key="post.id" class="col-sm-6 col-lg-4 col-xl-3">
          <PostCard :post="post">
            <template #badge><span class="mc-chip mc-chip-gold"><Icon name="clock" :size="13" /> Pending</span></template>
            <template #actions>
              <button class="btn btn-primary btn-sm flex-fill" :disabled="busyId === post.id" @click="certify(post)">
                <span v-if="busyId === post.id" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <Icon v-else name="check" :size="16" /> Certify
              </button>
              <button class="btn btn-danger-soft btn-sm flex-fill" :disabled="busyId === post.id" @click="reject(post)">
                <Icon name="x" :size="16" /> Reject
              </button>
            </template>
          </PostCard>
        </div>
      </div>
    </div>
  </div>
</template>
