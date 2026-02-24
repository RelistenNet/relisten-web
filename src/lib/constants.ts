// Client-side API domain (always public, used by browser code)
export const API_DOMAIN = 'https://api.relisten.net';

// Server-side API domain (in-cluster in prod, falls back to public in dev)
export const SERVER_API_DOMAIN = process.env.RELISTEN_API_URL || API_DOMAIN;
