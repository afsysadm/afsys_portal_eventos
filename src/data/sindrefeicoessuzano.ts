import type { Evento, SiteConfig } from '../types';
import { THEME_FESTIVAL } from '../theme/palette';

// ---------------------------------------------------------------------------
// DADOS DO TENANT — SINDIREFEIÇÕES (Suzano/GRU e Região)
// Campos marcados com ph:true são placeholders a confirmar com o cliente.
// ---------------------------------------------------------------------------

export const EVENTOS: Evento[] = [
  // TESTE — evento provisório cadastrado no Perfex, será substituído pelo
  // definitivo ("Dia das Crianças"). Para trocar: ajuste slug/título/metas
  // desta entrada, mantendo o mesmo slug do backend.
  {
    id: 2,
    slug: 'dia-das-criancas',
    titulo: 'Dia das Crianças',
    tituloPoster: 'Dia das\nCrianças',
    kicker: 'Comemorativo · Crianças',
    edicao: 'Sorteio de presentes',
    descricao:
      'O sindicato sorteia presentes de Dia das Crianças para os filhos e netos da categoria. Inscreva as crianças e acompanhe o sorteio virtual.',
    status: 'aberto',
    cor: 'emerald',
    // Este evento inscreve as crianças (filhos/netos) do trabalhador: o wizard
    // ganha a etapa de dependentes. Corridas e homenagens do mesmo sindicato
    // não recebem a flag.
    pedeCriancas: true,
    metas: [
      { k: 'Inscrições', v: '05/09/2026 — 25/09/2026' },
      { k: 'Sorteio', v: '07 out 2026' },
      { k: 'Local', v: 'Suzano/SP', ph: true },
    ],
    goLabel: 'Ver e inscrever-se',
    detalhe: {
      lead:
        'Presentes de Dia das Crianças para os filhos e netos de quem alimenta a cidade.',
      sobre: [
        'O sindicato sorteia presentes de Dia das Crianças para os filhos e netos da categoria. A inscrição é feita pelo responsável, aqui mesmo no portal, e o sorteio é transmitido virtualmente.',
        'A ação é aberta aos trabalhadores em refeições coletivas, cozinhas industriais, merenda escolar e comissária aérea da base do sindicato.',
      ],
      resumo: [
        { k: 'Inscrições', v: '05/09/2026 — 25/09/2026' },
        { k: 'Sorteio', v: '07 out 2026' },
        { k: 'Local', v: 'Suzano/SP', ph: true },
        { k: 'Categorias', v: '0 a 4 · 5 a 9 · 10 a 15 anos' },
        { k: 'Valor', v: 'Gratuito para associados' },
      ],
      passos: [
        { titulo: 'Seus dados', desc: 'Nome e CPF.' },
        { titulo: 'Contato', desc: 'WhatsApp e e-mail.' },
        { titulo: 'Vínculo', desc: 'Onde trabalha e categoria.' },
        { titulo: 'Confirmação', desc: 'Você recebe o protocolo.' },
      ],
    },
  },
];

export const SITE_CONFIG: SiteConfig = {
  tenant: 'sindrefeicoessuzano',
  nome: 'Sindirefeições',
  subtitulo: 'Refeições coletivas · Cozinhas industriais · Comissária aérea',
  marca: 'S',
  ano: '2026',
  theme: THEME_FESTIVAL,
  hero: {
    kicker: 'Eventos do sindicato · 2026',
    titulo: 'Eventos e benefícios para quem alimenta a cidade.',
    subtitulo: 'Sorteios, homenagens e ações do sindicato. Inscrição online, na hora, sem filas.',
  },
  sobre: {
    titulo: 'Quem alimenta a cidade merece ser celebrado.',
    texto:
      'O sindicato promove ações e sorteios para reconhecer os trabalhadores em refeições coletivas, cozinhas industriais, merenda escolar e comissária aérea. Todas as inscrições, num só lugar.',
  },
  contato: {
    endereco: 'Rua Amélia Guerra, 147 — Vila Amorim, Suzano/SP',
    whatsapp: '(11) 4746-2326',
  },
  stats: [
    { n: '1', l: 'evento em 2026' },
    { n: '1', l: 'com inscrição aberta' },
    { n: '+3,5 mil', l: 'trabalhadores na base', ph: true },
    { n: '100%', l: 'inscrição online' },
  ],
};
