// Tipos do domínio do portal.
// Estes tipos espelham o que, mais à frente, virá da API pública do módulo
// afsys_inscricoes (eventos e configuração do site por cliente/tenant).

export type StatusEvento = 'aberto' | 'em_breve' | 'encerrado';

// Paleta neon usada por cada evento (mapeada para cor real em theme/palette.ts).
export type CorEvento = 'lime' | 'cyan' | 'amber' | 'magenta' | 'violet' | 'emerald';

export interface MetaItem {
  k: string;        // rótulo (ex.: "Inscrições")
  v: string;        // valor (ex.: "01/06 — 31/07")
  ph?: boolean;     // true = placeholder (dado ainda não confirmado pelo cliente)
}

export interface PassoInscricao {
  titulo: string;
  desc: string;
}

export interface EventoDetalhe {
  lead: string;
  sobre: string[];
  resumo: MetaItem[];
  passos: PassoInscricao[];
}

export interface Evento {
  id: number;
  slug: string;
  titulo: string;
  tituloPoster?: string;   // título quebrado em linhas para o "pôster" (use \n)
  kicker: string;          // categoria curta exibida acima do título
  edicao?: string;         // ex.: "4ª edição · Corrida de garçons"
  descricao: string;
  status: StatusEvento;
  cor: CorEvento;
  metas: MetaItem[];       // 2 a 3 infos exibidas no card
  goLabel?: string;        // texto do botão/ação no card
  detalhe?: EventoDetalhe; // presente quando há página de detalhe + inscrição
}

// Tema visual do site (varia por cliente). Aplicado como CSS custom properties.
export interface SiteTheme {
  id: string;
  vars: Record<string, string>;
}

// Configuração do site resolvida pelo hostname (1 por cliente/tenant).
export interface SiteConfig {
  tenant: string;          // slug do tenant no Perfex (ex.: "hoteleirorp")
  nome: string;            // nome do sindicato/cliente
  subtitulo: string;       // ex.: "Hotéis · Bares · Restaurantes"
  marca: string;           // letra/símbolo do brasão (ex.: "S")
  ano: string;             // ex.: "2026"
  theme: SiteTheme;
  contato?: {
    endereco?: string;
    whatsapp?: string;
  };
  // Estatísticas exibidas no bloco "Sobre" (opcional).
  stats?: { n: string; l: string; ph?: boolean }[];
}
