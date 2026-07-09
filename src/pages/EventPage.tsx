import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Evento } from '../types';
import { getEvento } from '../services/events';
import { EVENT_COLORS } from '../theme/palette';
import { useReveal } from '../hooks/useReveal';
import { Nav } from '../components/Nav';

export function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);
  const ref = useReveal<HTMLDivElement>([evento]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;
    getEvento(slug).then(setEvento);
  }, [slug]);

  // Carregando
  if (evento === undefined) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 22px', color: 'var(--muted)' }}>Carregando…</div>
      </div>
    );
  }

  // Não encontrado
  if (evento === null) {
    return (
      <div>
        <Nav />
        <div className="wrap" style={{ padding: '80px 26px' }}>
          <h1 style={{ fontFamily: 'var(--display)', marginBottom: 16 }}>Evento não encontrado</h1>
          <button className="back" onClick={() => navigate('/')}>← Voltar aos eventos</button>
        </div>
      </div>
    );
  }

  const cor = EVENT_COLORS[evento.cor];
  const style = { '--ev': cor } as CSSProperties;
  const det = evento.detalhe;
  const slugAtual = evento.slug;

  function inscrever() {
    navigate(`/evento/${slugAtual}/inscricao`);
  }

  return (
    <div ref={ref}>
      <Nav />

      <div className="ev-hero" style={style}>
        <div className="eglow" />
        <div className="wrap">
          <button className="back" onClick={() => navigate('/')}>← Voltar aos eventos</button>
          <div>
            <span className="ev-tag"><span className="pin" />Inscrições abertas</span>
          </div>
          <h1>{evento.tituloPoster ?? evento.titulo}</h1>
          {det && <p className="lead">{det.lead}</p>}
          <div className="ev-meta">
            {(det?.resumo ?? evento.metas).slice(0, 3).map((m, i) => (
              <div key={i}>
                <div className="k">{m.k}</div>
                <div className={'v' + (m.ph ? ' ph' : '')}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {det && (
        <div className="ev-body">
          <div className="wrap ev-cols">
            <div>
              <h2>Sobre o evento</h2>
              {det.sobre.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h2 style={{ marginTop: 32 }}>Como se inscrever</h2>
              <p>A inscrição é online e leva poucos minutos. Tenha o CPF em mãos.</p>
              <div className="steps">
                {det.passos.map((s, i) => (
                  <div className="step" key={i}>
                    <h5>{s.titulo}</h5>
                    <p>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="infobox" style={style}>
              <h4>Resumo</h4>
              {det.resumo.map((m, i) => (
                <div className="row" key={i}>
                  <span className="k">{m.k}</span>
                  <span className={'v' + (m.ph ? ' ph' : '')}>{m.v}</span>
                </div>
              ))}
              <button className="btn" onClick={inscrever}>Inscreva-se →</button>
              <p className="hint">Inscrição online · protocolo na hora</p>
            </aside>
          </div>
        </div>
      )}

      <footer>
        <div className="wrap">
          <div className="foot-bottom" style={{ border: 'none', margin: 0, padding: 0 }}>
            <span>© 2026 {evento.titulo}</span>
            <span>hoteleiros.afsys.com.br</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
