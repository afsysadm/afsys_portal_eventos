import type { SiteConfig } from '../types';
import { MOCK_SITE_CONFIG } from '../data/mock';

// ---------------------------------------------------------------------------
// CAMADA DE SERVIÇO — CONFIGURAÇÃO DO SITE (MULTI-CLIENTE)
//
// O mesmo site atende vários clientes, diferenciados pela URL (hostname).
// Aqui é onde o app descobre "de quem é este site" e recebe o tenant, o nome,
// o tema visual e os contatos do cliente.
//
// Hoje retorna um mock fixo. Na integração, troque por:
//
//   const host = window.location.hostname;
//   const res = await fetch(`${CONFIG_API}/site-config?host=${host}`);
//   return await res.json();
//
// Assim, adicionar um novo cliente = cadastrar a config dele no backend e
// apontar o domínio para este mesmo site — sem rebuild.
// ---------------------------------------------------------------------------

export async function getSiteConfig(): Promise<SiteConfig> {
  // const host = window.location.hostname; // usado na integração
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_SITE_CONFIG), 120));
}

// Base da API do tenant (placeholder para a fase de integração).
// Ex.: `https://${tenant}.gestao.afsys.com.br`
export function getApiBase(_tenant: string): string {
  return '';
}
