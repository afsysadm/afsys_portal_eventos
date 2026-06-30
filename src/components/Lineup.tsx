import type { Evento } from '../types';

const CLASSE_COR: Record<string, string> = {
  lime: 'c-lime',
  cyan: 'c-cyan',
  amber: 'c-amber',
  magenta: 'c-magenta',
  violet: 'c-violet',
  emerald: 'c-emerald',
};

// Ticker estilo "line-up de festival" com os nomes dos eventos.
// A lista é duplicada para o scroll infinito (translateX -50%).
export function Lineup({ eventos }: { eventos: Evento[] }) {
  const itens = eventos.map((e) => ({ nome: e.titulo, classe: CLASSE_COR[e.cor] ?? '' }));
  const sequencia = [...itens, ...itens];

  return (
    <div className="wrap">
      <div className="lineup" aria-hidden="true">
        <div className="lineup-track">
          {sequencia.map((it, i) => (
            <span key={i} className={it.classe}>
              {it.nome}
              <span className="sep">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
