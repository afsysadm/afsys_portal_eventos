// ---------------------------------------------------------------------------
// CONFIGURAÇÃO POR TENANT (SINDICATO)
//
// Nome, logo, cor da marca, base da API, textos e contato de cada sindicato
// saem daqui — não são hardcoded nos componentes. Adicionar um sindicato novo =
// uma entrada em TENANTS + uma entrada em HOSTNAME_TENANT + os dados dele em
// src/data/. Nada mais precisa mudar.
//
// A cor da marca (brand/brandDark/brandSoft) é injetada como CSS custom
// properties no :root por applyTenantTheme(), sobrescrevendo os defaults do
// index.css. Assim todo o azul do portal passa a vir da config do tenant.
// ---------------------------------------------------------------------------

export interface TenantConfig {
  slug: string; // identificador do tenant (o mesmo usado no Perfex)
  nomeCurto: string; // header: linha 1
  regiao: string; // header: linha 2
  nomeCompleto: string; // rodapé / título jurídico
  logo: string; // caminho do asset da logo (servido de public/)
  apiBase: string; // base absoluta da API (Perfex) deste tenant, sem barra final
  brand: string; // cor primária (hex)
  brandDark: string; // variação escura (degradê, texto)
  brandSoft: string; // variação clara (caixas/avisos)
  contato: {
    endereco: string;
    telefone: string;
    email: string;
    instagram?: string; // handle (@...) ou URL
    site?: string; // domínio ou URL
  };
}

export const TENANTS: Record<string, TenantConfig> = {
  hoteleirorp: {
    slug: 'hoteleirorp',
    nomeCurto: 'Sindicato dos Hoteleiros',
    regiao: 'Ribeirão Preto e Região',
    nomeCompleto:
      'Sindicato dos Trabalhadores em Hotéis, Motéis, Restaurantes, Bares e Fast-Foods de Ribeirão Preto e Região',
    logo: '/assets/logo-hoteleirorp.webp',
    apiBase: 'https://hoteleirorp.gestao.afsys.com.br',
    // Azul do brasão (azul-marinho/royal profundo). Texto branco sobre --brand
    // tem contraste ~11:1 (passa AA/AAA).
    brand: '#1B2C8C',
    brandDark: '#131F63',
    brandSoft: '#EAECF8',
    contato: {
      endereco:
        'Rua São Sebastião, 506 — 4º andar, Conj. 401, Centro, Ribeirão Preto/SP · CEP 14015-040',
      telefone: '(16) 3629-4080',
      email: 'atendimento@hoteleirorp.com.br',
      instagram: '@sindhoteleirosrp',
      site: 'hoteleirorp.com.br',
    },
  },

  sindrefeicoessuzano: {
    slug: 'sindrefeicoessuzano',
    nomeCurto: 'Sindirefeições',
    regiao: 'Suzano/GRU e Região',
    nomeCompleto:
      'Sindicato dos Trabalhadores nas Empresas de Refeições Coletivas de Suzano e Região e Trabalhadores nas Empresas Fornecedoras de Refeições para Aeroportos do Município de Guarulhos',
    logo: '/assets/logo-sindrefeicoessuzano.webp',
    apiBase: 'https://sindrefeicoessuzano.gestao.afsys.com.br',
    // Azul-marinho da logo.
    brand: '#1C3669',
    brandDark: '#132649',
    brandSoft: '#E9EDF5',
    contato: {
      endereco: 'Rua Amélia Guerra, 147 — Vila Amorim, Suzano/SP · CEP 08610-000',
      telefone: '(11) 4746-2326',
      email: 'adm@sindirefeicoessuzano.org.br',
      instagram: '@sindirefeicoes.suzano.gru',
      site: 'sindirefeicoessuzano.org.br',
    },
  },
};

export const DEFAULT_TENANT = 'hoteleirorp';

// Mapa explícito hostname -> slug do tenant. Um domínio novo é uma linha nova;
// nada de regex/dedução — hostname desconhecido cai no DEFAULT_TENANT.
export const HOSTNAME_TENANT: Record<string, string> = {
  'hoteleirosrp.afsys.com.br': 'hoteleirorp',
  'sindrefeicoessuzano.afsys.com.br': 'sindrefeicoessuzano',
};

// Resolve o tenant atual pelo hostname do navegador.
//  - `hint` (slug conhecido) tem prioridade e funciona como override;
//  - hostname mapeado em HOSTNAME_TENANT vence em seguida;
//  - qualquer outro (localhost, preview, IP) cai no DEFAULT_TENANT.
export function resolveTenant(hint?: string): TenantConfig {
  if (hint && TENANTS[hint]) return TENANTS[hint];

  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const slug = HOSTNAME_TENANT[host];
  if (slug && TENANTS[slug]) return TENANTS[slug];

  return TENANTS[DEFAULT_TENANT];
}

// Injeta a cor da marca do tenant como CSS custom properties no :root.
export function applyTenantTheme(t: TenantConfig): void {
  const root = document.documentElement;
  root.style.setProperty('--brand', t.brand);
  root.style.setProperty('--brand-dark', t.brandDark);
  root.style.setProperty('--brand-soft', t.brandSoft);
}
