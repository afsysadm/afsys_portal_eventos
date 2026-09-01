import type { Evento, SiteConfig } from '../types';
import { THEME_FESTIVAL } from '../theme/palette';

// ---------------------------------------------------------------------------
// DADOS DO TENANT — SINDICATO DOS HOTELEIROS (Ribeirão Preto e Região)
// Conteúdo editorial do portal (títulos, textos, resumo, passos). O que vem do
// backend é apenas o `status_portal` (services/statusPortal.ts).
// Campos marcados com ph:true são placeholders a confirmar com o cliente.
// ---------------------------------------------------------------------------

export const EVENTOS: Evento[] = [
  {
    id: 1,
    slug: 'garcon-cross-2026',
    titulo: 'Garçon Cross 2026',
    tituloPoster: 'Garçon\nCross',
    kicker: 'Esporte · Confraternização',
    edicao: '4ª edição · Corrida de garçons',
    descricao:
      'A corrida de quem equilibra pressa e precisão todos os dias. Bandeja na mão — e que vença quem chega primeiro sem derramar.',
    // Prova realizada em 10/08/2026 — o evento vive na aba "Realizados".
    status: 'encerrado',
    cor: 'lime',
    metas: [
      { k: 'Inscrições', v: '01/06 — 05/08' },
      { k: 'Prova', v: '10 ago 2026' },
      { k: 'Local', v: 'Ribeirão Preto', ph: true },
    ],
    goLabel: 'Inscrições encerradas',
    detalhe: {
      lead:
        'A corrida de quem equilibra pressa e precisão todos os dias — bandeja na mão, cidade aos pés.',
      sobre: [
        'O Garçon Cross celebra quem faz a hospitalidade da cidade acontecer. Garçons e garçonetes percorrem o trajeto carregando a bandeja com garrafa e taça — vence quem cruza a linha primeiro, com elegância e sem derramar uma gota.',
        'Mais que uma prova esportiva, é um dia de confraternização da categoria, aberto a profissionais de hotéis, bares e restaurantes de toda a região.',
      ],
      resumo: [
        { k: 'Inscrições', v: '01/06 — 05/08' },
        { k: 'Prova', v: '10 ago 2026' },
        { k: 'Local', v: 'Ribeirão Preto', ph: true },
        { k: 'Categorias', v: 'Masc · Fem · Equipes' },
        { k: 'Valor', v: 'Gratuito' },
      ],
      passos: [
        { titulo: 'Seus dados', desc: 'Nome e CPF.' },
        { titulo: 'Contato', desc: 'WhatsApp e e-mail.' },
        { titulo: 'Vínculo', desc: 'Onde trabalha e categoria.' },
        { titulo: 'Confirmação', desc: 'Você recebe o protocolo.' },
      ],
    },
  },
  {
    id: 3,
    slug: 'show-de-premios-natal',
    titulo: 'Show de Prêmios de Natal',
    tituloPoster: 'Show de\nPrêmios\nde Natal',
    kicker: 'Benefício do associado',
    descricao:
      'O sorteio de Natal para os associados em dia. Prêmios e datas a divulgar.',
    status: 'em_breve',
    cor: 'red',
    icone: 'natal',
    metas: [
      { k: 'Inscrições', v: 'A definir', ph: true },
      { k: 'Previsão', v: 'Dezembro', ph: true },
    ],
    goLabel: 'Aguarde a abertura',
  },
  {
    id: 4,
    slug: 'dia-das-mulheres',
    titulo: 'Dia das Mulheres',
    tituloPoster: 'Dia das\nMulheres',
    kicker: 'Comemorativo · Março',
    descricao:
      'Homenagem às mulheres da categoria, realizada em março de 2026.',
    status: 'encerrado',
    cor: 'magenta',
    metas: [
      { k: 'Realizado', v: 'Mar 2026', ph: true },
      { k: 'Participantes', v: '—', ph: true },
    ],
    goLabel: 'Inscrições encerradas',
  },
];

export const SITE_CONFIG: SiteConfig = {
  tenant: 'hoteleirorp',
  nome: 'Sindicato da Categoria',
  subtitulo: 'Hotéis · Bares · Restaurantes',
  marca: 'S',
  ano: '2026',
  theme: THEME_FESTIVAL,
  hero: {
    kicker: 'Eventos do sindicato · 2026',
    titulo: 'A agenda que move a categoria.',
    subtitulo: 'Corridas, homenagens e sorteios do sindicato. Inscrição online, na hora, sem filas.',
  },
  sobre: {
    titulo: 'Quem move a hospitalidade merece ser celebrado.',
    texto:
      'O sindicato promove o ano todo corridas, homenagens e ações para reconhecer os trabalhadores de hotéis, bares e restaurantes. Todas as inscrições, num só lugar.',
  },
  contato: {
    endereco: 'Endereço do sindicato',
    whatsapp: 'Contato / WhatsApp',
  },
  stats: [
    { n: '3', l: 'eventos em 2026' },
    { n: '0', l: 'com inscrição aberta' },
    { n: '+1,5 mil', l: 'trabalhadores na base', ph: true },
    { n: '100%', l: 'inscrição online' },
  ],
};
