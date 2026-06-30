import type { Evento } from '../types';
import type {
  InscricaoForm,
  CpfCheckResult,
  SubmitResult,
  StatusInscricao,
} from '../types/inscricao';
import { onlyDigits } from '../lib/validators';

// ---------------------------------------------------------------------------
// SERVIÇO DE INSCRIÇÃO
//
// Hoje é mock. Na fase de integração, as duas funções abaixo passam a falar
// com o endpoint público do módulo (que, no servidor, faz a checagem de CPF,
// o enriquecimento na base AFSYS e a gravação — sem expor tokens no browser).
// ---------------------------------------------------------------------------

// Gera um protocolo no padrão {PREFIXO}-{ANO}-{4 dígitos}. Apenas para o mock;
// na integração, o protocolo é gerado no servidor.
export function gerarProtocolo(prefixo = 'GC'): string {
  const ano = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `${prefixo}-${ano}-${seq}`;
}

// Regra de status idêntica ao fluxo do Typebot:
//  - sem CNPJ                  => PENDENCIA CNPJ
//  - com CNPJ e sem holerite   => PENDENTE HOLERITE
//  - com CNPJ e com holerite   => INSCRITO
export function calcularStatus(form: InscricaoForm): StatusInscricao {
  if (form.temCnpj === 'Não') return 'PENDENCIA CNPJ';
  if (form.possuiHolerite === 'Não') return 'PENDENTE HOLERITE';
  return 'INSCRITO';
}

// Checagem de CPF. Mock: retorna "não encontrado" (segue o cadastro).
// Integração: GET ao endpoint público -> { found, status, protocolo, ...enriquecimento }.
export async function checarCpf(cpf: string): Promise<CpfCheckResult> {
  const limpo = onlyDigits(cpf);
  await new Promise((r) => setTimeout(r, 500));
  // Mock fixo. (Para testar o caminho "já inscrito", trocar found para true.)
  void limpo;
  return { found: false };
}

// Monta o payload no formato exato esperado pelo módulo afsys_inscricoes.
// Os campos *_AFSYS e os de data/registro são anexados pelo backend na
// integração; aqui ficam só os coletados + os derivados (status/protocolo).
export function montarPayload(
  form: InscricaoForm,
  status: StatusInscricao,
  protocolo: string
): Record<string, string> {
  return {
    CPF: onlyDigits(form.cpf),
    NOME_COMPLETO: form.nomeCompleto.trim(),
    LGPD: form.lgpd ? 'Autorizo' : 'Não Autorizo',
    QUER_SE_SINDICALIZAR: form.querSindicalizar || '',
    TRABALHADOR_TEM_CNPJ: form.temCnpj || '',
    CNPJ_TRABALHADOR: form.temCnpj === 'Sim' ? onlyDigits(form.cnpj) : '',
    EMPRESA_NOME: form.temCnpj === 'Sim' ? form.empresaNome.trim() : '',
    TRABALHADOR_CIDADE: form.cidade.trim(),
    WHATSAPP: onlyDigits(form.whatsapp),
    POSSUI_HOLERITE: form.possuiHolerite || '',
    ENVIO_HOLERITE: form.holeriteNome || '',
    STATUS: status,
    PROTOCOLO: protocolo,
  };
}

// Envia a inscrição. Mock: calcula status, gera protocolo e resolve.
// Integração: POST multipart (com a imagem do holerite) ao endpoint público.
export async function submitInscricao(
  form: InscricaoForm,
  _evento: Evento
): Promise<SubmitResult> {
  const status = calcularStatus(form);
  const protocolo = gerarProtocolo('GC');
  const payload = montarPayload(form, status, protocolo);

  // Mock: apenas registra o payload que seria enviado.
  // eslint-disable-next-line no-console
  console.log('[mock submitInscricao] payload:', payload);

  await new Promise((r) => setTimeout(r, 900));
  return { protocolo, status };
}
