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
  OTP_TAMANHO,
} from '../types/inscricao';
import { getEvento } from '../services/events';
import { inscricoesAbertas } from '../services/statusPortal';
import { checarCpf, submitInscricao, enviarOtp, validarOtp } from '../services/inscricao';
import {
  onlyDigits,
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
// Duas etapas são condicionais, e `montarEtapas` monta rótulos e índices juntos
// a partir das flags:
//  - "Crianças" só existe nos eventos com `pedeCriancas`, entre os dados
//    pessoais/contato e o vínculo empregatício;
//  - "Contribuinte" e "Empresa" somem para quem é `sindicalizado` na base — o
//    vínculo e a empresa já são conhecidos, e vão preenchidos no formulário;
//  - "Holerite" some para quem é `isentoHolerite` (empresa na lista do
//    sindicato). Nada é dito na tela: a etapa simplesmente não existe.
// "Verificação" é sempre a última: a inscrição só é enviada depois do código.
type ChaveEtapa =
  | 'CPF'
  | 'LGPD'
  | 'DADOS'
  | 'CRIANCAS'
  | 'SINDICAL'
  | 'EMPRESA'
  | 'HOLERITE'
  | 'REVISAO'
  | 'OTP';

// A etapa de CPF é sempre a primeira, com ou sem a etapa de crianças.
const ETAPA_CPF = 0;

function montarEtapas(
  pedeCriancas: boolean,
  sindicalizado: boolean,
  isentoHolerite: boolean
): { steps: string[]; S: Record<ChaveEtapa, number> } {
  // A ordem desta lista É a ordem do wizard; os índices saem dela, em vez de
  // somas de deslocamento — assim uma etapa condicional a mais não desalinha as
  // outras.
  const etapas: { chave: ChaveEtapa; rotulo: string }[] = [
    { chave: 'CPF', rotulo: 'CPF' },
    { chave: 'LGPD', rotulo: 'Consentimento' },
    { chave: 'DADOS', rotulo: 'Seus dados' },
  ];
  if (pedeCriancas) etapas.push({ chave: 'CRIANCAS', rotulo: 'Crianças' });
  if (!sindicalizado) {
    etapas.push({ chave: 'SINDICAL', rotulo: 'Contribuinte' });
    etapas.push({ chave: 'EMPRESA', rotulo: 'Empresa' });
  }
  if (!isentoHolerite) etapas.push({ chave: 'HOLERITE', rotulo: 'Holerite' });
  etapas.push({ chave: 'REVISAO', rotulo: 'Revisão' });
  etapas.push({ chave: 'OTP', rotulo: 'Verificação' });

  // Etapa ausente fica em -1: nunca casa com o `step` atual, então não é
  // renderizada, não é validada e não aparece no Stepper.
  const S: Record<ChaveEtapa, number> = {
    CPF: ETAPA_CPF,
    LGPD: -1,
    DADOS: -1,
    CRIANCAS: -1,
    SINDICAL: -1,
    EMPRESA: -1,
    HOLERITE: -1,
    REVISAO: -1,
    OTP: -1,
  };
  etapas.forEach((e, i) => {
    S[e.chave] = i;
  });

  return { steps: etapas.map((e) => e.rotulo), S };
}

// Mensagens amigáveis por código de erro do backend.
const MSG_CHECAR: Record<string, string> = {
  cpf_invalido: 'CPF inválido. Confira os números digitados.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  evento_nao_encontrado: 'Evento não encontrado. Verifique o link e tente novamente.',
};
// Erros da etapa de verificação (enviar_otp / validar_otp).
const MSG_OTP: Record<string, string> = {
  canal_invalido: 'Canal inválido. Escolha WhatsApp ou e-mail.',
  envio_falhou:
    'Não foi possível enviar o código agora. Tente novamente ou escolha outro canal.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  cpf_invalido: 'CPF inválido. Confira os números digitados.',
  codigo_expirado: 'O código expirou. Peça um novo para concluir.',
  tentativas_excedidas: 'Muitas tentativas. Peça um novo código para concluir.',
  resposta_invalida: 'Resposta inesperada do servidor. Tente novamente.',
};

const MSG_SUBMIT: Record<string, string> = {
  inscricoes_encerradas: 'As inscrições para este evento foram encerradas.',
  turnstile_falhou: 'A verificação de segurança falhou. Refaça a verificação e tente novamente.',
  validacao: 'Alguns dados não passaram na validação. Revise as informações e tente novamente.',
  criancas_invalidas: 'Confira os dados das crianças e tente novamente.',
  otp_nao_validado: 'Confirme o código de verificação para concluir a inscrição.',
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

  // Nome do trabalhador na base do sindicato, devolvido pela checagem do CPF.
  // Fica visível na própria etapa do CPF para a pessoa se reconhecer antes de
  // avançar; `cpfChecado` guarda os dígitos já checados para (a) não repetir a
  // chamada no clique seguinte — o token do Turnstile é de uso único — e (b)
  // apagar a saudação assim que o CPF digitado mudar.
  const [nomeAfsys, setNomeAfsys] = useState('');
  const [cpfChecado, setCpfChecado] = useState('');

  // Contatos mascarados do cadastro (mesma resposta da checagem). Exibidos na
  // etapa de contato para a pessoa reconhecer onde pode receber o código. Nunca
  // são comparados aqui com o que ela digita — quem confere é o servidor.
  const [contatosMasc, setContatosMasc] = useState({ whatsapp: '', email: '' });

  // Sindicalizado na base do sindicato: tira as etapas de Contribuinte e
  // Empresa do wizard (os dados vêm da própria checagem). O Holerite continua
  // sendo pedido normalmente.
  const [sindicalizado, setSindicalizado] = useState(false);
  // Isenção de holerite (empresa na lista do sindicato): tira a etapa Holerite.
  const [isentoHolerite, setIsentoHolerite] = useState(false);

  // ---- etapa de verificação (OTP) ----
  // Um único Turnstile atende as três chamadas da etapa (enviar, validar e o
  // submit). Como o token é de uso único, cada uma renova o desafio depois de
  // consumi-lo — por isso o submit espera o token novo chegar (concluirPendente).
  const [otpToken, setOtpToken] = useState('');
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [otpFase, setOtpFase] = useState<'envio' | 'codigo'>('envio');
  const [otpCodigo, setOtpCodigo] = useState('');
  const [otpErro, setOtpErro] = useState('');
  const [otpAviso, setOtpAviso] = useState('');
  const [otpEspera, setOtpEspera] = useState(0); // segundos até liberar o reenvio
  const [otpValidado, setOtpValidado] = useState(false);
  const [concluirPendente, setConcluirPendente] = useState(false);
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

  // Contagem regressiva do botão de reenviar (evita disparo em sequência).
  useEffect(() => {
    if (otpEspera <= 0) return;
    const t = setTimeout(() => setOtpEspera((seg) => seg - 1), 1000);
    return () => clearTimeout(t);
  }, [otpEspera]);

  // Código validado: o submit precisa de um token NOVO (o anterior foi gasto no
  // validar_otp). Assim que o desafio renovado responde, a inscrição segue.
  useEffect(() => {
    if (!concluirPendente || !otpToken) return;
    setConcluirPendente(false);
    void enviar(otpToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concluirPendente, otpToken]);

  // Rede de segurança: se o Turnstile não devolver token, libera o botão em vez
  // de deixar a pessoa presa em "Concluindo…".
  useEffect(() => {
    if (!concluirPendente) return;
    const t = setTimeout(() => {
      setConcluirPendente(false);
      setBusy(false);
      setOtpErro(
        'A verificação de segurança demorou a responder. Toque em "Concluir inscrição" para tentar de novo.'
      );
    }, 15000);
    return () => clearTimeout(t);
  }, [concluirPendente]);

  const pedeCriancas = evento?.pedeCriancas === true;
  const { steps: STEPS, S } = useMemo(
    () => montarEtapas(pedeCriancas, sindicalizado, isentoHolerite),
    [pedeCriancas, sindicalizado, isentoHolerite]
  );

  const semCnpj = form.temCnpj === 'Não';

  // CPF já checado no backend e saudação na tela: o próximo "Avançar" apenas
  // confirma. Não repete a chamada — e por isso também não exige um token novo
  // (o anterior já foi consumido e pode até ter expirado na leitura do nome).
  const cpfJaChecado = !!cpfChecado && cpfChecado === onlyDigits(form.cpf);

  // Canal escolhido para receber o código, e se o cadastro tem algum contato
  // para mostrar mascarado (sem nenhum, a etapa aparece como sempre foi).
  const prefereEmail = form.contatoPreferido === 'email';
  const temContatosMasc = !!(contatosMasc.whatsapp || contatosMasc.email);
  // Holerite pulado por "sem CNPJ" continua na régua, apenas marcado. Quando a
  // etapa nem existe (isento), não há o que marcar.
  const skipped = useMemo(
    () => (semCnpj && S.HOLERITE >= 0 ? [S.HOLERITE] : []),
    [semCnpj, S]
  );

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

  // Trocar o CPF invalida a checagem anterior: some com a saudação (o nome era
  // de outro CPF) e renova o desafio, já que o token anterior foi consumido.
  function alterarCpf(valor: string) {
    set('cpf', maskCPF(valor));
    if (!cpfChecado) return;
    setNomeAfsys('');
    setCpfChecado('');
    setContatosMasc({ whatsapp: '', email: '' });
    // Desfaz só o que a checagem preencheu sozinha: as etapas de vínculo voltam
    // a existir e passam a ser respondidas para o CPF novo.
    if (sindicalizado) {
      setSindicalizado(false);
      setForm((f) => ({ ...f, temCnpj: '', cnpj: '', empresaNome: '' }));
    }
    setIsentoHolerite(false);
    setErroCpf('');
    renovarCpfTurnstile();
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
      // Obrigatório é o canal escolhido para receber o código; o outro segue
      // opcional, mas se preenchido precisa ter formato válido. NÃO conferimos
      // aqui contra a máscara do cadastro — divergência é tratada no servidor.
      if (prefereEmail) {
        if (form.email.trim() === '') {
          e.email = 'Informe o e-mail onde você quer receber o código.';
        } else if (!isValidEmail(form.email)) {
          e.email = 'Informe um e-mail válido.';
        }
        if (form.whatsapp.trim() !== '' && !isValidPhone(form.whatsapp)) {
          e.whatsapp = 'Informe um WhatsApp válido com DDD.';
        }
      } else {
        if (!isValidPhone(form.whatsapp)) {
          e.whatsapp = 'Informe o WhatsApp onde você quer receber o código, com DDD.';
        }
        if (form.email.trim() !== '' && !isValidEmail(form.email)) {
          e.email = 'Informe um e-mail válido.';
        }
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
      // O clique agora é o "sim, sou eu": segue sem repetir a chamada.
      if (cpfJaChecado) {
        setStep(S.LGPD);
        return;
      }
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
        setContatosMasc({ whatsapp: r.whatsappMasc || '', email: r.emailMasc || '' });

        // Sindicalizado: Contribuinte e Empresa saem do wizard, e o que elas
        // coletariam vem da base. Sem CNPJ/empresa na resposta, o campo fica
        // vazio — nada é inventado e a pessoa não volta às etapas puladas.
        setIsentoHolerite(r.isentoHolerite === true);
        setSindicalizado(r.sindicalizado === true);
        if (r.sindicalizado === true) {
          setForm((f) => ({
            ...f,
            temCnpj: 'Sim',
            cnpj: r.cnpjAfsys ? maskCNPJ(r.cnpjAfsys) : '',
            empresaNome: r.empresaAfsys || '',
          }));
        }
        // Novo CPF. Com nome na base, para nesta etapa para a pessoa se
        // reconhecer (avança no próximo clique); sem nome — não associada ou
        // consulta indisponível — segue direto, sem alerta nenhum.
        if (r.nomeAfsys) {
          setNomeAfsys(r.nomeAfsys);
          setCpfChecado(onlyDigits(form.cpf));
          return;
        }
        setStep(S.LGPD); // segue para o consentimento
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
    // Da Verificação a volta é sempre para a Revisão — vale também no modo
    // completar pendência, que não tem passo próprio depois dela.
    if (step === S.OTP) {
      setStep(S.REVISAO);
      return;
    }

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

  // ---- etapa de verificação (OTP) ----

  function renovarOtpTurnstile() {
    setOtpToken('');
    setOtpResetKey((k) => k + 1);
  }

  // Contato do canal escolhido, como vai para o servidor e para o formulário.
  const destinoOtp = prefereEmail ? form.email.trim() : onlyDigits(form.whatsapp);

  function destinoValido(): boolean {
    return prefereEmail ? isValidEmail(form.email) : isValidPhone(form.whatsapp);
  }

  // Trocar de canal invalida o código já enviado: volta ao passo do envio.
  function trocarCanalOtp(canal: 'whatsapp' | 'email') {
    set('contatoPreferido', canal);
    setOtpFase('envio');
    setOtpCodigo('');
    setOtpErro('');
    setOtpAviso('');
    setOtpValidado(false);
  }

  async function pedirCodigo(reenvio: boolean) {
    if (!destinoValido()) {
      setOtpErro(
        prefereEmail
          ? 'Informe um e-mail válido para receber o código.'
          : 'Informe um WhatsApp válido com DDD para receber o código.'
      );
      return;
    }
    setOtpErro('');
    setOtpAviso('');
    setBusy(true);
    try {
      const r = await enviarOtp(form.cpf, evento!.slug, form.contatoPreferido, destinoOtp, otpToken);
      setOtpFase('codigo');
      setOtpCodigo('');
      setOtpEspera(60); // janela curta antes de liberar o reenvio
      setOtpAviso(
        `Código ${reenvio ? 'reenviado' : 'enviado'}${
          r.validadeMin ? ` — vale por ${r.validadeMin} minutos` : ''
        }.`
      );
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setOtpErro(MSG_OTP[code] || 'Não foi possível enviar o código agora. Tente novamente.');
    } finally {
      renovarOtpTurnstile(); // token consumido pela chamada (deu certo ou não)
      setBusy(false);
    }
  }

  async function validarEConcluir() {
    if (otpCodigo.length !== OTP_TAMANHO) {
      setOtpErro(`Digite os ${OTP_TAMANHO} dígitos do código.`);
      return;
    }
    setOtpErro('');
    setOtpAviso('');
    setBusy(true);
    try {
      const r = await validarOtp(form.cpf, evento!.slug, otpCodigo, otpToken);
      renovarOtpTurnstile();

      if (r.ok) {
        // Segue direto para o envio, assim que o token novo chegar.
        setOtpValidado(true);
        setConcluirPendente(true);
        return;
      }

      if (r.erro === 'codigo_invalido' && typeof r.restantes === 'number') {
        setOtpErro(
          r.restantes > 0
            ? `Código incorreto. ${r.restantes} ${
                r.restantes === 1 ? 'tentativa restante' : 'tentativas restantes'
              }.`
            : 'Código incorreto. Peça um novo código.'
        );
      } else {
        setOtpErro(MSG_OTP[r.erro || ''] || 'Código incorreto. Confira e tente novamente.');
      }
      // Expirado ou sem tentativas: só um código novo resolve.
      if (r.erro === 'codigo_expirado' || r.erro === 'tentativas_excedidas') {
        setOtpFase('envio');
        setOtpCodigo('');
      }
      setBusy(false);
    } catch {
      renovarOtpTurnstile();
      setOtpErro('Não foi possível validar o código agora. Tente novamente.');
      setBusy(false);
    }
  }

  async function enviar(token: string) {
    setErroSubmit('');
    setBusy(true);
    try {
      const r = await submitInscricao(form, evento!, token, completando);
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
      if (code === 'otp_nao_validado') {
        // A verificação caducou entre validar e enviar: recomeça pelo código.
        setOtpValidado(false);
        setOtpFase('envio');
        setOtpCodigo('');
        setStep(S.OTP);
        setOtpErro('Sua verificação expirou. Peça um novo código para concluir.');
      } else {
        setErroSubmit(
          MSG_SUBMIT[code] ||
            'Não foi possível enviar sua inscrição agora. Verifique a conexão e tente novamente.'
        );
      }
      // Token consumido pelo submit: renova o desafio da etapa.
      renovarOtpTurnstile();
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

  // Campos de contato da etapa "Seus dados". Ficam aqui porque a ORDEM deles
  // segue o canal escolhido (o escolhido primeiro, logo abaixo da escolha) e o
  // rótulo muda para marcar qual é o opcional.
  const campoWhatsapp = (
    <TextField
      key="whatsapp"
      label={'WhatsApp / Celular' + (prefereEmail ? ' (opcional)' : '')}
      value={form.whatsapp}
      onChange={(v) => set('whatsapp', maskPhone(v))}
      placeholder="(00) 00000-0000"
      inputMode="tel"
      error={errors.whatsapp}
    />
  );

  const campoEmail = (
    <TextField
      key="email"
      label={'E-mail' + (prefereEmail ? '' : ' (opcional)')}
      value={form.email}
      onChange={(v) => set('email', v)}
      placeholder="voce@exemplo.com"
      inputMode="email"
      error={errors.email}
      hint={prefereEmail ? undefined : 'Usamos para enviar avisos sobre a inscrição.'}
    />
  );

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
              onChange={alterarCpf}
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

            {nomeAfsys && (
              <div className="wz-note wz-hello">
                <b>Olá, {nomeAfsys}.</b>
                Encontramos seu cadastro no sindicato.
              </div>
            )}

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
            <p className="wz-lgpd">
              Confirme o contato onde você quer receber o código de verificação.
            </p>
            <TextField
              label="Nome completo"
              value={form.nomeCompleto}
              onChange={(v) => set('nomeCompleto', v)}
              placeholder="Seu nome completo"
              error={errors.nomeCompleto}
              autoFocus
            />

            {/* Canais do cadastro, sempre mascarados. Só aparecem quando o
                backend devolveu algum; sem nenhum, a pessoa informa do zero. */}
            {temContatosMasc && (
              <div className="wz-field">
                <span className="wz-label">Contatos no seu cadastro</span>
                <ul className="wz-review">
                  {contatosMasc.whatsapp && (
                    <li>
                      <span className="rk">WhatsApp</span>
                      <span className="rv">{contatosMasc.whatsapp}</span>
                    </li>
                  )}
                  {contatosMasc.email && (
                    <li>
                      <span className="rk">E-mail</span>
                      <span className="rv">{contatosMasc.email}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <ChoiceField
              label="Onde você quer receber o código de verificação?"
              options={['WhatsApp', 'E-mail']}
              value={prefereEmail ? 'E-mail' : 'WhatsApp'}
              onChange={(v) => set('contatoPreferido', v === 'E-mail' ? 'email' : 'whatsapp')}
            />

            {/* O campo do canal escolhido vem logo abaixo da escolha; o outro
                continua disponível, como opcional. */}
            {prefereEmail ? (
              <>
                {campoEmail}
                {campoWhatsapp}
              </>
            ) : (
              <>
                {campoWhatsapp}
                {campoEmail}
              </>
            )}

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
                {/* Pergunta não feita a quem já é sindicalizado. */}
                {!sindicalizado && (
                  <Item k="Quer se sindicalizar" v={form.querSindicalizar} />
                )}
                <Item k="Tem CNPJ" v={form.temCnpj} />
                {form.temCnpj === 'Sim' && <Item k="CNPJ" v={form.cnpj} />}
                {form.temCnpj === 'Sim' && <Item k="Empresa" v={form.empresaNome} />}
                {/* Etapa não percorrida (sem CNPJ ou empresa isenta) não vira linha. */}
                {!semCnpj && !isentoHolerite && (
                  <Item k="Possui holerite" v={form.possuiHolerite} />
                )}
                {form.possuiHolerite === 'Sim' && (
                  <Item k="Holerite" v={form.holeriteNome || 'Não anexado (ficará pendente)'} />
                )}
              </ul>
            )}

            <p className="wz-note">
              No próximo passo enviamos um código para confirmar sua inscrição.
            </p>
          </div>
        )}

        {step === S.OTP && (
          <div className="wz-step-body">
            <h3 className="wz-step-title">Verificação</h3>
            <p className="wz-lgpd">
              Para concluir, enviamos um código de {OTP_TAMANHO} dígitos. Confira o canal e o
              contato — se estiver errado, corrija aqui.
            </p>

            <ChoiceField
              label="Onde receber o código"
              options={['WhatsApp', 'E-mail']}
              value={prefereEmail ? 'E-mail' : 'WhatsApp'}
              onChange={(v) => trocarCanalOtp(v === 'E-mail' ? 'email' : 'whatsapp')}
            />

            {prefereEmail ? (
              <TextField
                key="otp-email"
                label="E-mail"
                value={form.email}
                onChange={(v) => {
                  set('email', v);
                  setOtpErro('');
                }}
                placeholder="voce@exemplo.com"
                inputMode="email"
              />
            ) : (
              <TextField
                key="otp-whatsapp"
                label="WhatsApp / Celular"
                value={form.whatsapp}
                onChange={(v) => {
                  set('whatsapp', maskPhone(v));
                  setOtpErro('');
                }}
                placeholder="(00) 00000-0000"
                inputMode="tel"
              />
            )}

            {otpFase === 'codigo' && (
              <TextField
                label="Código recebido"
                value={otpCodigo}
                onChange={(v) => {
                  setOtpCodigo(onlyDigits(v).slice(0, OTP_TAMANHO));
                  setOtpErro('');
                }}
                placeholder="000000"
                inputMode="numeric"
              />
            )}

            <div className="wz-verify">
              <span className="wz-label">Verificação de segurança</span>
              <Turnstile
                resetKey={otpResetKey}
                onVerify={(t) => setOtpToken(t)}
                onExpire={() => setOtpToken('')}
              />
            </div>

            {otpAviso && <p className="wz-note">{otpAviso}</p>}
            {otpErro && <p className="wz-err wz-err-block">{otpErro}</p>}
            {erroSubmit && <p className="wz-err wz-err-block">{erroSubmit}</p>}

            <div className="wz-nav">
              <button className="wz-btn-ghost" onClick={voltar} disabled={busy}>
                ← Voltar
              </button>

              {otpValidado ? (
                <button
                  className="wz-btn"
                  onClick={() => enviar(otpToken)}
                  disabled={busy || !otpToken}
                >
                  {busy ? 'Concluindo…' : 'Concluir inscrição'}
                </button>
              ) : otpFase === 'envio' ? (
                <button
                  className="wz-btn"
                  onClick={() => pedirCodigo(false)}
                  disabled={busy || !otpToken}
                >
                  {busy ? 'Enviando…' : 'Enviar código'}
                </button>
              ) : (
                <button
                  className="wz-btn"
                  onClick={validarEConcluir}
                  disabled={busy || !otpToken || otpCodigo.length !== OTP_TAMANHO}
                >
                  {busy ? 'Confirmando…' : 'Validar e concluir'}
                </button>
              )}
            </div>

            {otpFase === 'codigo' && !otpValidado && (
              <button
                className="wz-btn-ghost wz-reenviar"
                onClick={() => pedirCodigo(true)}
                disabled={busy || otpEspera > 0 || !otpToken}
              >
                {otpEspera > 0 ? `Reenviar código em ${otpEspera}s` : 'Não recebi — reenviar código'}
              </button>
            )}
          </div>
        )}

        {/* navegação (LGPD e Verificação têm seus próprios botões) */}
        {step !== S.LGPD && step !== S.OTP && (
          <div className="wz-nav">
            {step > S.CPF ? (
              <button className="wz-btn-ghost" onClick={voltar} disabled={busy}>
                ← Voltar
              </button>
            ) : (
              <span />
            )}
            <button
              className="wz-btn"
              onClick={avancar}
              disabled={busy || (step === S.CPF && !cpfToken && !cpfJaChecado)}
            >
              {busy ? 'Aguarde…' : (
                <>
                  {step === S.REVISAO ? 'Ir para a verificação' : 'Avançar'}{' '}
                  <span className="arr">→</span>
                </>
              )}
            </button>
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
