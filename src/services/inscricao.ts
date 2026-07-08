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
// Fala com o endpoint público do módulo afsys_inscricoes (rotas sob publico/,
// isentas de CSRF, protegidas por Turnstile). O servidor faz a checagem de CPF,
// o enriquecimento na base AFSYS, valida MIME/tamanho do arquivo, recalcula o
// status e gera o protocolo — por isso confiamos na resposta do servidor.
//
// Erros são lançados com a mensagem = código do backend (ex.: 'turnstile_falhou',
// 'inscricoes_encerradas'), para que a página exiba a mensagem apropriada.
// ---------------------------------------------------------------------------

// Regra de status local (só para exibição otimista; o servidor é a fonte da
// verdade e devolve o status final).
//  - sem CNPJ                  => PENDENCIA CNPJ
//  - com CNPJ e sem holerite   => PENDENTE HOLERITE
//  - com CNPJ e com holerite   => INSCRITO
export function calcularStatus(form: InscricaoForm): StatusInscricao {
  if (form.temCnpj === 'Não') return 'PENDENCIA CNPJ';
  if (form.possuiHolerite === 'Não') return 'PENDENTE HOLERITE';
  return 'INSCRITO';
}

// Checagem de CPF — etapa [1].
// POST publico/checar_cpf/{slug} com { CPF (maiúsculo), turnstile_token }.
// O servidor limpa a máscara internamente; enviamos só os dígitos.
export async function checarCpf(
  cpf: string,
  slug: string,
  turnstileToken: string
): Promise<CpfCheckResult> {
  const url = `${API_BASE}/afsys_inscricoes/publico/checar_cpf/${slug}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CPF: onlyDigits(cpf), turnstile_token: turnstileToken }),
  });

  let data: {
    ok?: boolean;
    ja_inscrito?: boolean;
    pendencia?: 'cnpj' | 'holerite' | null;
    passo?: number;
    id?: number;
    protocolo?: string;
    data_inscricao?: string | null;
    error?: string;
  } = {};
  try {
    data = await res.json();
  } catch {
    throw new Error('resposta_invalida');
  }

  if (!data.ok) {
    // cpf_invalido, turnstile_falhou, evento_nao_encontrado, method_not_allowed…
    throw new Error(data.error || 'checar_falhou');
  }

  // Inscrição completa (INSCRITO) → bloqueia com a tela "já inscrito".
  if (data.ja_inscrito) {
    return {
      found: true,
      protocolo: data.protocolo,
      dataInscricao: data.data_inscricao ?? null,
    };
  }

  // Inscrição existente porém pendente (cnpj/holerite) → retoma o wizard no
  // passo que falta. A navegação é decidida por `pendencia` (semântica), não
  // pelo índice `passo` do backend (que é 1-indexado).
  if (data.pendencia === 'cnpj' || data.pendencia === 'holerite') {
    return {
      found: false,
      pendencia: data.pendencia,
      passo: data.passo,
      id: data.id,
      protocolo: data.protocolo,
      dataInscricao: data.data_inscricao ?? null,
    };
  }

  return { found: false };
}

// Monta o corpo (multipart) no formato esperado pelo módulo afsys_inscricoes.
// Os campos *_AFSYS e os de data/registro são anexados pelo servidor; aqui vão
// só os coletados. Os nomes NÃO podem ser renomeados (o backend lê $_POST com
// exatamente estes nomes).
function montarCampos(form: InscricaoForm): Record<string, string> {
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
    STATUS: calcularStatus(form),
    PROTOCOLO: '', // gerado no servidor; enviamos vazio
  };
}

// Payload reduzido para COMPLETAR uma inscrição pendente: envia só o CPF (chave
// de localização) + os campos do passo que faltava. O backend preserva o resto
// da inscrição original (nome, whatsapp, cidade, consentimento LGPD etc. ficam
// blindados no update) e recalcula status/protocolo.
function montarCamposPendencia(
  form: InscricaoForm,
  tipo: 'cnpj' | 'holerite'
): Record<string, string> {
  const base: Record<string, string> = { CPF: onlyDigits(form.cpf) };
  if (tipo === 'cnpj') {
    base.TRABALHADOR_TEM_CNPJ = form.temCnpj || '';
    base.CNPJ_TRABALHADOR = form.temCnpj === 'Sim' ? onlyDigits(form.cnpj) : '';
    base.EMPRESA_NOME = form.temCnpj === 'Sim' ? form.empresaNome.trim() : '';
    // Fluxo cnpj é ENCADEADO (CNPJ → Holerite): o holerite também é coletado
    // agora, então vai no payload. O backend só marca INSCRITO com os DOIS
    // (possui_cnpj=1 E possui_holerite=1); sem estes campos ficaria PENDENTE HOLERITE.
    base.POSSUI_HOLERITE = form.possuiHolerite || '';
    base.ENVIO_HOLERITE = form.holeriteNome || '';
  } else {
    base.POSSUI_HOLERITE = form.possuiHolerite || '';
    base.ENVIO_HOLERITE = form.holeriteNome || '';
  }
  return base;
}

// Submit final — multipart/form-data. O arquivo do holerite vai no campo `file`
// e só é anexado quando "Possui holerite? = Sim" E o usuário anexou algo válido.
// Não definimos Content-Type manualmente: o browser inclui o boundary correto.
// Quando `completando` é informado, envia o payload mínimo (só o que falta).
export async function submitInscricao(
  form: InscricaoForm,
  evento: Evento,
  turnstileToken: string,
  completando?: 'cnpj' | 'holerite' | null
): Promise<SubmitResult> {
  const fd = new FormData();
  const campos = completando ? montarCamposPendencia(form, completando) : montarCampos(form);
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);

  fd.append('turnstile_token', turnstileToken);
  fd.append('website', ''); // honeypot — deve permanecer SEMPRE vazio

  if (form.possuiHolerite === 'Sim' && form.holeriteArquivo) {
    fd.append('file', form.holeriteArquivo, form.holeriteArquivo.name);
  }

  const url = `${API_BASE}/afsys_inscricoes/publico/submit/${evento.slug}`;

  const res = await fetch(url, { method: 'POST', body: fd });

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
    // validacao, turnstile_falhou, inscricoes_encerradas,
    // evento_nao_encontrado, insert_failed…
    throw new Error(data.error || 'submit_falhou');
  }

  // Protocolo vem pronto do servidor (pode ser 'GC-…', 'INSC-…' ou até 'OK' no
  // caso do honeypot). O front apenas exibe — não formata nem presume o padrão.
  return {
    protocolo: data.protocolo || '',
    status: (data.status as StatusInscricao) || 'INSCRITO',
    jaInscrito: !!data.ja_inscrito,
  };
}
