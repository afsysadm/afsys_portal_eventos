import { resolveTenant, DEFAULT_TENANT } from './config/tenants';

// Configuração do portal.
//
// A base da API é POR TENANT (config/tenants.ts → apiBase), resolvida pelo
// hostname. Nenhum consumidor deve escrever a URL do Perfex — todos chamam
// apiBase() e recebem a base do sindicato do domínio atual.

// Em dev, usa o prefixo relativo /backend (encaminhado pelo proxy do Vite ->
// evita CORS). O proxy aponta para a API do DEFAULT_TENANT; para testar outro
// sindicato em dev, ajuste o target em vite.config.ts.
const DEV_PROXY_PREFIX = '/backend';

// Base da API do tenant atual, sem barra final.
export function apiBase(hint?: string): string {
  const tenant = resolveTenant(hint);
  if (import.meta.env.DEV && tenant.slug === DEFAULT_TENANT) return DEV_PROXY_PREFIX;
  return tenant.apiBase;
}

// Chave do site (pública) do Cloudflare Turnstile. A mesma chave atende todos
// os domínios do portal (cada hostname novo é liberado no painel Cloudflare).
export const TURNSTILE_SITE_KEY = '0x4AAAAAADti6aR9eXZjPz2j';
