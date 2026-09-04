import { useEffect, useState } from 'react';
import type { Evento } from '../../types';
import type { CriancaForm, InscricaoConsulta } from '../../types/inscricao';
import {
  novaCrianca,
  comVinculoValido,
  validarCriancas,
  MAX_CRIANCAS,
  OTP_TAMANHO,
} from '../../types/inscricao';
import {
  solicitarConsulta,
  validarOtp,
  verInscricao,
  editarInscricao,
} from '../../services/inscricao';
import { onlyDigits } from '../../lib/validators';
import { useTenant } from '../../context/TenantContext';
import { Turnstile } from './Turnstile';
import { TextField } from './fields';
import { CriancasEditor } from './CriancasEditor';

// ---------------------------------------------------------------------------
// CONSULTA E EDIÇÃO DA INSCRIÇÃO EXISTENTE
//
// Sub-fluxo de quem já está inscrito: contato → código → dados. NADA da
// inscrição aparece antes do código validado — quem guarda essa regra é o
// servidor (ver_inscricao devolve `otp_nao_validado` sem ele), e a tela
// acompanha: `dados` só é preenchido depois da validação.
//
// Turnstile: um widget só, renovado depois de cada chamada, porque o token é de
// uso único. São até quatro em sequência (solicitar → validar → ver → editar) e
// há espera de mensagem no meio, então o token nunca é reaproveitado.
// ---------------------------------------------------------------------------

type Etapa = 'contato' | 'codigo' | 'dados';

const MSG: Record<string, string> = {
  contato_nao_confere:
    'O contato informado não confere com o da inscrição. Confira e tente novamente.',
  inscricao_nao_encontrada: 'Não encontramos inscrição com este CPF para este evento.',
  envio_falhou: 'Não foi possível enviar o código agora. Tente novamente em instantes.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  codigo_expirado: 'O código expirou. Peça um novo para continuar.',
  tentativas_excedidas: 'Muitas tentativas. Peça um novo código para continuar.',
  fora_do_periodo: 'O período de inscrição terminou — não é mais possível alterar.',
  criancas_invalidas: 'Confira os dados das crianças e tente novamente.',
  resposta_invalida: 'Resposta inesperada do servidor. Tente novamente.',
};

interface Props {
  evento: Evento;
  cpf: string;
  onSair: () => void;
}

