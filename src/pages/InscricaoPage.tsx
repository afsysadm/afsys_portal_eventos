import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Evento } from '../types';
import type { InscricaoForm, SubmitResult, CpfCheckResult, CriancaForm } from '../types/inscricao';
import {
  novoForm,
  novaCrianca,
  VINCULOS_CRIANCA,
  FAIXAS_CRIANCA,
  MAX_CRIANCAS,
  NOME_CRIANCA_MIN,
  NOME_CRIANCA_MAX,
} from '../types/inscricao';
import { getEvento } from '../services/events';
import { inscricoesAbertas } from '../services/statusPortal';
import { checarCpf, submitInscricao } from '../services/inscricao';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  isValidEmail,
  validarHolerite,
} from '../lib/validators';
import { Nav } from '../components/Nav';
import { Stepper } from '../components/inscricao/Stepper';
import { Turnstile } from '../components/inscricao/Turnstile';
import { TextField, ChoiceField, FileField } from '../components/inscricao/fields';

type Fase = 'form' | 'declined' | 'already' | 'success';
type Errors = Record<string, string>;

// Etapas (CPF PRIMEIRO — antes da LGPD e de qualquer dado).
// Rótulos VISÍVEIS das etapas. "Contribuinte" é só o texto exibido — a etapa
// interna continua sendo S.SINDICAL e o campo do payload é QUER_SE_SINDICALIZAR.
//
// A etapa "Crianças" existe apenas nos eventos com `pedeCriancas`, e entra
// depois dos dados pessoais/contato e antes do vínculo empregatício. Rótulos e
// índices são montados juntos por `montarEtapas`: sem a flag, os índices ficam
// exatamente os de antes (o evento do hoteleiro não muda de numeração).
type ChaveEtapa =
  | 'CPF'
  | 'LGPD'
  | 'DADOS'
  | 'CRIANCAS'
  | 'SINDICAL'
  | 'EMPRESA'
  | 'HOLERITE'
  | 'REVISAO';

// A etapa de CPF é sempre a primeira, com ou sem a etapa de crianças.
const ETAPA_CPF = 0;

function montarEtapas(pedeCriancas: boolean): { steps: string[]; S: Record<ChaveEtapa, number> } {
  const steps = pedeCriancas
    ? ['CPF', 'Consentimento', 'Seus dados', 'Crianças', 'Contribuinte', 'Empresa', 'Holerite', 'Revisão']
    : ['CPF', 'Consentimento', 'Seus dados', 'Contribuinte', 'Empresa', 'Holerite', 'Revisão'];

  // Deslocamento aplicado a tudo que vem depois da etapa de crianças.
  const d = pedeCriancas ? 1 : 0;

  return {
    steps,
    S: {
      CPF: ETAPA_CPF,
      LGPD: 1,
      DADOS: 2,
      // Sem a etapa, -1 nunca casa com o `step` atual: ela não é renderizada,
      // não é validada e não aparece no Stepper.
      CRIANCAS: pedeCriancas ? 3 : -1,
      SINDICAL: 3 + d,
      EMPRESA: 4 + d,
      HOLERITE: 5 + d,
      REVISAO: 6 + d,
    },
  };
}

// Mensagens amigáveis por código de erro do backend.
const MSG_CHECAR: Record<string, string> = {
  cpf_invalido: 'CPF inválido. Confira os números digitados.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  evento_nao_encontrado: 'Evento não encontrado. Verifique o link e tente novamente.',
};
const MSG_SUBMIT: Record<string, string> = {
  inscricoes_encerradas: 'As inscrições para este evento foram encerradas.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  validacao: 'Alguns dados não passaram na validação. Revise as informações e tente novamente.',
  criancas_invalidas: 'Confira os dados das crianças e tente novamente.',
  evento_nao_encontrado: 'Evento não encontrado. Verifique o link e tente novamente.',
};

