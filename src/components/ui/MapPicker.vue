<script setup>
// Pick a farm's location: "Use my location" (GPS) or tap / drag the pin on the map.
// v-model:latitude / v-model:longitude; also emits `source` ('gps' | 'map') and `accuracy` (metres).
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon.vue';
import { FARM_ZOOM, KENYA_CENTER, KENYA_ZOOM, hasPoint, inKenya, locateMe } from '../../geo';

const props = defineProps({
  latitude: { type: [Number, String], default: null },
  longitude: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:latitude', 'update:longitude', 'update:source', 'update:accuracy']);

const el = ref(null);
const busy = ref(false);
const message = ref('');
const warn = ref(false);
let map;
let marker;
let circle;
let resizeObserver;

// A pin drawn in CSS: no image files, so nothing breaks in the Vite build
const pinIcon = L.divIcon({ className: 'mc-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] });

function setPoint(lat, lng, { source, accuracy = null, zoom = false } = {}) {
  if (!inKenya(lat, lng)) {
    message.value = 'That point is outside Kenya. Move the pin onto the farm.';
    warn.value = true;
    return;
  }
  const latlng = [lat, lng];
  if (!marker) {
    marker = L.marker(latlng, { icon: pinIcon, draggable: true, keyboard: true, title: 'Farm location' }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      setPoint(p.lat, p.lng, { source: 'map' });
    });
  } else {
    marker.setLatLng(latlng);
  }
  if (circle) { circle.remove(); circle = null; }
  if (accuracy) {
    circle = L.circle(latlng, { radius: accuracy, color: '#1b5e37', weight: 1, fillOpacity: 0.08 }).addTo(map);
  }
  if (zoom) map.setView(latlng, FARM_ZOOM);

  emit('update:latitude', Number(lat.toFixed(6)));
  emit('update:longitude', Number(lng.toFixed(6)));
  emit('update:source', source);
  emit('update:accuracy', accuracy);
}

async function useMyLocation() {
  busy.value = true;
  message.value = '';
  warn.value = false;
  try {
    const p = await locateMe();
    setPoint(p.lat, p.lng, { source: 'gps', accuracy: p.accuracy, zoom: true });
    if (!warn.value) {
      warn.value = p.accuracy > 100;
      message.value = p.accuracy > 100
        ? `GPS is only accurate to about ${p.accuracy} m here. Drag the pin onto the farm if it’s off.`
        : `Location found (accurate to about ${p.accuracy} m). Drag the pin if it’s not quite right.`;
    }
  } catch (e) {
    message.value = e.message;
    warn.value = true;
  } finally {
    busy.value = false;
  }
}

function clear() {
  if (marker) { marker.remove(); marker = null; }
  if (circle) { circle.remove(); circle = null; }
  emit('update:latitude', null);
  emit('update:longitude', null);
  emit('update:source', null);
  emit('update:accuracy', null);
  message.value = '';
}

onMounted(() => {
  map = L.map(el.value, { scrollWheelZoom: false }).setView(KENYA_CENTER, KENYA_ZOOM);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  map.on('click', (e) => {
    setPoint(e.latlng.lat, e.latlng.lng, { source: 'map' });
    message.value = 'Pin placed. Drag it to fine-tune.';
    warn.value = false;
  });
  if (hasPoint(props)) setPoint(Number(props.latitude), Number(props.longitude), { zoom: true, source: 'map' });

  // The map may start hidden (wizard step): redraw tiles once it gets a real size
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(el.value);
});

// Parent replaced the point (e.g. edit form loaded): move the pin without re-emitting
watch(() => [props.latitude, props.longitude], ([lat, lng]) => {
  if (!map || !hasPoint({ latitude: lat, longitude: lng })) return;
  const cur = marker?.getLatLng();
  if (cur && Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lng) < 1e-7) return;
  if (!marker) setPoint(Number(lat), Number(lng), { zoom: true, source: 'map' });
  else { marker.setLatLng([lat, lng]); map.setView([lat, lng], FARM_ZOOM); }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
});
</script>

<template>
  <div class="map-picker">
    <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
      <button type="button" class="btn btn-outline btn-sm" :disabled="busy" @click="useMyLocation">
        <span v-if="busy" class="spinner-border spinner-border-sm"></span><Icon v-else name="pin" :size="16" />
        Use my location
      </button>
      <span class="small text-secondary">or tap the map where the farm is</span>
      <button v-if="hasPoint({ latitude, longitude })" type="button" class="btn btn-link btn-sm ms-auto p-0" @click="clear">Remove pin</button>
    </div>
    <div ref="el" class="map-box" role="application" aria-label="Map: tap to place the farm pin"></div>
    <p v-if="message" class="form-hint mb-0 mt-1" :class="{ 'text-warning-emphasis': warn }" role="status">{{ message }}</p>
    <p v-else-if="hasPoint({ latitude, longitude })" class="form-hint mb-0 mt-1">{{ latitude }}, {{ longitude }}</p>
  </div>
</template>

<style>
.map-box { height: 260px; border-radius: 12px; border: 1px solid var(--mc-border, #e6e2d6); z-index: 0; }
.mc-pin span {
  display: block; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
  background: #1b5e37; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .35);
}
</style>
