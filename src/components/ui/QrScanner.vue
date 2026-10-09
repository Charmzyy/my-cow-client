<script setup>
// Full-screen camera scanner for ear-tag QR stickers. Uses the browser's built-in BarcodeDetector
// where it exists (Android Chrome), else the html5-qrcode library (iPhone Safari), loaded only
// when someone actually scans. Emits `code` with the cow's 8-character code.
// Browsers only open the camera on https:// (or localhost), like GPS.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import Icon from './Icon.vue';
import { codeFromScan } from '../../milk';

const emit = defineEmits(['code', 'close']);
const video = ref(null);
const error = ref('');
const typed = ref('');
let stream = null;
let timer = null;
let fallback = null;
let done = false;

function found(text) {
  const code = codeFromScan(text);
  if (!code || done) return false;
  done = true;
  navigator.vibrate?.(60);
  emit('code', code);
  return true;
}

async function startNative() {
  const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.value.srcObject = stream;
  await video.value.play();
  timer = setInterval(async () => {
    try {
      const codes = await detector.detect(video.value);
      codes.some((c) => found(c.rawValue));
    } catch { /* frame not ready yet */ }
  }, 250);
}

async function startFallback() {
  const { Html5Qrcode } = await import('html5-qrcode');
  fallback = new Html5Qrcode('qr-fallback', { verbose: false });
  await fallback.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 240, height: 240 } }, (text) => found(text), () => {});
}

onMounted(async () => {
  if (!window.isSecureContext) {
    error.value = 'The camera only works on the secure (https://) link of MyCow. Type the code from the sticker instead.';
    return;
  }
  try {
    const native = 'BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats?.())?.includes('qr_code');
    await nextTick();
    if (native) await startNative();
    else await startFallback();
  } catch (e) {
    error.value = e?.name === 'NotAllowedError'
      ? 'Camera permission was refused. Allow it in the browser settings, or type the code from the sticker.'
      : 'Couldn’t start the camera. Type the code printed under the QR instead.';
  }
});

onBeforeUnmount(() => {
  clearInterval(timer);
  stream?.getTracks().forEach((t) => t.stop());
  fallback?.stop().catch(() => {});
});

function submitTyped() {
  if (!found(typed.value)) error.value = 'That isn’t a MyCow tag code. It’s the 8 letters and numbers under the QR.';
}
</script>

<template>
  <div class="scanner" role="dialog" aria-modal="true" aria-label="Scan an ear tag">
    <div class="scanner-top">
      <strong>Scan ear tag</strong>
      <button type="button" class="btn btn-sm scanner-close" aria-label="Close scanner" @click="emit('close')"><Icon name="x" :size="22" /></button>
    </div>

    <div class="scanner-view">
      <video ref="video" class="scanner-video" playsinline muted></video>
      <div id="qr-fallback" class="scanner-fallback"></div>
      <span class="scanner-frame" aria-hidden="true"></span>
    </div>

    <form class="scanner-bottom" @submit.prevent="submitTyped">
      <p v-if="error" class="scanner-error" role="alert">{{ error }}</p>
      <p v-else class="scanner-hint">Point the camera at the QR sticker on the tag or collar.</p>
      <div class="d-flex gap-2">
        <label class="visually-hidden" for="scan-typed">Code under the QR</label>
        <input id="scan-typed" v-model="typed" class="form-control" placeholder="Or type the code, e.g. ABCD2345" autocapitalize="characters" autocomplete="off" />
        <button class="btn btn-primary" :disabled="!typed">Find</button>
      </div>
    </form>
  </div>
</template>

<style>
.scanner { position: fixed; inset: 0; z-index: 2000; background: #0d120e; color: #fff; display: flex; flex-direction: column; }
.scanner-top { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem; }
.scanner-close { color: #fff; }
.scanner-view { position: relative; flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.scanner-video, .scanner-fallback { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.scanner-fallback video { width: 100% !important; height: 100% !important; object-fit: cover; }
.scanner-frame { position: relative; width: min(64vw, 260px); aspect-ratio: 1; border: 3px solid var(--mc-gold-500); border-radius: 18px; box-shadow: 0 0 0 100vmax rgb(0 0 0 / 35%); pointer-events: none; }
.scanner-bottom { padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom)); background: #0d120e; }
.scanner-hint, .scanner-error { margin: 0 0 .6rem; font-size: .9rem; }
.scanner-error { color: #ffd7a8; }
</style>
