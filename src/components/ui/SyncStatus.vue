<script setup>
// A slim bar under the header whenever it matters: no signal, records waiting on this phone,
// or records the server refused. Tapping it lists them; refused ones show why, and can be
// tried again or thrown away. Hidden when everything is sent.
import { computed, ref } from 'vue';
import Icon from './Icon.vue';
import { discard, flush, outbox, retry } from '../../outbox';

const open = ref(false);
const items = computed(() => [...outbox.failed, ...outbox.waiting]);
const show = computed(() => !outbox.online || items.value.length);

const summary = computed(() => {
  const w = outbox.waiting.length;
  const f = outbox.failed.length;
  if (f) return `${f} record${f > 1 ? 's' : ''} couldn’t be saved. Tap to check.`;
  if (!outbox.online && w) return `No signal · ${w} record${w > 1 ? 's' : ''} saved on this phone, sent when you’re back online`;
  if (!outbox.online) return 'No signal · you can keep recording milk, deliveries and health';
  if (outbox.sending) return `Sending ${w} record${w > 1 ? 's' : ''}…`;
  return `${w} record${w > 1 ? 's' : ''} waiting to send`;
});

function when(iso) {
  return new Date(iso).toLocaleString('en-KE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div v-if="show" class="sync" :class="{ bad: outbox.failed.length, off: !outbox.online && !outbox.failed.length }" role="status" aria-live="polite">
    <div class="container">
      <button type="button" class="sync-bar" :aria-expanded="open" :disabled="!items.length" @click="open = !open">
        <span v-if="outbox.sending" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
        <Icon v-else :name="outbox.failed.length ? 'alert' : outbox.online ? 'clock' : 'refresh'" :size="16" />
        <span>{{ summary }}</span>
        <Icon v-if="items.length" name="chevron-right" :size="16" class="ms-auto sync-chev" :class="{ open }" />
      </button>

      <div v-if="open && items.length" class="sync-panel">
        <ul>
          <li v-for="i in items" :key="i.id">
            <span class="sync-main">
              <strong>{{ i.label }}</strong>
              <small>Made {{ when(i.createdAt) }}</small>
              <small v-if="i.status === 'failed'" class="sync-error">Not saved: {{ i.error }}</small>
            </span>
            <span v-if="i.status === 'failed'" class="d-flex gap-1 flex-none">
              <button type="button" class="btn btn-outline btn-sm" @click="retry(i.id)">Try again</button>
              <button type="button" class="btn btn-danger-soft btn-sm" :aria-label="`Throw away: ${i.label}`" @click="discard(i.id)"><Icon name="trash" :size="15" /></button>
            </span>
            <span v-else class="mc-chip mc-chip-gold flex-none"><Icon name="clock" :size="13" /> Waiting</span>
          </li>
        </ul>
        <button v-if="outbox.waiting.length" type="button" class="btn btn-primary btn-sm" :disabled="outbox.sending" @click="flush">Send now</button>
      </div>
    </div>
  </div>
</template>

<style>
.sync { background: var(--mc-gold-50); border-bottom: 1px solid var(--mc-gold-100); color: var(--mc-info-ink); }
.sync.off { background: var(--mc-subtle-2); border-color: var(--mc-border); color: var(--mc-ink-2); }
.sync.bad { background: var(--mc-error-bg); border-color: var(--mc-error-border); color: var(--mc-error-ink); }
.sync-bar { display: flex; align-items: center; gap: .5rem; width: 100%; min-height: 40px; padding: .35rem 0; border: 0; background: none; color: inherit; font-size: .88rem; font-weight: 600; text-align: left; }
.sync-bar:disabled { cursor: default; opacity: 1; }
.sync-chev { transition: transform .15s; }
.sync-chev.open { transform: rotate(90deg); }
.sync-panel { padding-bottom: .75rem; }
.sync-panel ul { list-style: none; margin: 0 0 .6rem; padding: 0; background: var(--mc-surface); border: 1px solid var(--mc-border); border-radius: var(--mc-radius-sm); color: var(--mc-ink); }
.sync-panel li { display: flex; align-items: center; gap: .75rem; padding: .6rem .8rem; border-top: 1px solid var(--mc-border); }
.sync-panel li:first-child { border-top: 0; }
.sync-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.sync-main small { color: var(--mc-muted); }
.sync-main .sync-error { color: var(--mc-danger); }
</style>
