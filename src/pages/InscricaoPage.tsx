import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Evento } from '../types';
import type { InscricaoForm, SubmitResult, CpfCheckResult } from '../types/inscricao';
import { novoForm } from '../types/inscricao';
import { getEvento } from '../services/events';
import { checarCpf, submitInscricao } from '../services/inscricao';
import { EVENT_COLORS } from '../theme/palette';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  validarHolerite,
} from '../lib/validators';
import { Nav } from '../components/Nav';
import { Stepper } from '../components/inscricao/Stepper';
import { Turnstile } from '../components/inscricao/Turnstile';
import { TextField, ChoiceField, FileField } from '../components/inscricao/fields';

type Fase = 'form' | 'declined' | 'already' | 'success';
type Errors = Record<string, string>;

// Etapas (CPF PRIMEIRO — antes da LGPD e de qualquer dado).
const STEPS = ['CPF', 'Consentimento', 'Seus dados', 'Sindicalização', 'Empresa', 'Holerite', 'Revisão'];
const S = { CPF: 0, LGPD: 1, DADOS: 2, SINDICAL: 3, EMPRESA: 4, HOLERITE: 5, REVISAO: 6 };

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
  evento_nao_encontrado: 'Evento não encontrado. Verifique o link e tente novamente.',
};

export function InscricaoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);
  const [step, setStep] = useState(S.CPF);
  const [form, setForm] = useState<InscricaoForm>(novoForm());
  const [errors, setErrors] = useState<Errors>({});
  const [fase, setFase] = useState<Fase>('form');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [jaInscrito, setJaInscrito] = useState<CpfCheckResult | null>(null);

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
    if (slug) getEvento(slug).then(setEvento);
  }, [slug]);

  const semCnpj = form.temCnpj === 'Não';
  const skipped = useMemo(() => (semCnpj ? [S.HOLERITE] : []), [semCnpj]);

  function set<K extends keyof InscricaoForm>(key: K, value: InscricaoForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function renovarCpfTurnstile() {
    setCpfToken('');
    setCpfResetKey((k) => k + 1);
  }

  if (evento === undefined) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 26px', color: 'var(--soft)' }}>Carregando…</div>
      </div>
    );
  }
  if (evento === null) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 26px' }}>
          <h1 style={{ fontFamily: 'var(--display)' }}>Evento não encontrado</h1>
          <button className="back" onClick={() => navigate('/')}>← Voltar aos eventos</button>
        </div>
      </div>
    );
  }

  const cor = EVENT_COLORS[evento.cor];
  const style = { '--ev': cor } as CSSProperties;

  // ---- validação por etapa ----
  function validar(): boolean {
    const e: Errors = {};
    if (step === S.CPF) {
      if (!isValidCPF(form.cpf)) e.cpf = 'Informe um CPF válido.';
    } else if (step === S.DADOS) {
      if (form.nomeCompleto.trim().length < 3) e.nomeCompleto = 'Informe seu nome completo.';
      if (!isValidPhone(form.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido com DDD.';
      if (form.cidade.trim().length < 2) e.cidade = 'Informe sua cidade.';
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
          setJaInscrito(r);
          setFase('already');
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

    // Empresa sem CNPJ → pula Holerite, vai direto à Revisão.
    if (step === S.EMPRESA && semCnpj) {
      setStep(S.REVISAO);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function voltar() {
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
      const r = await submitInscricao(form, evento!, submitToken);
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
      <Shell style={style} evento={evento}>
        <div className="wz-card wz-final">
          <div className="wz-final-ico">🤝</div>
          <h2>Tudo bem!</h2>
          <p>
            Entendemos sua decisão. Sem o consentimento não podemos seguir com a inscrição, mas você
            pode voltar quando quiser.
          </p>
          <button className="wz-btn" style={style} onClick={() => navigate(`/evento/${evento.slug}`)}>
            Voltar ao evento
          </button>
        </div>
      </Shell>
    );
  }

  if (fase === 'already' && jaInscrito) {
    return (
      <Shell style={style} evento={evento}>
        <div className="wz-card wz-final">
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
          <button className="wz-btn" style={style} onClick={() => navigate(`/evento/${evento.slug}`)}>
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
      <Shell style={style} evento={evento}>
        <div className="wz-card wz-final">
          <div className="wz-final-ico">{pendente ? '📝' : '🎉'}</div>
          <h2>{evento.titulo}</h2>
          {result.protocolo && (
            <div className="wz-proto">Protocolo: <b>{result.protocolo}</b></div>
          )}
          <p className="wz-status-line">{msg}</p>
          <button className="wz-btn" style={style} onClick={() => navigate('/')}>
            Concluir
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- formulário (etapas) ----------
  return (
    <Shell style={style} evento={evento}>
      <Stepper steps={STEPS} current={step} skipped={skipped} />

      <div className="wz-card">
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
                style={style}
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
              label="Cidade"
              value={form.cidade}
              onChange={(v) => set('cidade', v)}
              placeholder="Sua cidade"
              error={errors.cidade}
            />
          </div>
        )}

        {step === S.SINDICAL && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Sindicalização</h3>
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
            <ul className="wz-review">
              <Item k="CPF" v={form.cpf} />
              <Item k="Nome" v={form.nomeCompleto} />
              <Item k="WhatsApp" v={form.whatsapp} />
              <Item k="Cidade" v={form.cidade} />
              <Item k="Quer se sindicalizar" v={form.querSindicalizar} />
              <Item k="Tem CNPJ" v={form.temCnpj} />
              {form.temCnpj === 'Sim' && <Item k="CNPJ" v={form.cnpj} />}
              {form.temCnpj === 'Sim' && <Item k="Empresa" v={form.empresaNome} />}
              {!semCnpj && <Item k="Possui holerite" v={form.possuiHolerite} />}
              {form.possuiHolerite === 'Sim' && (
                <Item k="Holerite" v={form.holeriteNome || 'Não anexado (ficará pendente)'} />
              )}
            </ul>

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
                style={style}
                onClick={avancar}
                disabled={busy || (step === S.CPF && !cpfToken)}
              >
                {busy ? 'Aguarde…' : 'Avançar →'}
              </button>
            ) : (
              <button
                className="wz-btn"
                style={style}
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

// Casca comum (nav + hero do evento + container do wizard)
function Shell({
  children,
  style,
  evento,
}: {
  children: React.ReactNode;
  style: CSSProperties;
  evento: Evento;
}) {
  const navigate = useNavigate();
  return (
    <div>
      <Nav />
      <div className="wz-wrap" style={style}>
        <div className="wz-glow" />
        <div className="wrap">
          <button className="back" onClick={() => navigate(`/evento/${evento.slug}`)}>
            ← {evento.titulo}
          </button>
          <h1 className="wz-title">Inscrição</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <li>
      <span className="rk">{k}</span>
      <span className="rv">{v || '—'}</span>
    </li>
  );
}
