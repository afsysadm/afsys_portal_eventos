// Tipos do domínio do portal.
// Estes tipos espelham o que, mais à frente, virá da API pública do módulo
// afsys_inscricoes (eventos e configuração do site por cliente/tenant).

export type StatusEvento = 'aberto' | 'em_breve' | 'encerrado';

// Paleta neon usada por cada evento (mapeada para cor real em theme/palette.ts).
export type CorEvento = 'lime' | 'cyan' | 'amber' | 'magenta' | 'violet' | 'emerald' | 'red';

// Ilustração decorativa opcional no pôster do card (só alguns eventos usam).
export type IconeEvento = 'natal';

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
  icone?: IconeEvento;     // ilustração decorativa no pôster (opcional)
  metas: MetaItem[];       // 2 a 3 infos exibidas no card
  goLabel?: string;        // texto do botão/ação no card
  detalhe?: EventoDetalhe; // presente quando há página de detalhe + inscrição
  // Eventos que sorteiam/atendem crianças (ex.: Dia das Crianças) ganham a
  // etapa de dependentes no wizard. A configuração é do EVENTO, não do tenant:
  // o mesmo sindicato tem eventos que pedem crianças e eventos que não pedem.
  // Ausente/false = fluxo idêntico ao de sempre. No futuro virá da API.
  pedeCriancas?: boolean;
}

// Tema visual do site (varia por cliente). Aplicado como CSS custom properties.
export interface SiteTheme {
  id: string;
  vars: Record<string, string>;
}

// Chamada principal da home (faixa azul do topo).
export interface HeroConfig {
  kicker: string;          // ex.: "Eventos do sindicato · 2026" (exibido em caixa alta)
  titulo: string;
  subtitulo: string;
}

// Bloco institucional que acompanha as estatísticas na home.
export interface SobreConfig {
  titulo: string;
  texto: string;
}

// Configuração do site resolvida pelo hostname (1 por cliente/tenant).
export interface SiteConfig {
  tenant: string;          // slug do tenant no Perfex (ex.: "hoteleirorp")
  nome: string;            // nome do sindicato/cliente
  subtitulo: string;       // ex.: "Hotéis · Bares · Restaurantes"
  marca: string;           // letra/símbolo do brasão (ex.: "S")
  ano: string;             // ex.: "2026"
  theme: SiteTheme;
  hero: HeroConfig;
  sobre: SobreConfig;
  contato?: {
    endereco?: string;
    whatsapp?: string;
  };
  // Estatísticas exibidas no bloco "Sobre" (opcional).
  stats?: { n: string; l: string; ph?: boolean }[];
}
