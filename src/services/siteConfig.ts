import type { SiteConfig } from '../types';
import { getTenantData } from '../data';

// ---------------------------------------------------------------------------
// CAMADA DE SERVIÇO — CONFIGURAÇÃO DO SITE (MULTI-CLIENTE)
//
// O mesmo site atende vários clientes, diferenciados pela URL (hostname).
// Aqui é onde o app descobre "de quem é este site" e recebe o tenant, o nome,
// os textos da home, o tema visual e as estatísticas do cliente.
//
// O hostname é resolvido em config/tenants.ts (resolveTenant) e os dados vêm
// de src/data/<slug>.ts. Na integração, troque por:
//
//   const host = window.location.hostname;
//   const res = await fetch(`${CONFIG_API}/site-config?host=${host}`);
//   return await res.json();
//
// Assim, adicionar um novo cliente = cadastrar a config dele no backend e
// apontar o domínio para este mesmo site — sem rebuild.
// ---------------------------------------------------------------------------

export async function getSiteConfig(): Promise<SiteConfig> {
  const cfg = getTenantData().siteConfig;
  return new Promise((resolve) => setTimeout(() => resolve(cfg), 120));
}
