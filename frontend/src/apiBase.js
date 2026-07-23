// Single source of truth for the backend URL - was previously hardcoded directly inside
// CharCounter.jsx, which meant every new tool would have had to retype the same literal.
// Override at build/dev time via VITE_API_BASE_URL if needed (e.g. local dev against a
// locally-running backend); defaults to the real deployed backend.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://tools-backend.sschw.dev';
