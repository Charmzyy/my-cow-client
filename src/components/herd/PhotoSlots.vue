<script setup>
// Guided photo capture: one card per angle. Each card uploads on its own, so a slow
// connection never loses the photos already taken.
import { computed, reactive } from 'vue';
import Swal from 'sweetalert2';
import Icon from '../ui/Icon.vue';
import { STORAGE_URL } from '../../config';
import { api, form } from '../../api';
import { preparePhoto } from '../../image';
import { anglesFor } from '../../animals';
import { NOT_A_COW, breedLabel, formatPct } from '../../breeds';

const props = defineProps({
  animal: { type: Object, required: true },
  editable: { type: Boolean, default: true },
});
const emit = defineEmits(['updated']);

const busy = reactive({});   // angle -> true while uploading/deleting
const errors = reactive({}); // angle -> message

const slots = computed(() => {
  const byAngle = Object.fromEntries((props.animal.photos || []).map((p) => [p.angle, p]));
  return anglesFor(props.animal.sex).map((a) => ({ ...a, photo: byAngle[a.key] || null }));
});

async function onPick(angle, event) {
  const picked = event.target.files?.[0];
  event.target.value = '';
  if (!picked || busy[angle]) return; // one upload per slot at a time
  errors[angle] = '';
  const { file, error } = await preparePhoto(picked);
  if (!file) {
    errors[angle] = error;
    return;
  }
  busy[angle] = true;
  try {
    const data = await api(`/animals/${props.animal.id}/photos`, { method: 'POST', body: form({ angle, image: file }) });
    if (data.ai_unavailable) errors[angle] = 'Saved. The breed check is offline right now and will be redone later.';
    emit('updated', data.animal);
  } catch (e) {
    errors[angle] = e.message;
  } finally {
    busy[angle] = false;
  }
}

async function remove(slot) {
  const { isConfirmed } = await Swal.fire({
    title: `Remove the ${slot.label.toLowerCase()} photo?`,
    showCancelButton: true,
    confirmButtonText: 'Remove',
    customClass: { confirmButton: 'mc-danger' },
  });
  if (!isConfirmed) return;
  busy[slot.key] = true;
  try {
    const data = await api(`/animals/${props.animal.id}/photos/${slot.photo.id}`, { method: 'DELETE' });
    emit('updated', data.animal);
  } catch (e) {
    errors[slot.key] = e.message;
  } finally {
    busy[slot.key] = false;
  }
}
</script>

<template>
  <div class="slots">
    <div v-for="slot in slots" :key="slot.key" class="slot" :class="{ filled: slot.photo }">
      <label class="slot-frame" :class="{ disabled: !editable || busy[slot.key] }">
        <input
          v-if="editable"
          type="file"
          accept="image/*"
          capture="environment"
          class="visually-hidden"
          :disabled="busy[slot.key]"
          :aria-label="`Take ${slot.label} photo`"
          @change="onPick(slot.key, $event)"
        />
        <img v-if="slot.photo" :src="STORAGE_URL + slot.photo.path" :alt="`${slot.label} photo`" loading="lazy" />
        <span v-else class="slot-empty">
          <Icon name="camera" :size="26" />
          <span>{{ editable ? 'Tap to take photo' : 'No photo' }}</span>
        </span>
        <span v-if="busy[slot.key]" class="slot-busy"><span class="spinner-border spinner-border-sm"></span> Uploading…</span>
      </label>

      <div class="slot-body">
        <div class="d-flex justify-content-between align-items-center gap-2">
          <strong>{{ slot.label }}</strong>
          <span v-if="slot.recommended && !slot.photo" class="mc-chip mc-chip-gold">Needed</span>
          <span v-else-if="slot.photo" class="mc-chip mc-chip-green"><Icon name="check" :size="12" /> Done</span>
        </div>
        <p class="slot-hint">{{ slot.hint }}</p>

        <p v-if="slot.photo && slot.ai && slot.photo.ai_breed" class="slot-ai">
          <template v-if="slot.photo.ai_breed === NOT_A_COW">
            <Icon name="alert" :size="14" /> No cow recognised. Try a clearer photo.
          </template>
          <template v-else>
            AI: <b>{{ breedLabel(slot.photo.ai_breed) }}</b> · {{ formatPct(slot.photo.ai_confidence) }}
          </template>
        </p>
        <p v-if="errors[slot.key]" class="slot-error" role="alert">{{ errors[slot.key] }}</p>

        <div v-if="editable && slot.photo" class="d-flex gap-2 mt-auto">
          <label class="btn btn-outline btn-sm flex-fill mb-0" :class="{ disabled: busy[slot.key] }">
            <input type="file" accept="image/*" capture="environment" class="visually-hidden"
              :disabled="busy[slot.key]" @change="onPick(slot.key, $event)" />
            <Icon name="refresh" :size="14" /> Retake
          </label>
          <button type="button" class="btn btn-danger-soft btn-sm" :disabled="busy[slot.key]"
            :aria-label="`Remove ${slot.label} photo`" @click="remove(slot)">
            <Icon name="trash" :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.slots { display: grid; gap: .85rem; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.slot { display: flex; flex-direction: column; background: var(--mc-surface); border: 1px solid var(--mc-border); border-radius: var(--mc-radius); overflow: hidden; }
.slot.filled { border-color: var(--mc-green-100); }
.slot-frame { position: relative; aspect-ratio: 4 / 3; margin: 0; cursor: pointer; background: var(--mc-cream); display: block; }
.slot-frame.disabled { cursor: default; }
.slot-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
.slot-empty {
  position: absolute; inset: 8px; border: 2px dashed var(--mc-border-strong); border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem;
  color: var(--mc-green-700); font-weight: 650; font-size: .88rem;
}
.slot-frame:not(.disabled):hover .slot-empty { border-color: var(--mc-green-700); background: var(--mc-green-50); }
.slot-frame:focus-within { outline: 3px solid var(--mc-gold-500); outline-offset: -3px; }
.slot-busy {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: .5rem;
  background: rgb(255 255 255 / 85%); font-weight: 650; color: var(--mc-ink);
}
.slot-body { padding: .75rem .85rem .85rem; display: flex; flex-direction: column; gap: .35rem; flex: 1; }
.slot-hint { margin: 0; font-size: .82rem; color: var(--mc-muted); }
.slot-ai { margin: 0; font-size: .85rem; color: var(--mc-ink-2); display: flex; align-items: center; gap: .3rem; }
.slot-error { margin: 0; font-size: .82rem; color: var(--mc-danger); }
</style>
