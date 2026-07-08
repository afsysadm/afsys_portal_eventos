// Configuração do portal.
//
// Nota multi-cliente: hoje a base da API aponta para o tenant do primeiro
// cliente. Na evolução multi-tenant, este valor passará a vir do SiteConfig
// resolvido por hostname (services/siteConfig.ts), sem alterar componentes.

// Em dev, usa o prefixo relativo /backend (encaminhado pelo proxy do Vite ->
// evita CORS). Em produção, mantém a URL absoluta do tenant.
export const API_BASE = import.meta.env.DEV
  ? '/backend'
  : 'https://hoteleirorp.gestao.afsys.com.br';

// Chave do site (pública) do Cloudflare Turnstile.
export const TURNSTILE_SITE_KEY = '0x4AAAAAADti6aR9eXZjPz2j';
