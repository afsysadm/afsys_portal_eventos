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

// Valida a lista de crianças. Devolve os erros indexados por posição+campo
// (`crianca_0_nome`), no mesmo formato que o wizard usa. Fica aqui, junto dos
// limites que ela cobra, porque a etapa do wizard E a edição pela consulta
// aplicam exatamente as mesmas regras.
export function validarCriancas(criancas: CriancaForm[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (criancas.length === 0) {
    e.criancas = 'Cadastre pelo menos uma criança.';
  }
  criancas.forEach((c, i) => {
    const nome = c.nome.trim();
    if (nome.length < NOME_CRIANCA_MIN || nome.length > NOME_CRIANCA_MAX) {
      e[`crianca_${i}_nome`] = `Informe o nome da criança (de ${NOME_CRIANCA_MIN} a ${NOME_CRIANCA_MAX} caracteres).`;
    }
    if (!c.vinculo) e[`crianca_${i}_vinculo`] = 'Selecione o vínculo.';
    if (!c.faixaEtaria) e[`crianca_${i}_faixaEtaria`] = 'Selecione a faixa etária.';
  });
  return e;
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
  // Sindicalizado na base: o vínculo empregatício e a empresa já são conhecidos,
  // então o wizard pula as etapas de Contribuinte e Empresa. false para
  // qualquer outro status (ou CPF fora da base).
  sindicalizado?: boolean;
  cnpjAfsys?: string;    // pode vir vazio mesmo com sindicalizado === true
  empresaAfsys?: string; // idem
  // Empresa na lista de isentos mantida pelo sindicato: o wizard não pede o
  // holerite. Ausente ou false => fluxo atual. Nada disso aparece na tela.
  isentoHolerite?: boolean;
}

// ----- Verificação por código (OTP) -----
// Etapa final do wizard: a inscrição só é enviada depois que o código chega no
// canal escolhido e é validado pelo servidor.
export const OTP_TAMANHO = 6;

export interface EnviarOtpResult {
  validadeMin: number; // minutos de validade informados pelo servidor
}

// O validar devolve resultado em vez de lançar: o erro `codigo_invalido` traz
// junto quantas tentativas restam, e essa informação vai para a tela.
export interface ValidarOtpResult {
  ok: boolean;
  erro?: string;
  restantes?: number;
}

// ----- Consulta/edição da inscrição existente -----
// Espelha o que `publico/ver_inscricao` devolve. O CPF vem MASCARADO pelo
// servidor (ex.: "123.***.***-01") — é assim que exibimos.
export interface InscricaoConsulta {
  protocolo: string;
  status: string;
  nomeCompleto: string;
  cpf: string;
  whatsapp: string;
  email: string;
  cidade: string;
  empresa: string;
  dataInscricao: string;
  criancas: CriancaForm[];
}

export interface VerInscricaoResult {
  // false quando o período de inscrição terminou: a tela fica só de leitura.
  editavel: boolean;
  inscricao: InscricaoConsulta;
}

export interface SolicitarConsultaResult {
  canal: ContatoPreferido | '';
  validadeMin: number;
}

export interface SubmitResult {
  protocolo: string;
  status: StatusInscricao;
  jaInscrito?: boolean;
}
