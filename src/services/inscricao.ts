import type { Evento } from '../types';
import type {
  InscricaoForm,
  CpfCheckResult,
  SubmitResult,
  StatusInscricao,
} from '../types/inscricao';
import { onlyDigits } from '../lib/validators';
import { API_BASE } from '../config';

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

// Envia a inscrição ao endpoint público do módulo (porta 2), incluindo o
// token do Turnstile. O backend valida (Turnstile, CPF, dedup), recalcula o
// status e gera o protocolo — por isso confiamos na resposta do servidor.
export async function submitInscricao(
  form: InscricaoForm,
  evento: Evento,
  turnstileToken: string
): Promise<SubmitResult> {
  // O protocolo é gerado no servidor; enviamos vazio (o backend ignora).
  const payload = montarPayload(form, calcularStatus(form), '');
  payload['turnstile_token'] = turnstileToken;
  payload['website'] = ''; // honeypot (deve permanecer vazio)

  const url = `${API_BASE}/afsys_inscricoes/publico/submit/${evento.slug}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: {
    ok?: boolean;
    protocolo?: string;
    status?: string;
    ja_inscrito?: boolean;
    error?: string;
  } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error('resposta_invalida');
  }

  if (!data.ok) {
    throw new Error(data.error || 'submit_falhou');
  }

  return {
    protocolo: data.protocolo || '',
    status: (data.status as StatusInscricao) || 'INSCRITO',
    jaInscrito: !!data.ja_inscrito,
  };
}