export function InscricaoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);
  // Janela de inscrições (status_portal do backend); null = ainda carregando.
  const [aberto, setAberto] = useState<boolean | null>(null);
  const [step, setStep] = useState(ETAPA_CPF);
  const [form, setForm] = useState<InscricaoForm>(novoForm());
  const [errors, setErrors] = useState<Errors>({});
  const [fase, setFase] = useState<Fase>('form');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [jaInscrito, setJaInscrito] = useState<CpfCheckResult | null>(null);

  // Modo "completar pendência": quando o CPF já tem inscrição incompleta, o
  // wizard retoma no passo que falta (cnpj → Empresa, holerite → Holerite) e o
  // submit envia só o que falta (ver services/inscricao.ts).
  const [completando, setCompletando] = useState<'cnpj' | 'holerite' | null>(null);
  const [pendProtocolo, setPendProtocolo] = useState('');

  // Turnstile: um token para checar_cpf (etapa CPF) e outro para o submit
  // (etapa Revisão). Ambos são de uso único, por isso são independentes.
  const [cpfToken, setCpfToken] = useState('');
  const [cpfResetKey, setCpfResetKey] = useState(0);
  const [erroCpf, setErroCpf] = useState('');
  const [submitToken, setSubmitToken] = useState('');
  const [submitResetKey, setSubmitResetKey] = useState(0);
  const [erroSubmit, setErroSubmit] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;
    let ativo = true;
    Promise.all([getEvento(slug), inscricoesAbertas(slug)]).then(([ev, ok]) => {
      if (!ativo) return;
      setEvento(ev);
      setAberto(ok);
    });
    return () => {
      ativo = false;
    };
  }, [slug]);

  const pedeCriancas = evento?.pedeCriancas === true;
  const { steps: STEPS, S } = useMemo(() => montarEtapas(pedeCriancas), [pedeCriancas]);

  const semCnpj = form.temCnpj === 'Não';
  const skipped = useMemo(() => (semCnpj ? [S.HOLERITE] : []), [semCnpj, S]);

  function set<K extends keyof InscricaoForm>(key: K, value: InscricaoForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  // ---- crianças/dependentes ----
  // Recebe um patch parcial (ex.: { nome: 'Ana' }) para alterar um campo de uma
  // criança sem tocar nas demais. Os erros são indexados por posição + campo.
  function setCrianca(i: number, patch: Partial<CriancaForm>) {
    setForm((f) => ({
      ...f,
      criancas: f.criancas.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
    const campos = Object.keys(patch);
    setErrors((e) => {
      const limpo = { ...e };
      for (const campo of campos) limpo[`crianca_${i}_${campo}`] = '';
      return limpo;
    });
  }

  function adicionarCrianca() {
    setForm((f) =>
      f.criancas.length >= MAX_CRIANCAS ? f : { ...f, criancas: [...f.criancas, novaCrianca()] }
    );
  }

  function removerCrianca(i: number) {
    setForm((f) => ({ ...f, criancas: f.criancas.filter((_, idx) => idx !== i) }));
    // Os erros são indexados por posição: remover no meio da lista deslocaria
    // as mensagens para a criança errada. Limpar é mais simples que remapear.
    setErrors({});
  }

  function renovarCpfTurnstile() {
    setCpfToken('');
    setCpfResetKey((k) => k + 1);
  }

  if (evento === undefined || aberto === null) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 22px', color: 'var(--muted)' }}>Carregando…</div>
      </div>
    );
  }
  if (evento === null) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 22px' }}>
          <h1 style={{ fontFamily: 'var(--display)', marginBottom: 16 }}>Evento não encontrado</h1>
          <button className="back" onClick={() => navigate('/')}>← Voltar aos eventos</button>
        </div>
      </div>
    );
  }

  // Acesso direto à URL do wizard com as inscrições fora do prazo: mostra o
  // desfecho no lugar do formulário (o backend também recusaria o submit).
  if (!aberto) {
    return (
      <Shell evento={evento}>
        <div className="wz-final">
          <div className="wz-final-ico">⏳</div>
          <h2>Inscrições encerradas</h2>
          <p>
            O prazo de inscrição deste evento terminou. Acompanhe o portal para as próximas
            oportunidades.
          </p>
          <button className="wz-btn" onClick={() => navigate(`/evento/${evento.slug}`)}>
            Voltar ao evento
          </button>
        </div>
      </Shell>
    );
  }

  // ---- validação por etapa ----
  function validar(): boolean {
    const e: Errors = {};
    if (step === S.CPF) {
      if (!isValidCPF(form.cpf)) e.cpf = 'Informe um CPF válido.';
    } else if (step === S.DADOS) {
      if (form.nomeCompleto.trim().length < 3) e.nomeCompleto = 'Informe seu nome completo.';
      if (!isValidPhone(form.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido com DDD.';
      // O e-mail é opcional, exceto para quem escolhe recebê-lo como canal
      // preferido. Preenchido, precisa ter formato válido.
      if (form.contatoPreferido === 'email' && form.email.trim() === '') {
        e.email = 'Informe seu e-mail para receber as notificações por lá.';
      } else if (form.email.trim() !== '' && !isValidEmail(form.email)) {
        e.email = 'Informe um e-mail válido.';
      }
      if (form.cidade.trim().length < 2) e.cidade = 'Informe sua cidade.';
    } else if (step === S.CRIANCAS) {
      if (form.criancas.length === 0) {
        e.criancas = 'Cadastre pelo menos uma criança.';
      }
      form.criancas.forEach((c, i) => {
        const nome = c.nome.trim();
        if (nome.length < NOME_CRIANCA_MIN || nome.length > NOME_CRIANCA_MAX) {
          e[`crianca_${i}_nome`] = `Informe o nome da criança (de ${NOME_CRIANCA_MIN} a ${NOME_CRIANCA_MAX} caracteres).`;
        }
        if (!c.vinculo) e[`crianca_${i}_vinculo`] = 'Selecione o vínculo.';
        if (!c.faixaEtaria) e[`crianca_${i}_faixaEtaria`] = 'Selecione a faixa etária.';
      });
    } else if (step === S.SINDICAL) {
      if (!form.querSindicalizar) e.querSindicalizar = 'Selecione uma opção.';
    } else if (step === S.EMPRESA) {
      if (!form.temCnpj) e.temCnpj = 'Selecione uma opção.';
      if (form.temCnpj === 'Sim') {
        if (!isValidCNPJ(form.cnpj)) e.cnpj = 'Informe um CNPJ válido.';
        if (form.empresaNome.trim().length < 2) e.empresaNome = 'Informe o nome da empresa.';
      }
    } else if (step === S.HOLERITE) {
      // Só a escolha Sim/Não é obrigatória. Responder "Sim" sem anexar NÃO
      // bloqueia o envio — o backend grava como PENDENTE HOLERITE.
      if (!form.possuiHolerite) e.possuiHolerite = 'Selecione uma opção.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function avancar() {
    if (!validar()) return;

    // Etapa CPF: consulta o backend antes de qualquer coleta de dados.
    if (step === S.CPF) {
      setErroCpf('');
      setBusy(true);
      try {
        const r = await checarCpf(form.cpf, evento!.slug, cpfToken);
        if (r.found) {
          // Inscrição completa (INSCRITO) → bloqueia.
          setJaInscrito(r);
          setFase('already');
          window.scrollTo(0, 0);
          return;
        }
        if (r.pendencia === 'cnpj' || r.pendencia === 'holerite') {
          // Inscrição pendente → retoma direto no passo que falta. O CPF já
          // está no form; o consentimento LGPD foi dado na inscrição original
          // (marcamos lgpd=true só por consistência local — não é reenviado).
          setCompletando(r.pendencia);
          setPendProtocolo(r.protocolo || '');
          setForm((f) => ({ ...f, lgpd: true }));
          setStep(r.pendencia === 'cnpj' ? S.EMPRESA : S.HOLERITE);
          window.scrollTo(0, 0);
          return;
        }
        setStep(S.LGPD); // novo CPF → segue para o consentimento
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        setErroCpf(MSG_CHECAR[code] || 'Não foi possível checar seu CPF agora. Tente novamente.');
        renovarCpfTurnstile(); // token foi consumido; renova o desafio
      } finally {
        setBusy(false);
      }
      return;
    }

    // Completar pendência (ENCADEADO): ordem natural CNPJ → Holerite → Inscrito.
    //  - pendência "cnpj": passo Empresa → Holerite → Revisão (os DOIS passos).
    //  - pendência "holerite": passo Holerite → Revisão (só o holerite).
    if (completando) {
      // Após o CNPJ (passo Empresa) ainda falta o holerite: NÃO pular para a Revisão.
      if (step === S.EMPRESA) {
        setStep(S.HOLERITE);
        return;
      }
      // Holerite preenchido (em ambas as pendências) → segue para a Revisão.
      if (step === S.HOLERITE) {
        setStep(S.REVISAO);
        return;
      }
    }

    // Empresa sem CNPJ → pula Holerite, vai direto à Revisão.
    if (step === S.EMPRESA && semCnpj) {
      setStep(S.REVISAO);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function voltar() {
    // Modo completar pendência (encadeado). Voltar percorre o inverso do avançar:
    //  cnpj:     Revisão → Holerite → Empresa → CPF (sai do modo)
    //  holerite: Revisão → Holerite → CPF (sai do modo)
    if (completando) {
      // Em ambas as pendências, o passo imediatamente antes da Revisão é o Holerite.
      if (step === S.REVISAO) {
        setStep(S.HOLERITE);
        return;
      }
      // Na pendência cnpj, o Holerite volta ao passo Empresa (CNPJ).
      if (completando === 'cnpj' && step === S.HOLERITE) {
        setStep(S.EMPRESA);
        return;
      }
      // Do primeiro passo da pendência, volta ao CPF e sai do modo completar.
      setCompletando(null);
      renovarCpfTurnstile();
      setStep(S.CPF);
      return;
    }

    // Da Revisão, se pulou holerite, volta para Empresa.
    if (step === S.REVISAO && semCnpj) {
      setStep(S.EMPRESA);
      return;
    }
    const alvo = Math.max(step - 1, 0);
    if (alvo === S.CPF) renovarCpfTurnstile(); // token anterior já foi usado
    setStep(alvo);
  }

  function escolherHolerite(file: File | null) {
    if (file) {
      const erro = validarHolerite(file);
      if (erro) {
        setErrors((e) => ({ ...e, holerite: erro }));
        set('holeriteArquivo', null);
        set('holeriteNome', '');
        return;
      }
    }
    set('holeriteArquivo', file);
    set('holeriteNome', file ? file.name : '');
    setErrors((e) => ({ ...e, holerite: '' }));
  }

  async function enviar() {
    setErroSubmit('');
    setBusy(true);
    try {
      const r = await submitInscricao(form, evento!, submitToken, completando);
      if (r.jaInscrito) {
        setJaInscrito({ found: true, protocolo: r.protocolo, status: r.status });
        setFase('already');
      } else {
        setResult(r);
        setFase('success');
      }
      window.scrollTo(0, 0);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setErroSubmit(
        MSG_SUBMIT[code] ||
          'Não foi possível enviar sua inscrição agora. Verifique a conexão e tente novamente.'
      );
      // Token de submit foi consumido: renova o desafio para o reenvio.
      setSubmitToken('');
      setSubmitResetKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  // ---------- telas de desfecho ----------
  if (fase === 'declined') {
    return (
      <Shell evento={evento}>
        <div className="wz-final">
          <div className="wz-final-ico">🤝</div>
          <h2>Tudo bem!</h2>
          <p>
            Entendemos sua decisão. Sem o consentimento não podemos seguir com a inscrição, mas você
            pode voltar quando quiser.
          </p>
          <button className="wz-btn" onClick={() => navigate(`/evento/${evento.slug}`)}>
            Voltar ao evento
          </button>
        </div>
      </Shell>
    );
  }

  if (fase === 'already' && jaInscrito) {
    return (
      <Shell evento={evento}>
        <div className="wz-final">
          <div className="wz-final-ico">✅</div>
          <h2>Você já está inscrito</h2>
          <p>Encontramos uma inscrição com este CPF para este evento.</p>
          {jaInscrito.protocolo && (
            <div className="wz-proto">Protocolo: <b>{jaInscrito.protocolo}</b></div>
          )}
          {jaInscrito.dataInscricao && (
            <p className="wz-status-line">Inscrição realizada em {jaInscrito.dataInscricao}.</p>
          )}
          {jaInscrito.status && <p className="wz-status-line">Status: {jaInscrito.status}</p>}
          <button className="wz-btn" onClick={() => navigate(`/evento/${evento.slug}`)}>
            Voltar ao evento
          </button>
        </div>
      </Shell>
    );
  }

  if (fase === 'success' && result) {
    const pendente =
      result.status === 'PENDENTE HOLERITE' || result.status === 'PENDENCIA CNPJ';
    const msg =
      result.status === 'PENDENTE HOLERITE'
        ? 'Recebemos seus dados. Falta apenas o holerite para concluir — você pode enviá-lo depois, sem pressa.'
        : result.status === 'PENDENCIA CNPJ'
        ? 'Recebemos seus dados. Sua inscrição ficou com pendência de CNPJ — assim que tiver o CNPJ, é só nos enviar.'
        : 'Inscrição confirmada! Nos vemos no evento.';
    return (
      <Shell evento={evento}>
        <div className="wz-final">
          <div className="wz-final-ico">{pendente ? '📝' : '🎉'}</div>
          <h2>{evento.titulo}</h2>
          {result.protocolo && (
            <div className="wz-proto">Protocolo: <b>{result.protocolo}</b></div>
          )}
          <p className="wz-status-line">{msg}</p>
          <button className="wz-btn" onClick={() => navigate('/')}>
            Concluir
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- formulário (etapas) ----------
  return (
    <Shell
      evento={evento}
      aside={
        <>
          <Stepper steps={STEPS} current={step} skipped={skipped} />
          {periodoInscricoes(evento) && (
            <div className="wz-side-foot">
              <div className="row">
                <span className="k">Inscrições</span>
                <span className="v">{periodoInscricoes(evento)}</span>
              </div>
            </div>
          )}
        </>
      }
    >
      <div className="wz-panel">
        {step === S.CPF && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Qual o seu CPF?</h3>
            <p className="wz-lgpd">
              Vamos começar pelo seu CPF para verificar se você já tem inscrição neste evento.
            </p>
            <TextField
              label="CPF"
              value={form.cpf}
              onChange={(v) => set('cpf', maskCPF(v))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              error={errors.cpf}
              autoFocus
            />

            <div className="wz-verify">
              <span className="wz-label">Verificação de segurança</span>
              <Turnstile
                resetKey={cpfResetKey}
                onVerify={(t) => setCpfToken(t)}
                onExpire={() => setCpfToken('')}
              />
            </div>

            {erroCpf && <p className="wz-err wz-err-block">{erroCpf}</p>}
          </div>
        )}

        {step === S.LGPD && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Consentimento (LGPD)</h3>
            <p className="wz-lgpd">
              Antes de iniciarmos, precisamos do seu consentimento para o cumprimento da Lei Geral de
              Proteção de Dados (LGPD). Ao fornecer seus dados pessoais, você autoriza o tratamento
              dessas informações para fins de atendimento e prestação de serviços oferecidos pelo
              sindicato, em conformidade com a Lei nº 13.709/2018.
            </p>
            <p className="wz-step-q">Você autoriza seguir com a inscrição?</p>
            <div className="wz-choices">
              <button type="button" className="wz-choice" onClick={() => setFase('declined')}>
                Não autorizo
              </button>
              <button
                type="button"
                className="wz-choice on-cta"
                onClick={() => {
                  set('lgpd', true);
                  setStep(S.DADOS);
                }}
              >
                Autorizo
              </button>
            </div>
            <button className="wz-btn-ghost wz-back-lgpd" onClick={voltar} disabled={busy}>
              ← Voltar ao CPF
            </button>
          </div>
        )}

        {step === S.DADOS && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Seus dados</h3>
            <TextField
              label="Nome completo"
              value={form.nomeCompleto}
              onChange={(v) => set('nomeCompleto', v)}
              placeholder="Seu nome completo"
              error={errors.nomeCompleto}
              autoFocus
            />
            <TextField
              label="WhatsApp / Celular"
              value={form.whatsapp}
              onChange={(v) => set('whatsapp', maskPhone(v))}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              error={errors.whatsapp}
            />
            <TextField
              label="E-mail"
              value={form.email}
              onChange={(v) => set('email', v)}
              placeholder="voce@exemplo.com"
              inputMode="email"
              error={errors.email}
              hint="Usamos para enviar avisos sobre a inscrição."
            />
            <ChoiceField
              label="Onde você prefere receber as notificações?"
              options={['WhatsApp', 'E-mail']}
              value={form.contatoPreferido === 'email' ? 'E-mail' : 'WhatsApp'}
              onChange={(v) => set('contatoPreferido', v === 'E-mail' ? 'email' : 'whatsapp')}
            />
            <TextField
              label="Cidade"
              value={form.cidade}
              onChange={(v) => set('cidade', v)}
              placeholder="Sua cidade"
              error={errors.cidade}
            />
          </div>
        )}

        {step === S.CRIANCAS && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Crianças</h3>
            <p className="wz-lgpd">
              Informe quem você quer inscrever. São aceitos filhos, netos e outros dependentes de
              0 a 15 anos, no limite de {MAX_CRIANCAS} crianças por inscrição.
            </p>

            {form.criancas.map((c, i) => (
              <div className="wz-crianca" key={i}>
                <div className="wz-crianca-head">
                  <span className="wz-crianca-num">Criança {i + 1}</span>
                  {i > 0 && (
                    <button
                      type="button"
                      className="wz-crianca-rm"
                      onClick={() => removerCrianca(i)}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <TextField
                  label="Nome"
                  value={c.nome}
                  onChange={(v) => setCrianca(i, { nome: v })}
                  placeholder="Nome da criança"
                  error={errors[`crianca_${i}_nome`]}
                />
                <ChoiceField
                  label="Vínculo"
                  options={VINCULOS_CRIANCA}
                  value={c.vinculo}
                  onChange={(v) => setCrianca(i, { vinculo: v as CriancaForm['vinculo'] })}
                  error={errors[`crianca_${i}_vinculo`]}
                />
                <ChoiceField
                  label="Faixa etária"
                  options={FAIXAS_CRIANCA}
                  value={c.faixaEtaria}
                  onChange={(v) => setCrianca(i, { faixaEtaria: v as CriancaForm['faixaEtaria'] })}
                  error={errors[`crianca_${i}_faixaEtaria`]}
                />
              </div>
            ))}

            {errors.criancas && <p className="wz-err wz-err-block">{errors.criancas}</p>}

            {form.criancas.length < MAX_CRIANCAS ? (
              <button type="button" className="wz-btn-ghost wz-crianca-add" onClick={adicionarCrianca}>
                + Adicionar outra criança
              </button>
            ) : (
              <p className="wz-note">
                Você atingiu o limite de <b>{MAX_CRIANCAS} crianças</b> por inscrição.
              </p>
            )}
          </div>
        )}

        {step === S.SINDICAL && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Contribuinte</h3>
            <ChoiceField
              label="Você quer se sindicalizar?"
              options={['Sim', 'Não']}
              value={form.querSindicalizar}
              onChange={(v) => set('querSindicalizar', v as InscricaoForm['querSindicalizar'])}
              error={errors.querSindicalizar}
            />
          </div>
        )}

        {step === S.EMPRESA && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Empresa onde trabalha</h3>
            {completando === 'cnpj' && (
              <p className="wz-note">
                Encontramos sua inscrição
                {pendProtocolo && <> (protocolo <b>{pendProtocolo}</b>)</>} pendente de
                CNPJ. Informe o CNPJ para concluir.
              </p>
            )}
            <ChoiceField
              label="Você tem o CNPJ da empresa?"
              options={['Sim', 'Não']}
              value={form.temCnpj}
              onChange={(v) => set('temCnpj', v as InscricaoForm['temCnpj'])}
              error={errors.temCnpj}
            />
            {form.temCnpj === 'Sim' && (
              <>
                <TextField
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={(v) => set('cnpj', maskCNPJ(v))}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  error={errors.cnpj}
                />
                <TextField
                  label="Nome da empresa"
                  value={form.empresaNome}
                  onChange={(v) => set('empresaNome', v)}
                  placeholder="Razão social ou nome fantasia"
                  error={errors.empresaNome}
                />
              </>
            )}
            {form.temCnpj === 'Não' && (
              <p className="wz-note">
                Sem o CNPJ, sua inscrição ficará com <b>pendência de CNPJ</b>. Você poderá completar
                depois.
              </p>
            )}
          </div>
        )}

        {step === S.HOLERITE && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Holerite</h3>
            {completando === 'holerite' && (
              <p className="wz-note">
                Sua inscrição
                {pendProtocolo && <> (protocolo <b>{pendProtocolo}</b>)</>} está pendente do
                holerite. Envie o documento para concluir.
              </p>
            )}
            <ChoiceField
              label="Você possui o holerite agora?"
              options={['Sim', 'Não']}
              value={form.possuiHolerite}
              onChange={(v) => set('possuiHolerite', v as InscricaoForm['possuiHolerite'])}
              error={errors.possuiHolerite}
            />
            {form.possuiHolerite === 'Sim' && (
              <>
                <FileField
                  label="Arquivo do holerite"
                  fileName={form.holeriteNome}
                  onPick={escolherHolerite}
                  error={errors.holerite}
                  hint="PDF, JPG, PNG ou HEIC (foto/print). Máx. 10 MB."
                />
                {!form.holeriteArquivo && !errors.holerite && (
                  <p className="wz-note">
                    Se enviar sem anexar o arquivo, sua inscrição ficará como <b>pendente de
                    holerite</b> — você poderá enviá-lo depois.
                  </p>
                )}
              </>
            )}
            {form.possuiHolerite === 'Não' && (
              <p className="wz-note">
                Sem o holerite agora, sua inscrição ficará como <b>pendente de holerite</b>. Você
                poderá enviá-lo depois.
              </p>
            )}
          </div>
        )}

        {step === S.REVISAO && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Revisão</h3>
            {completando ? (
              // Completar pendência: só o CPF (identificação) + o que foi
              // preenchido agora. O restante já está na inscrição original.
              <>
                <p className="wz-note">
                  Concluindo sua inscrição
                  {pendProtocolo && <> (protocolo <b>{pendProtocolo}</b>)</>}. Os demais dados
                  da inscrição original serão mantidos.
                </p>
                <ul className="wz-review">
                  <Item k="CPF" v={form.cpf} />
                  {completando === 'cnpj' && <Item k="CNPJ" v={form.cnpj} />}
                  {completando === 'cnpj' && <Item k="Empresa" v={form.empresaNome} />}
                  {(completando === 'cnpj' || completando === 'holerite') && (
                    <Item
                      k="Holerite"
                      v={form.holeriteNome || 'Não anexado (ficará pendente)'}
                    />
                  )}
                </ul>
              </>
            ) : (
              <ul className="wz-review">
                <Item k="CPF" v={form.cpf} />
                <Item k="Nome" v={form.nomeCompleto} />
                <Item k="WhatsApp" v={form.whatsapp} />
                <Item k="E-mail" v={form.email} />
                <Item
                  k="Prefere receber por"
                  v={form.contatoPreferido === 'email' ? 'E-mail' : 'WhatsApp'}
                />
                <Item k="Cidade" v={form.cidade} />
                {pedeCriancas &&
                  form.criancas.map((c, i) => (
                    <Item
                      key={i}
                      k={`Criança ${i + 1}`}
                      v={[c.nome, c.vinculo, c.faixaEtaria].filter(Boolean).join(' · ')}
                    />
                  ))}
                <Item k="Quer se sindicalizar" v={form.querSindicalizar} />
                <Item k="Tem CNPJ" v={form.temCnpj} />
                {form.temCnpj === 'Sim' && <Item k="CNPJ" v={form.cnpj} />}
                {form.temCnpj === 'Sim' && <Item k="Empresa" v={form.empresaNome} />}
                {!semCnpj && <Item k="Possui holerite" v={form.possuiHolerite} />}
                {form.possuiHolerite === 'Sim' && (
                  <Item k="Holerite" v={form.holeriteNome || 'Não anexado (ficará pendente)'} />
                )}
              </ul>
            )}

            <div className="wz-verify">
              <span className="wz-label">Verificação de segurança</span>
              <Turnstile
                resetKey={submitResetKey}
                onVerify={(t) => setSubmitToken(t)}
                onExpire={() => setSubmitToken('')}
              />
            </div>

            {erroSubmit && <p className="wz-err wz-err-block">{erroSubmit}</p>}
          </div>
        )}

        {/* navegação (a etapa LGPD tem seus próprios botões) */}
        {step !== S.LGPD && (
          <div className="wz-nav">
            {step > S.CPF ? (
              <button className="wz-btn-ghost" onClick={voltar} disabled={busy}>
                ← Voltar
              </button>
            ) : (
              <span />
            )}
            {step < S.REVISAO ? (
              <button
                className="wz-btn"
                onClick={avancar}
                disabled={busy || (step === S.CPF && !cpfToken)}
              >
                {busy ? 'Aguarde…' : <>Avançar <span className="arr">→</span></>}
              </button>
            ) : (
              <button
                className="wz-btn"
                onClick={enviar}
                disabled={busy || !submitToken}
              >
                {busy ? 'Enviando…' : 'Enviar inscrição'}
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

// Casca comum: header (nav) → card de duas colunas. A coluna azul (esquerda no
// desktop / faixa de topo no mobile) traz voltar + "Inscrição" + o `aside`
// (lista de etapas + info do evento); a coluna branca traz o conteúdo da etapa.
function Shell({
  children,
  evento,
  aside,
}: {
  children: ReactNode;
  evento: Evento;
  aside?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="pg">
      <Nav />
      <div className="wz-main">
        <div className="wz-shell">
          <aside className="wz-side">
            <button className="wz-back" onClick={() => navigate(`/evento/${evento.slug}`)}>
              ← {evento.titulo}
            </button>
            <h1 className="wz-title">Inscrição</h1>
            {aside}
          </aside>
          <div className="wz-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Período de inscrições para a coluna azul do wizard, com ano nos dois lados
// (ex.: "01/06 — 31/07" -> "01/06/2026 — 31/07/2026"). O ano é extraído de
// outra meta do evento (ex.: Prova "13 set 2026"); sem ano, usa o valor cru.
function periodoInscricoes(evento: Evento): string | null {
  const insc = evento.metas.find((m) => /inscri/i.test(m.k));
  if (!insc) return null;
  const ano = evento.metas.map((m) => m.v).join(' ').match(/\b(20\d{2})\b/)?.[1];
  if (!ano) return insc.v;
  // acrescenta /ano a cada "dd/mm" que ainda não tenha ano
  return insc.v.replace(/(\d{2}\/\d{2})(?!\/)/g, `$1/${ano}`);
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <li>
      <span className="rk">{k}</span>
      <span className="rv">{v || '—'}</span>
    </li>
  );
}
