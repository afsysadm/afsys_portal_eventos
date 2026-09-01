import type { Evento, SiteConfig } from '../types';
import { resolveTenant, DEFAULT_TENANT } from '../config/tenants';
import * as hoteleirorp from './hoteleirorp';
import * as sindrefeicoessuzano from './sindrefeicoessuzano';

// ---------------------------------------------------------------------------
// DADOS POR TENANT
//
// Cada sindicato tem um arquivo em src/data/<slug>.ts exportando EVENTOS e
// SITE_CONFIG. Adicionar um sindicato novo = um arquivo + uma linha no mapa
// abaixo (e a entrada correspondente em config/tenants.ts).
//
// Mais à frente estes dados podem vir da API pública do módulo
// afsys_inscricoes; a troca acontece só na camada de serviço (src/services).
// ---------------------------------------------------------------------------

export interface TenantData {
  eventos: Evento[];
  siteConfig: SiteConfig;
}

export const TENANT_DATA: Record<string, TenantData> = {
  hoteleirorp: { eventos: hoteleirorp.EVENTOS, siteConfig: hoteleirorp.SITE_CONFIG },
  sindrefeicoessuzano: {
    eventos: sindrefeicoessuzano.EVENTOS,
    siteConfig: sindrefeicoessuzano.SITE_CONFIG,
  },
};

// Dados do tenant resolvido (por hostname). Tenant sem dados cadastrados cai
// no default — o portal nunca fica sem conteúdo.
export function getTenantData(hint?: string): TenantData {
  const slug = resolveTenant(hint).slug;
  return TENANT_DATA[slug] ?? TENANT_DATA[DEFAULT_TENANT];
}
