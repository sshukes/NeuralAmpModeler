const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

const trimmedBase = rawBase.replace(/\/+$/, '');

const hasApiSuffix = /\/api$/i.test(trimmedBase);

export const API_BASE_URL = hasApiSuffix
  ? trimmedBase || '/api'
  : `${trimmedBase || ''}/api`;
