// Tipos do fluxo de inscrição (wizard).
// As chaves do payload espelham exatamente o que o módulo afsys_inscricoes
// espera (ver services/inscricao.ts).

export type StatusInscricao = 'INSCRITO' | 'PENDENTE HOLERITE' | 'PENDENCIA CNPJ';
export type SimNao = 'Sim' | 'Não';

// Canal preferido para as notificações. O valor viaja em minúsculas, como o
// backend espera em CONTATO_PREFERIDO.
export type ContatoPreferido = 'whatsapp' | 'email';

// ----- Crianças/dependentes (eventos com `pedeCriancas`) -----
// Os textos abaixo são enviados ao backend EXATAMENTE como estão: a validação
// server-side compara com esta lista fechada.
export type VinculoCrianca = 'Filho(a)' | 'Neto(a)' | 'Outro(a)';
export type FaixaEtariaCrianca = '0 a 4 anos' | '5 a 9 anos' | '10 a 15 anos';

export const VINCULOS_CRIANCA: VinculoCrianca[] = ['Filho(a)', 'Neto(a)', 'Outro(a)'];
export const FAIXAS_CRIANCA: FaixaEtariaCrianca[] = ['0 a 4 anos', '5 a 9 anos', '10 a 15 anos'];

export const MAX_CRIANCAS = 10;
export const NOME_CRIANCA_MIN = 2;
export const NOME_CRIANCA_MAX = 120;

export interface CriancaForm {
  nome: string;
  vinculo: VinculoCrianca | '';
  faixaEtaria: FaixaEtariaCrianca | '';
}

export function novaCrianca(): CriancaForm {
  return { nome: '', vinculo: '', faixaEtaria: '' };
}

export interface InscricaoForm {
  lgpd: boolean;              // aceite LGPD (true = "Autorizo")
  cpf: string;               // mascarado: 000.000.000-00
  nomeCompleto: string;
  whatsapp: string;          // mascarado: (00) 00000-0000
  email: string;
  contatoPreferido: ContatoPreferido;
  cidade: string;
  // Só é enviado nos eventos com `pedeCriancas` (ver services/inscricao.ts).
  criancas: CriancaForm[];
  querSindicalizar: SimNao | '';
  temCnpj: SimNao | '';
  cnpj: string;              // mascarado: 00.000.000/0000-00
  empresaNome: string;
  possuiHolerite: SimNao | '';
  holeriteArquivo: File | null;
  holeriteNome: string;      // nome do arquivo (exibição/mock)
}

export function novoForm(): InscricaoForm {
  return {
    lgpd: false,
    cpf: '',
    nomeCompleto: '',
    whatsapp: '',
    email: '',
    // WhatsApp já é obrigatório no wizard, então é o padrão: a preferência
    // começa preenchida e nenhum fluxo existente ganha um campo bloqueante.
    contatoPreferido: 'whatsapp',
    cidade: '',
    // Começa com uma criança em branco — é o caso mais comum.
    criancas: [novaCrianca()],
    querSindicalizar: '',
    temCnpj: '',
    cnpj: '',
    empresaNome: '',
    possuiHolerite: '',
    holeriteArquivo: null,
    holeriteNome: '',
  };
}

// Resultado da checagem de CPF (na integração, virá do backend:
// busca de inscrição existente + enriquecimento na base AFSYS).
export interface CpfCheckResult {
  found: boolean;                 // ja_inscrito === true (INSCRITO → bloqueia)
  pendencia?: 'cnpj' | 'holerite' | null; // inscrição existente porém incompleta
  passo?: number;                 // passo sugerido pelo backend (1-indexado; não usado na navegação)
  id?: number;                    // id da inscrição existente
  status?: string;                // status da inscrição existente (dedup no submit)
  protocolo?: string;             // protocolo existente (se found/pendência)
  dataInscricao?: string | null;  // data da inscrição existente (pode vir null)
  // Nome do trabalhador na base do sindicato — ÚNICO dado pessoal devolvido
  // pela checagem (qualquer um pode digitar um CPF alheio). Vem vazio quando o
  // CPF não está na base ou a consulta falha.
  nomeAfsys?: string;
  // Contatos do cadastro, SEMPRE mascarados pelo backend (ex.: "(11) *****1556",
  // "abi****@gmail.com"). O valor completo nunca trafega. Vêm vazios quando a
  // base não tem aquele contato ou o CPF não está na base. Servem só para a
  // pessoa reconhecer onde pode receber o código — a conferência com o dado
  // real é do servidor.
  whatsappMasc?: string;
  emailMasc?: string;
}

export interface SubmitResult {
  protocolo: string;
  status: StatusInscricao;
  jaInscrito?: boolean;
}
