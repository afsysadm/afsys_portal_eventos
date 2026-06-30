import type { Evento, SiteConfig } from '../types';
import { THEME_FESTIVAL } from '../theme/palette';

// ---------------------------------------------------------------------------
// DADOS MOCK (Fase 1).
// Mais à frente, estes dados virão da API pública do módulo afsys_inscricoes,
// resolvidos pelo tenant do cliente. A troca acontece apenas na camada de
// serviço (src/services), sem alterar componentes nem páginas.
// Campos marcados com ph:true são placeholders a confirmar com o cliente.
// ---------------------------------------------------------------------------

export const MOCK_EVENTOS: Evento[] = [
  {
    id: 1,
    slug: 'garcon-cross-2026',
    titulo: 'Garçon Cross 2026',
    tituloPoster: 'Garçon\nCross',
    kicker: 'Esporte · Confraternização',
    edicao: '4ª edição · Corrida de garçons',
    descricao:
      'A corrida de quem equilibra pressa e precisão todos os dias. Bandeja na mão — e que vença quem chega primeiro sem derramar.',
    status: 'aberto',
    cor: 'lime',
    metas: [
      { k: 'Inscrições', v: '01/06 — 31/07' },
      { k: 'Prova', v: '13 set 2026', ph: true },
      { k: 'Local', v: 'Ribeirão Preto', ph: true },
    ],
    goLabel: 'Ver e inscrever-se',
    detalhe: {
      lead:
        'A corrida de quem equilibra pressa e precisão todos os dias — bandeja na mão, cidade aos pés.',
      sobre: [
        'O Garçon Cross celebra quem faz a hospitalidade da cidade acontecer. Garçons e garçonetes percorrem o trajeto carregando a bandeja com garrafa e taça — vence quem cruza a linha primeiro, com elegância e sem derramar uma gota.',
        'Mais que uma prova esportiva, é um dia de confraternização da categoria, aberto a profissionais de hotéis, bares e restaurantes de toda a região.',
      ],
      resumo: [
        { k: 'Inscrições', v: '01/06 – 31/07' },
        { k: 'Prova', v: '13 set 2026', ph: true },
        { k: 'Local', v: 'Ribeirão Preto', ph: true },
        { k: 'Categorias', v: 'Masc · Fem · Equipes' },
        { k: 'Valor', v: 'A definir', ph: true },
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
    id: 2,
    slug: 'dia-dos-pais',
    titulo: 'Dia dos Pais',
    tituloPoster: 'Dia dos\nPais',
    kicker: 'Comemorativo',
    descricao:
      'Ação especial para os pais da categoria. Abertura das inscrições em breve.',
    status: 'em_breve',
    cor: 'cyan',
    metas: [
      { k: 'Inscrições', v: 'A definir', ph: true },
      { k: 'Previsão', v: 'Agosto', ph: true },
    ],
    goLabel: 'Aguarde a abertura',
  },
  {
    id: 3,
    slug: 'sorteio-anual',
    titulo: 'Sorteio Anual',
    tituloPoster: 'Sorteio\nAnual',
    kicker: 'Benefício do associado',
    descricao:
      'O sorteio de fim de ano para os associados em dia. Detalhes a divulgar.',
    status: 'em_breve',
    cor: 'amber',
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

export const MOCK_SITE_CONFIG: SiteConfig = {
  tenant: 'hoteleirorp',
  nome: 'Sindicato da Categoria',
  subtitulo: 'Hotéis · Bares · Restaurantes',
  marca: 'S',
  ano: '2026',
  theme: THEME_FESTIVAL,
  contato: {
    endereco: 'Endereço do sindicato',
    whatsapp: 'Contato / WhatsApp',
  },
  stats: [
    { n: '4', l: 'eventos em 2026' },
    { n: '1', l: 'com inscrição aberta' },
    { n: '+1,5 mil', l: 'trabalhadores na base', ph: true },
    { n: '100%', l: 'inscrição online' },
  ],
};
