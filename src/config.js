// Build-time settings: Vite replaces import.meta.env.VITE_* when `npm run build` runs,
// so changing them later needs a rebuild (e.g. docker build --build-arg).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8001/storage/';
