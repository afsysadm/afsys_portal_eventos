import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Evento } from '../types';
import { EVENT_COLORS } from '../theme/palette';
import { useToast } from '../context/ToastContext';

interface Props {
  evento: Evento;
  featured?: boolean;
}

export function EventCard({ evento, featured }: Props) {
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

  const classes = ['ev'];
  if (featured) classes.push('feat');
  if (encerrado) classes.push('closed');

  return (
    <article className={classes.join(' ') + ' reveal'} style={style} onClick={handleClick}>
      <div className="poster">
        {aberto && (
          <span className="badge-open"><span className="pin" />Inscrições abertas</span>
        )}
        {evento.status === 'em_breve' && <span className="badge-soft soon">Em breve</span>}
        {encerrado && <span className="badge-soft closed">Encerrado</span>}
        <div className="glow-blob" />
        <div className="big">{evento.tituloPoster ?? evento.titulo}</div>
        {evento.edicao && <span className="ed">{evento.edicao}</span>}
      </div>
      <div className="info">
        <div className="kick">{evento.kicker}</div>
        <h3>{evento.titulo}</h3>
        <p className="d">{evento.descricao}</p>
        <div className="win">
          {evento.metas.map((m, i) => (
            <div key={i}>
              <div className="k">{m.k}</div>
              <div className={'v' + (m.ph ? ' ph' : '')}>{m.v}</div>
            </div>
          ))}
        </div>
        {aberto ? (
          <span className="go">
            <span className="cta">{evento.goLabel ?? 'Ver e inscrever-se'}</span>{' '}
            <span className="arr">→</span>
          </span>
        ) : (
          <span className="go muted">{evento.goLabel}</span>
        )}
      </div>
    </article>
  );
}
