import type {
  ChaveEtapa,
  ContatoPreferido,
  CriancaForm,
  InscricaoForm,
  SimNao,
} from '../types/inscricao';
import {
  CHAVES_ETAPA,
  FAIXAS_CRIANCA,
  MAX_CRIANCAS,
  VINCULOS_CRIANCA,
  novoForm,
} from '../types/inscricao';

// ---------------------------------------------------------------------------
// RASCUNHO DA INSCRIÇÃO (sessionStorage)
//
// Celular descarta aba em segundo plano para liberar memória: quem sai para
// buscar o código no app de e-mail volta com a página recarregada do zero. Sem
// isto todo o preenchimento se perde — e justamente no último passo, depois de
// todo o esforço.
//
// sessionStorage, NÃO localStorage: o rascunho tem CPF, nome, contatos e nomes
// de crianças, e o portal é aberto de celular emprestado e de computador
// público. sessionStorage morre junto com a aba; localStorage deixaria esses
// dados no aparelho por tempo indeterminado.
//
// Nunca entram aqui:
//  - o código de verificação digitado (está no e-mail/WhatsApp da pessoa, que
//    redigita em segundos — não há ganho em guardar mais um dado sensível);
//  - o token do Turnstile (de uso único e com validade curta: guardá-lo só
//    renderia um token gasto na volta).
//
// Nada aqui pode quebrar o formulário: sessionStorage falha em modo privado,
// com a cota estourada ou em navegador restritivo, e nesses casos o wizard
// simplesmente volta a se comportar como antes — sem rascunho.
// ---------------------------------------------------------------------------

const CHAVE = 'portal-eventos:inscricao';

// Sobe quando o formato muda. Rascunho de outra versão é descartado inteiro, em
// vez de restaurado pela metade.
const VERSAO = 1;

export interface RascunhoInscricao {
  slug: string;              // evento a que o rascunho pertence
  etapa: ChaveEtapa;         // onde a pessoa parou (chave, não índice)
  form: InscricaoForm;       // `holeriteArquivo` é sempre null aqui (ver abaixo)
  // O File do holerite não é serializável e não atravessa o recarregamento.
  // Guardamos só se HAVIA um anexo, para pedir de novo em vez de deixar a
  // inscrição seguir dizendo que tem holerite quando o arquivo se perdeu.
  arquivoHolerite: boolean;
  // Derivados da checagem de CPF. As etapas do wizard são MONTADAS a partir
  // deles (sindicalizado e isentoHolerite tiram etapas da régua), então sem
  // eles a etapa restaurada apontaria para o passo errado.
  cpfChecado: string;
  nomeAfsys: string;
  contatosMasc: { whatsapp: string; email: string };
  sindicalizado: boolean;
  isentoHolerite: boolean;
  canaisOtp: ContatoPreferido[];
  semEmail: boolean;
  completando: 'cnpj' | 'holerite' | null;
  pendProtocolo: string;
}

// Grava o rascunho. Devolve false quando o navegador não deixa escrever — quem
// chama usa isso para não prometer na tela algo que não está acontecendo.
export function salvarRascunho(rascunho: RascunhoInscricao): boolean {
  try {
    // O File sai do payload: JSON.stringify o transformaria em {} e a restauração
    // acharia que ainda existe um anexo.
    const { holeriteArquivo: _semArquivo, ...form } = rascunho.form;
    sessionStorage.setItem(CHAVE, JSON.stringify({ ...rascunho, v: VERSAO, form }));
    return true;
  } catch {
    return false;
  }
}

export function limparRascunho(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Sem storage não há o que limpar.
  }
}

// Lê o rascunho do evento `slug`. Devolve null — e apaga o que estava lá — para
// rascunho de outro evento, de outro formato ou corrompido.
export function lerRascunho(slug: string): RascunhoInscricao | null {
  let bruto: unknown;
  try {
    const cru = sessionStorage.getItem(CHAVE);
    if (!cru) return null;
    bruto = JSON.parse(cru);
  } catch {
    return null;
  }

  const rascunho = validar(bruto, slug);
  if (!rascunho) limparRascunho();
  return rascunho;
}

