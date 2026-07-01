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
  isImageFile,
} from '../lib/validators';
import { Nav } from '../components/Nav';
import { Stepper } from '../components/inscricao/Stepper';
import { Turnstile } from '../components/inscricao/Turnstile';
import { TextField, ChoiceField, FileField } from '../components/inscricao/fields';

type Fase = 'form' | 'declined' | 'already' | 'success';
type Errors = Record<string, string>;

const STEPS = ['Consentimento', 'CPF', 'Seus dados', 'Sindicalização', 'Empresa', 'Holerite', 'Revisão'];

export function InscricaoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<InscricaoForm>(novoForm());
  const [errors, setErrors] = useState<Errors>({});
  const [fase, setFase] = useState<Fase>('form');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [erroSubmit, setErroSubmit] = useState('');
  const [jaInscrito, setJaInscrito] = useState<CpfCheckResult | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (slug) getEvento(slug).then(setEvento);
  }, [slug]);

  const semCnpj = form.temCnpj === 'Não';
  const skipped = useMemo(() => (semCnpj ? [5] : []), [semCnpj]);

  function set<K extends keyof InscricaoForm>(key: K, value: InscricaoForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
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
    if (step === 1) {
      if (!isValidCPF(form.cpf)) e.cpf = 'Informe um CPF válido.';
    } else if (step === 2) {
      if (form.nomeCompleto.trim().length < 3) e.nomeCompleto = 'Informe seu nome completo.';
      if (!isValidPhone(form.whatsapp)) e.whatsapp = 'Informe um WhatsApp válido com DDD.';
      if (form.cidade.trim().length < 2) e.cidade = 'Informe sua cidade.';
    } else if (step === 3) {
      if (!form.querSindicalizar) e.querSindicalizar = 'Selecione uma opção.';
    } else if (step === 4) {
      if (!form.temCnpj) e.temCnpj = 'Selecione uma opção.';
      if (form.temCnpj === 'Sim') {
        if (!isValidCNPJ(form.cnpj)) e.cnpj = 'Informe um CNPJ válido.';
        if (form.empresaNome.trim().length < 2) e.empresaNome = 'Informe o nome da empresa.';
      }
    } else if (step === 5) {
      if (!form.possuiHolerite) e.possuiHolerite = 'Selecione uma opção.';
      if (form.possuiHolerite === 'Sim' && !form.holeriteArquivo) {
        e.holerite = 'Envie a imagem do holerite.';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function avancar() {
    if (!validar()) return;

    // Etapa CPF: checa inscrição existente antes de seguir
    if (step === 1) {
      setBusy(true);
      const r = await checarCpf(form.cpf);
      setBusy(false);
      if (r.found) {
        setJaInscrito(r);
        setFase('already');
        return;
      }
    }

    // Empresa sem CNPJ → pula Holerite, vai direto à Revisão
    if (step === 4 && semCnpj) {
      setStep(6);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function voltar() {
    // Da Revisão, se pulou holerite, volta para Empresa
    if (step === 6 && semCnpj) {
      setStep(4);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function escolherHolerite(file: File | null) {
    if (file && !isImageFile(file)) {
      setErrors((e) => ({ ...e, holerite: 'Apenas imagens (PDF não é aceito).' }));
      set('holeriteArquivo', null);
      set('holeriteNome', '');
      return;
    }
    set('holeriteArquivo', file);
    set('holeriteNome', file ? file.name : '');
    setErrors((e) => ({ ...e, holerite: '' }));
  }

  async function enviar() {
    setErroSubmit('');
    setBusy(true);
    try {
      const r = await submitInscricao(form, evento!, turnstileToken);
      if (r.jaInscrito) {
        setJaInscrito({ found: true, protocolo: r.protocolo, status: r.status });
        setFase('already');
      } else {
        setResult(r);
        setFase('success');
      }
      window.scrollTo(0, 0);
    } catch {
      setErroSubmit('Não foi possível enviar sua inscrição agora. Verifique a verificação de segurança e tente novamente.');
      setTurnstileToken('');
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
          <p>Encontramos uma inscrição com este CPF.</p>
          {jaInscrito.protocolo && (
            <div className="wz-proto">Protocolo: <b>{jaInscrito.protocolo}</b></div>
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
    const msg =
      result.status === 'INSCRITO'
        ? 'Inscrição confirmada! Nos vemos no evento.'
        : result.status === 'PENDENTE HOLERITE'
        ? 'Quase lá! Recebemos seus dados. Falta enviar o holerite para concluir.'
        : 'Recebemos seus dados. Sua inscrição ficou com pendência de CNPJ — assim que tiver o CNPJ, é só nos enviar.';
    return (
      <Shell style={style} evento={evento}>
        <div className="wz-card wz-final">
          <div className="wz-final-ico">🎉</div>
          <h2>{evento.titulo}</h2>
          <div className="wz-proto">Protocolo: <b>{result.protocolo}</b></div>
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
        {step === 0 && (
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
              <button
                type="button"
                className="wz-choice"
                onClick={() => setFase('declined')}
              >
                Não autorizo
              </button>
              <button
                type="button"
                className="wz-choice on-cta"
                style={style}
                onClick={() => {
                  set('lgpd', true);
                  setStep(1);
                }}
              >
                Autorizo
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Qual o seu CPF?</h3>
            <TextField
              label="CPF"
              value={form.cpf}
              onChange={(v) => set('cpf', maskCPF(v))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              error={errors.cpf}
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
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

        {step === 3 && (
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

        {step === 4 && (
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

        {step === 5 && (
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
              <FileField
                label="Imagem do holerite"
                fileName={form.holeriteNome}
                onPick={escolherHolerite}
                error={errors.holerite}
                hint="Apenas imagens (foto ou print). PDF não é aceito."
              />
            )}
            {form.possuiHolerite === 'Não' && (
              <p className="wz-note">
                Sem o holerite agora, sua inscrição ficará como <b>pendente de holerite</b>. Você
                poderá enviá-lo depois.
              </p>
            )}
          </div>
        )}

        {step === 6 && (
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
              {form.possuiHolerite === 'Sim' && <Item k="Holerite" v={form.holeriteNome} />}
            </ul>

            <div className="wz-verify">
              <span className="wz-label">Verificação de segurança</span>
              <Turnstile
                onVerify={(t) => setTurnstileToken(t)}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {erroSubmit && <p className="wz-err wz-err-block">{erroSubmit}</p>}
          </div>
        )}

        {/* navegação (não aparece na etapa LGPD) */}
        {step > 0 && (
          <div className="wz-nav">
            <button className="wz-btn-ghost" onClick={voltar} disabled={busy}>
              ← Voltar
            </button>
            {step < 6 ? (
              <button className="wz-btn" style={style} onClick={avancar} disabled={busy}>
                {busy ? 'Aguarde…' : 'Avançar →'}
              </button>
            ) : (
              <button
                className="wz-btn"
                style={style}
                onClick={enviar}
                disabled={busy || !turnstileToken}
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
