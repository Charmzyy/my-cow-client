// Default: relative URLs, i.e. the same address the page was loaded from. In Docker, nginx
// forwards /api and /storage to Laravel; in `npm run dev`, Vite's proxy does (vite.config.js).
// Set VITE_API_URL / VITE_STORAGE_URL at build time only if the API is on another domain.
export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage/';