export function ConsultaInscricao({ evento, cpf, onSair }: Props) {
  const tenant = useTenant();

  const [etapa, setEtapa] = useState<Etapa>('contato');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  // Excedeu as tentativas da hora: só o sindicato resolve, então a tela troca
  // de assunto em vez de insistir num campo que não vai mais funcionar.
  const [bloqueado, setBloqueado] = useState(false);

  const [token, setToken] = useState('');
  const [resetKey, setResetKey] = useState(0);

  const [contato, setContato] = useState('');
  const [codigo, setCodigo] = useState('');
  const [espera, setEspera] = useState(0);
  const [verPendente, setVerPendente] = useState(false);

  const [dados, setDados] = useState<InscricaoConsulta | null>(null);
  const [editavel, setEditavel] = useState(false);
  const [criancas, setCriancas] = useState<CriancaForm[]>([]);
  const [errosCriancas, setErrosCriancas] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  function renovarDesafio() {
    setToken('');
    setResetKey((k) => k + 1);
  }

  function mensagem(code: string, padrao: string): string {
    return MSG[code] || padrao;
  }

  // Contagem regressiva do reenvio.
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Código validado: buscar os dados exige um token novo (o anterior foi gasto
  // no validar_otp). A busca dispara sozinha assim que o desafio responde.
  useEffect(() => {
    if (!verPendente || !token) return;
    setVerPendente(false);
    void buscarDados(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verPendente, token]);

  // Se o Turnstile não responder, devolve o controle em vez de travar a tela.
  useEffect(() => {
    if (!verPendente) return;
    const t = setTimeout(() => {
      setVerPendente(false);
      setBusy(false);
      setErro('A verificação de segurança demorou a responder. Tente novamente.');
    }, 15000);
    return () => clearTimeout(t);
  }, [verPendente]);

  async function pedirCodigo(reenvio: boolean) {
    if (contato.trim().length < 5) {
      setErro('Informe o WhatsApp ou o e-mail que você usou na inscrição.');
      return;
    }
    setErro('');
    setAviso('');
    setBusy(true);
    try {
      const r = await solicitarConsulta(cpf, evento.slug, contato, token);
      setEtapa('codigo');
      setCodigo('');
      setEspera(60);
      const onde =
        r.canal === 'whatsapp' ? ' no seu WhatsApp' : r.canal === 'email' ? ' no seu e-mail' : '';
      const validade = r.validadeMin ? ' — vale por ' + r.validadeMin + ' minutos' : '';
      setAviso('Código ' + (reenvio ? 'reenviado' : 'enviado') + onde + validade + '.');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'procure_sindicato') {
        setBloqueado(true);
        setErro('');
      } else {
        setErro(mensagem(code, 'Não foi possível continuar agora. Tente novamente.'));
      }
    } finally {
      renovarDesafio();
      setBusy(false);
    }
  }

  async function validarCodigo() {
    if (codigo.length !== OTP_TAMANHO) {
      setErro('Digite os ' + OTP_TAMANHO + ' dígitos do código.');
      return;
    }
    setErro('');
    setAviso('');
    setBusy(true);
    try {
      const r = await validarOtp(cpf, evento.slug, codigo, token);
      renovarDesafio();

      if (r.ok) {
        setVerPendente(true); // segue para os dados quando o token novo chegar
        return;
      }

      if (r.erro === 'codigo_invalido' && typeof r.restantes === 'number') {
        setErro(
          r.restantes > 0
            ? 'Código incorreto. ' +
                r.restantes +
                (r.restantes === 1 ? ' tentativa restante.' : ' tentativas restantes.')
            : 'Código incorreto. Peça um novo código.'
        );
      } else {
        setErro(mensagem(r.erro || '', 'Código incorreto. Confira e tente novamente.'));
      }
      if (r.erro === 'codigo_expirado' || r.erro === 'tentativas_excedidas') {
        setEtapa('contato');
        setCodigo('');
      }
      setBusy(false);
    } catch {
      renovarDesafio();
      setErro('Não foi possível validar o código agora. Tente novamente.');
      setBusy(false);
    }
  }

  async function buscarDados(tk: string) {
    setBusy(true);
    try {
      const r = await verInscricao(cpf, evento.slug, tk);
      setDados(r.inscricao);
      setEditavel(r.editavel);
      // Só na edição: na tela de leitura o vínculo gravado continua aparecendo
      // como está (ver comVinculoValido).
      setCriancas(r.editavel ? r.inscricao.criancas.map(comVinculoValido) : r.inscricao.criancas);
      setErrosCriancas({});
      setEtapa('dados');
      setAviso('');
      setErro('');
      window.scrollTo(0, 0);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'otp_nao_validado') {
        setEtapa('contato');
        setCodigo('');
        setErro('Sua verificação expirou. Peça um novo código.');
      } else {
        setErro(mensagem(code, 'Não foi possível carregar sua inscrição agora. Tente novamente.'));
      }
    } finally {
      renovarDesafio();
      setBusy(false);
    }
  }

  // ---- edição das crianças ----
  function alterarCrianca(i: number, patch: Partial<CriancaForm>) {
    setSalvo(false);
    setCriancas((lista) => lista.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
    setErrosCriancas((e) => {
      const limpo = { ...e };
      for (const campo of Object.keys(patch)) limpo['crianca_' + i + '_' + campo] = '';
      return limpo;
    });
  }

  function adicionarCrianca() {
    setSalvo(false);
    setCriancas((lista) => (lista.length >= MAX_CRIANCAS ? lista : [...lista, novaCrianca()]));
  }

  function removerCrianca(i: number) {
    setSalvo(false);
    setCriancas((lista) => lista.filter((_, idx) => idx !== i));
    // Erros são indexados por posição: remapear seria frágil, limpar é honesto.
    setErrosCriancas({});
  }

  async function salvarCriancas() {
    const e = validarCriancas(criancas);
    if (Object.keys(e).length > 0) {
      setErrosCriancas(e);
      return;
    }
    setErro('');
    setSalvo(false);
    setBusy(true);
    try {
      const salvas = await editarInscricao(cpf, evento.slug, criancas, token);
      setCriancas(salvas);
      setErrosCriancas({});
      setSalvo(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'otp_nao_validado') {
        // A verificação caducou: nada mais é exibido sem um código novo.
        setDados(null);
        setEtapa('contato');
        setCodigo('');
        setErro('Sua verificação expirou. Peça um novo código para alterar a inscrição.');
      } else {
        if (code === 'fora_do_periodo') setEditavel(false);
        setErro(mensagem(code, 'Não foi possível salvar as alterações agora. Tente novamente.'));
      }
    } finally {
      renovarDesafio();
      setBusy(false);
    }
  }

  // ---- telas ----

  if (bloqueado) {
    return (
      <div className="wz-panel">
        <div className="wz-step-body">
          <h3 className="wz-step-title">Procure o sindicato</h3>
          <p className="wz-lgpd">
            Houve muitas tentativas de confirmar o contato desta inscrição. Por segurança, a
            consulta pelo portal fica indisponível por um tempo. Fale com o sindicato para conferir
            ou atualizar seus dados.
          </p>
          <ul className="wz-review">
            <Linha k="Telefone" v={tenant.contato.telefone} />
            <Linha k="E-mail" v={tenant.contato.email} />
            <Linha k="Endereço" v={tenant.contato.endereco} />
          </ul>
          <div className="wz-nav">
            <button className="wz-btn-ghost" onClick={onSair}>
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (etapa === 'dados' && dados) {
    return (
      <div className="wz-panel">
        <div className="wz-step-body">
          <h3 className="wz-step-title">Sua inscrição</h3>
          <div className="wz-proto">
            Protocolo: <b>{dados.protocolo}</b>
          </div>

          <ul className="wz-review">
            <Linha k="Status" v={dados.status} />
            <Linha k="Inscrição em" v={dados.dataInscricao} />
            <Linha k="Nome" v={dados.nomeCompleto} />
            <Linha k="CPF" v={dados.cpf} />
            <Linha k="WhatsApp" v={dados.whatsapp} />
            <Linha k="E-mail" v={dados.email} />
            <Linha k="Cidade" v={dados.cidade} />
            <Linha k="Empresa" v={dados.empresa} />
          </ul>

          <span className="wz-label wz-consulta-sub">Crianças</span>

          {editavel ? (
            <>
              <p className="wz-lgpd">
                Você pode alterar, remover ou incluir crianças enquanto as inscrições estiverem
                abertas.
              </p>
              <CriancasEditor
                criancas={criancas}
                errors={errosCriancas}
                onAlterar={alterarCrianca}
                onAdicionar={adicionarCrianca}
                onRemover={removerCrianca}
                permiteRemoverPrimeira
              />
            </>
          ) : criancas.length > 0 ? (
            <ul className="wz-review">
              {criancas.map((c, i) => (
                <Linha
                  key={i}
                  k={'Criança ' + (i + 1)}
                  v={[c.nome, c.vinculo, c.faixaEtaria].filter(Boolean).join(' · ')}
                />
              ))}
            </ul>
          ) : (
            <p className="wz-note">Nenhuma criança cadastrada nesta inscrição.</p>
          )}

          {editavel && (
            <div className="wz-verify">
              <span className="wz-label">Verificação de segurança</span>
              <Turnstile
                resetKey={resetKey}
                onVerify={(t) => setToken(t)}
                onExpire={() => setToken('')}
              />
            </div>
          )}

          {salvo && <p className="wz-note">Alterações salvas.</p>}
          {erro && <p className="wz-err wz-err-block">{erro}</p>}

          <div className="wz-nav">
            <button className="wz-btn-ghost" onClick={onSair} disabled={busy}>
              ← Voltar
            </button>
            {editavel && (
              <button className="wz-btn" onClick={salvarCriancas} disabled={busy || !token}>
                {busy ? 'Salvando…' : 'Salvar alterações'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wz-panel">
      <div className="wz-step-body">
        <h3 className="wz-step-title">Ver minha inscrição</h3>

        {etapa === 'contato' ? (
          <>
            <p className="wz-lgpd">
              Para sua segurança, confirme o WhatsApp <b>ou</b> o e-mail que você informou quando
              fez esta inscrição. Enviamos um código para esse contato.
            </p>
            <TextField
              label="WhatsApp ou e-mail da inscrição"
              value={contato}
              onChange={(v) => {
                setContato(v);
                setErro('');
              }}
              placeholder="(00) 00000-0000 ou voce@exemplo.com"
              autoFocus
            />
          </>
        ) : (
          <>
            <p className="wz-lgpd">
              Digite o código de {OTP_TAMANHO} dígitos que enviamos para o contato da sua inscrição.
            </p>
            <TextField
              label="Código recebido"
              value={codigo}
              onChange={(v) => {
                setCodigo(onlyDigits(v).slice(0, OTP_TAMANHO));
                setErro('');
              }}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
            />
          </>
        )}

        <div className="wz-verify">
          <span className="wz-label">Verificação de segurança</span>
          <Turnstile
            resetKey={resetKey}
            onVerify={(t) => setToken(t)}
            onExpire={() => setToken('')}
          />
        </div>

        {aviso && <p className="wz-note">{aviso}</p>}
        {erro && <p className="wz-err wz-err-block">{erro}</p>}

        <div className="wz-nav">
          <button className="wz-btn-ghost" onClick={onSair} disabled={busy}>
            ← Voltar
          </button>
          {etapa === 'contato' ? (
            <button className="wz-btn" onClick={() => pedirCodigo(false)} disabled={busy || !token}>
              {busy ? 'Enviando…' : 'Enviar código'}
            </button>
          ) : (
            <button
              className="wz-btn"
              onClick={validarCodigo}
              disabled={busy || !token || codigo.length !== OTP_TAMANHO}
            >
              {busy ? 'Conferindo…' : 'Ver minha inscrição'}
            </button>
          )}
        </div>

        {etapa === 'codigo' && (
          <button
            className="wz-btn-ghost wz-reenviar"
            onClick={() => pedirCodigo(true)}
            disabled={busy || espera > 0 || !token}
          >
            {espera > 0 ? 'Reenviar código em ' + espera + 's' : 'Não recebi — reenviar código'}
          </button>
        )}
      </div>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <li>
      <span className="rk">{k}</span>
      <span className="rv">{v || '—'}</span>
    </li>
  );
}
