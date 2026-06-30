import { useEffect, useState } from 'react';
import type { Evento } from '../types';
import { getEventos, agruparPorStatus } from '../services/events';
import { useSite } from '../context/SiteContext';
import { useReveal } from '../hooks/useReveal';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { Lineup } from '../components/Lineup';
import { EventCard } from '../components/EventCard';

export function HubPage() {
  const site = useSite();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const ref = useReveal<HTMLDivElement>([eventos]);

  useEffect(() => {
    getEventos().then(setEventos);
  }, []);

  useEffect(() => {
    // Após carregar os eventos, reaplica o observer de reveal nos novos nós.
    if (eventos && window.location.hash) {
      const el = document.querySelector(window.location.hash);
      el?.scrollIntoView();
    }
  }, [eventos]);

  const grupos = eventos ? agruparPorStatus(eventos) : null;

  return (
    <div ref={ref}>
      <Nav />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow"><span className="live" /> Eventos do sindicato · {site.ano}</span>
          <h1>A agenda que <span className="grad">move</span><br />a categoria.</h1>
          <p>Corridas, homenagens e sorteios do sindicato. Inscrição online, na hora, sem filas.</p>
          <button
            className="btn-xl"
            onClick={() => document.getElementById('abertas')?.scrollIntoView()}
          >
            Ver inscrições abertas <span className="arr">→</span>
          </button>
        </div>
      </header>

      {eventos && <Lineup eventos={eventos} />}

      {grupos && (
        <>
          <section className="section" id="abertas">
            <div className="wrap">
              <div className="sec-head reveal">
                <span className="badge-stat open"><span className="pin" />Inscrições abertas</span>
                <h2>Participe agora</h2>
                <span className="count">{grupos.aberto.length} evento{grupos.aberto.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="cards">
                {grupos.aberto.map((ev) => (
                  <EventCard key={ev.id} evento={ev} featured />
                ))}
              </div>
            </div>
          </section>

          {grupos.em_breve.length > 0 && (
            <section className="section" id="breve">
              <div className="wrap">
                <div className="sec-head reveal">
                  <span className="badge-stat soon"><span className="pin" />Em breve</span>
                  <h2>Próximos eventos</h2>
                  <span className="count">{grupos.em_breve.length} eventos</span>
                </div>
                <div className="cards two">
                  {grupos.em_breve.map((ev) => (
                    <EventCard key={ev.id} evento={ev} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {grupos.encerrado.length > 0 && (
            <section className="section" id="passados">
              <div className="wrap">
                <div className="sec-head reveal">
                  <span className="badge-stat closed"><span className="pin" />Já aconteceram</span>
                  <h2>Eventos realizados</h2>
                  <span className="count">{grupos.encerrado.length} evento{grupos.encerrado.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="cards two">
                  {grupos.encerrado.map((ev) => (
                    <EventCard key={ev.id} evento={ev} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="about">
        <div className="wrap">
          <div className="about-card reveal">
            <div className="grid">
              <div>
                <h2>Quem move a hospitalidade<br />merece ser celebrado.</h2>
                <p>
                  O sindicato promove o ano todo corridas, homenagens e ações para reconhecer
                  os trabalhadores de hotéis, bares e restaurantes. Todas as inscrições, num só lugar.
                </p>
              </div>
              {site.stats && (
                <div className="stats">
                  {site.stats.map((s, i) => (
                    <div className="stat" key={i}>
                      <div className={'n' + (s.ph ? ' ph' : '')}>{s.n}</div>
                      <div className="l">{s.l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
