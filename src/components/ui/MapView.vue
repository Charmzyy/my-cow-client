<script setup>
// Read-only map with one farm pin, plus a Directions link (opens Google Maps on phones).
import { onBeforeUnmount, onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from './Icon.vue';
import { FARM_ZOOM, directionsUrl } from '../../geo';

const props = defineProps({
  latitude: { type: [Number, String], required: true },
  longitude: { type: [Number, String], required: true },
  height: { type: String, default: '200px' },
  directions: { type: Boolean, default: false },
});

const el = ref(null);
let map;
let resizeObserver;

onMounted(() => {
  const point = [Number(props.latitude), Number(props.longitude)];
  map = L.map(el.value, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: true }).setView(point, FARM_ZOOM - 1);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.marker(point, { icon: L.divIcon({ className: 'mc-pin', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(map);
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(el.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
});
</script>

<template>
  <div>
    <div ref="el" class="map-box" :style="{ height }" role="img" aria-label="Map showing the farm location"></div>
    <a v-if="directions" :href="directionsUrl(latitude, longitude)" target="_blank" rel="noopener" class="btn btn-primary btn-sm w-100 mt-2">
      <Icon name="pin" :size="16" /> Directions to the farm
    </a>
  </div>
</template>
