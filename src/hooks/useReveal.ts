import { useEffect, useRef } from 'react';
import type { DependencyList } from 'react';

// Revela elementos com a classe `.reveal` ao entrarem na viewport.
// Respeita prefers-reduced-motion (revela tudo de imediato).
// Aceita uma lista de dependências para re-observar elementos carregados
// de forma assíncrona (ex.: após o fetch dos eventos).
export function useReveal<T extends HTMLElement = HTMLDivElement>(deps: DependencyList = []) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Apenas os elementos que ainda não foram revelados.
    const els = Array.from(root.querySelectorAll<HTMLElement>('.reveal:not(.in)'));
    if (els.length === 0) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
