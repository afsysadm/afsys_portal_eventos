import { useEffect, useMemo, useState } from 'react';
import type { Evento } from '../types';
import { getEventos, agruparPorStatus } from '../services/events';
import { useSite } from '../context/SiteContext';
import { useReveal } from '../hooks/useReveal';
import { Nav } from '../components/Nav';
import { Footer } from '../components/Footer';
import { EventCard } from '../components/EventCard';

type TabKey = 'aberto' | 'em_breve' | 'encerrado';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'aberto', label: 'Abertas' },
  { key: 'em_breve', label: 'Em breve' },
  { key: 'encerrado', label: 'Realizados' },
];

// Mapeia o hash da URL (nav/footer) para a aba correspondente.
const HASH_TAB: Record<string, TabKey> = {
  '#abertas': 'aberto',
  '#breve': 'em_breve',
  '#passados': 'encerrado',
};

export function HubPage() {
  const site = useSite();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [tab, setTab] = useState<TabKey>(() => HASH_TAB[window.location.hash] ?? 'aberto');
  const ref = useReveal<HTMLDivElement>([eventos, tab]);

  useEffect(() => {
    getEventos().then(setEventos);
  }, []);

  // Links de nav/rodapé (#abertas/#breve/#passados) trocam a aba e rolam até
  // a seção de eventos mesmo quando já estamos na home.
  useEffect(() => {
    function onHash() {
      const alvo = HASH_TAB[window.location.hash];
      if (!alvo) return;
      setTab(alvo);
      document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const grupos = useMemo(() => (eventos ? agruparPorStatus(eventos) : null), [eventos]);

  const listaPorAba: Record<TabKey, Evento[]> = {
    aberto: grupos?.aberto ?? [],
    em_breve: grupos?.em_breve ?? [],
    encerrado: grupos?.encerrado ?? [],
  };

  function irParaEventos(destino: TabKey) {
    setTab(destino);
    document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' });
  }

  const ativos = listaPorAba[tab];

  return (
    <div ref={ref}>
      <Nav />

      <header className="hero">
        <div className="wrap">
          <span className="eyebrow"><span className="live" /> Eventos do sindicato · {site.ano}</span>
          <h1>A agenda que move a categoria.</h1>
          <p>Corridas, homenagens e sorteios do sindicato. Inscrição online, na hora, sem filas.</p>
          <button className="btn-on-band" onClick={() => irParaEventos('aberto')}>
            Ver inscrições abertas <span className="arr">→</span>
          </button>
        </div>
      </header>

      <section className="section" id="eventos">
        <div className="wrap">
          <div className="sec-head reveal">
            <h2>Eventos</h2>
            <p>Escolha um evento para ver os detalhes e se inscrever.</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Filtrar eventos">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={'tab' + (tab === t.key ? ' on' : '')}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {grupos && <span className="n">{listaPorAba[t.key].length}</span>}
              </button>
            ))}
          </div>

          {grupos && (
            ativos.length > 0 ? (
              <div className="cards">
                {ativos.map((ev) => (
                  <EventCard key={ev.id} evento={ev} />
                ))}
              </div>
            ) : (
              <p className="tab-empty">
                {tab === 'aberto'
                  ? 'Nenhuma inscrição aberta no momento. Volte em breve!'
                  : tab === 'em_breve'
                  ? 'Nenhum evento programado por enquanto.'
                  : 'Ainda não há eventos realizados.'}
              </p>
            )
          )}
        </div>
      </section>

      <section className="about">
        <div className="wrap">
          <div className="about-card reveal">
            <div className="grid">
              <div>
                <h2>Quem move a hospitalidade merece ser celebrado.</h2>
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