// ---------------------------------------------------------------------------
// Leitura defensiva: o que veio do storage é texto de origem não confiável (a
// pessoa pode editá-lo, e uma versão anterior do portal pode tê-lo escrito).
// Cada campo é reconstruído a partir de `novoForm()`, então o formulário sai
// daqui sempre completo, mesmo que o rascunho esteja pela metade.
// ---------------------------------------------------------------------------

function eObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function simNao(v: unknown): SimNao | '' {
  return v === 'Sim' || v === 'Não' ? v : '';
}

function validar(bruto: unknown, slug: string): RascunhoInscricao | null {
  if (!eObjeto(bruto)) return null;
  if (bruto.v !== VERSAO) return null;
  // Rascunho de outro evento não serve: as etapas e os canais são por evento.
  if (texto(bruto.slug) !== slug || slug === '') return null;

  const etapa = texto(bruto.etapa) as ChaveEtapa;
  if (!CHAVES_ETAPA.includes(etapa)) return null;
  if (!eObjeto(bruto.form)) return null;

  const contatos = eObjeto(bruto.contatosMasc) ? bruto.contatosMasc : {};
  const completando =
    bruto.completando === 'cnpj' || bruto.completando === 'holerite' ? bruto.completando : null;

  return {
    slug,
    etapa,
    form: lerForm(bruto.form),
    arquivoHolerite: bruto.arquivoHolerite === true,
    cpfChecado: texto(bruto.cpfChecado),
    nomeAfsys: texto(bruto.nomeAfsys),
    contatosMasc: { whatsapp: texto(contatos.whatsapp), email: texto(contatos.email) },
    sindicalizado: bruto.sindicalizado === true,
    isentoHolerite: bruto.isentoHolerite === true,
    canaisOtp: lerCanais(bruto.canaisOtp),
    semEmail: bruto.semEmail === true,
    completando,
    pendProtocolo: texto(bruto.pendProtocolo),
  };
}

function lerForm(bruto: Record<string, unknown>): InscricaoForm {
  const base = novoForm();
  return {
    ...base,
    lgpd: bruto.lgpd === true,
    cpf: texto(bruto.cpf),
    nomeCompleto: texto(bruto.nomeCompleto),
    whatsapp: texto(bruto.whatsapp),
    email: texto(bruto.email),
    contatoPreferido: bruto.contatoPreferido === 'email' ? 'email' : 'whatsapp',
    cidade: texto(bruto.cidade),
    criancas: Array.isArray(bruto.criancas) ? lerCriancas(bruto.criancas) : base.criancas,
    querSindicalizar: simNao(bruto.querSindicalizar),
    temCnpj: simNao(bruto.temCnpj),
    cnpj: texto(bruto.cnpj),
    empresaNome: texto(bruto.empresaNome),
    possuiHolerite: simNao(bruto.possuiHolerite),
    // O arquivo ficou para trás no recarregamento: quem restaura anexa de novo,
    // e o nome não pode sobreviver sozinho (o submit mandaria ENVIO_HOLERITE
    // com um arquivo que não existe mais).
    holeriteArquivo: null,
    holeriteNome: '',
  };
}

function lerCriancas(bruto: unknown[]): CriancaForm[] {
  return bruto.slice(0, MAX_CRIANCAS).map((c) => {
    const item = eObjeto(c) ? c : {};
    const vinculo = texto(item.vinculo) as CriancaForm['vinculo'];
    const faixa = texto(item.faixaEtaria) as CriancaForm['faixaEtaria'];
    return {
      nome: texto(item.nome),
      // Fora da lista fechada (rascunho adulterado ou de uma versão com outros
      // rótulos) vira vazio: a pessoa escolhe de novo antes de avançar.
      vinculo: vinculo !== '' && VINCULOS_CRIANCA.includes(vinculo) ? vinculo : '',
      faixaEtaria: faixa !== '' && FAIXAS_CRIANCA.includes(faixa) ? faixa : '',
    };
  });
}

function lerCanais(bruto: unknown): ContatoPreferido[] {
  const canais: ContatoPreferido[] = ['whatsapp', 'email'];
  if (!Array.isArray(bruto)) return canais;
  const lidos = canais.filter((c) => bruto.includes(c));
  return lidos.length > 0 ? lidos : canais;
}
