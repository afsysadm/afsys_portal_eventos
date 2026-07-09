import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Evento, MetaItem } from '../types';
import { EVENT_COLORS } from '../theme/palette';
import { useToast } from '../context/ToastContext';

interface Props {
  evento: Evento;
}

// Ícone escolhido pelo rótulo da meta: local → pino de mapa; datas → calendário.
function MetaIcon({ label }: { label: string }) {
  const isLocal = /local|onde|endere/i.test(label);
  return isLocal ? <IconMapPin /> : <IconCalendar />;
}

export function EventCard({ evento }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const cor = EVENT_COLORS[evento.cor];
  const style = { '--ev': cor } as CSSProperties;

  const aberto = evento.status === 'aberto';
  const encerrado = evento.status === 'encerrado';

  function handleClick() {
    if (aberto) {
      navigate(`/evento/${evento.slug}`);
    } else if (encerrado) {
      toast('Este evento já foi realizado. Inscrições encerradas.');
    } else {
      toast('As inscrições deste evento ainda não abriram. Em breve!');
    }
  }

  return (
    <article
      className={'ev reveal' + (encerrado ? ' closed' : '')}
      style={style}
      onClick={handleClick}
    >
      <div className="poster">
        {aberto && (
          <span className="badge-open"><span className="pin" />Inscrições abertas</span>
        )}
        {evento.status === 'em_breve' && <span className="badge-soft">Em breve</span>}
        {encerrado && <span className="badge-soft">Encerrado</span>}
        <div className="big">{evento.tituloPoster ?? evento.titulo}</div>
        {evento.edicao && <span className="ed">{evento.edicao}</span>}
      </div>
      <div className="info">
        <div className="kick">{evento.kicker}</div>
        <h3>{evento.titulo}</h3>
        <p className="d">{evento.descricao}</p>
        <div className="win">
          {evento.metas.map((m: MetaItem, i) => (
            <div className="row" key={i}>
              <span className="ic"><MetaIcon label={m.k} /></span>
              <span className={'v' + (m.ph ? ' ph' : '')}>{m.v}</span>
            </div>
          ))}
        </div>
        {aberto ? (
          <span className="go">
            <span className="cta">
              {evento.goLabel ?? 'Fazer inscrição'} <span className="arr">→</span>
            </span>
          </span>
        ) : (
          <span className="go muted">{evento.goLabel}</span>
        )}
      </div>
    </article>
  );
}

// Ícones (estilo Tabler) inline, herdam a cor via currentColor (--brand).
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
      <path d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
    </svg>
  );
}
