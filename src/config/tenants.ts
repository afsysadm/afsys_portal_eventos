// ---------------------------------------------------------------------------
// CONFIGURAÇÃO POR TENANT (SINDICATO)
//
// Nome, logo, cor da marca, textos e contato de cada sindicato saem daqui —
// não são hardcoded nos componentes. Trocar de sindicato = trocar a config
// (ou adicionar outra entrada em TENANTS), sem editar componentes.
//
// A cor da marca (brand/brandDark/brandSoft) é injetada como CSS custom
// properties no :root por applyTenantTheme(), sobrescrevendo os defaults do
// index.css. Assim todo o azul do portal passa a vir da config do tenant.
// ---------------------------------------------------------------------------

export interface TenantConfig {
  slug: string; // identificador do tenant
  nomeCurto: string; // header: linha 1
  regiao: string; // header: linha 2
  nomeCompleto: string; // rodapé / título jurídico
  logo: string; // caminho do asset da logo (servido de public/)
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
};

export const DEFAULT_TENANT = 'hoteleirorp';

// Resolve o tenant atual. Hoje cai no DEFAULT; o mecanismo está pronto para
// expandir (ex.: mapear window.location.hostname ou o slug do evento).
export function resolveTenant(hint?: string): TenantConfig {
  if (hint && TENANTS[hint]) return TENANTS[hint];
  return TENANTS[DEFAULT_TENANT];
}

// Injeta a cor da marca do tenant como CSS custom properties no :root.
export function applyTenantTheme(t: TenantConfig): void {
  const root = document.documentElement;
  root.style.setProperty('--brand', t.brand);
  root.style.setProperty('--brand-dark', t.brandDark);
  root.style.setProperty('--brand-soft', t.brandSoft);
}
