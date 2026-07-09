import type { CorEvento, SiteTheme } from '../types';

// Cor de acento de cada evento (faixa superior do card + realces).
// Tons saturados que mantêm bom contraste com texto branco sobre a faixa,
// coerentes com a identidade institucional azul.
export const EVENT_COLORS: Record<CorEvento, string> = {
  lime: '#2E9E5B',    // verde
  cyan: '#0E9AAE',    // teal
  amber: '#C67C0A',   // âmbar
  magenta: '#C2317A', // rosa
  violet: '#6D4AC0',  // roxo
  emerald: '#0A5FD4', // azul (marca)
};

// Tema institucional padrão (claro/azul). Para um novo cliente, basta trocar
// --brand / --brand-dark / --brand-soft por SiteTheme — a estrutura e os
// componentes permanecem os mesmos (tema por tenant).
export const THEME_FESTIVAL: SiteTheme = {
  id: 'institucional',
  vars: {
    // COR DA MARCA — trocar só estas 3 por sindicato
    '--brand': '#0A5FD4',
    '--brand-dark': '#0847A8',
    '--brand-soft': '#EAF3FF',
    // superfícies
    '--bg': '#FFFFFF',
    '--surface': '#FFFFFF',
    '--bg-alt': '#F2F5F9',
    // texto
    '--ink': '#1A2230',
    '--muted': '#5A6475',
    '--dim': '#8A93A3',
    '--line': '#E8EBF0',
    // tipografia
    '--display': "'Syne', system-ui, sans-serif",
    '--ui': "'Inter', system-ui, -apple-system, sans-serif",
  },
};

// Aplica um tema como CSS custom properties no documento.
export function applyTheme(theme: SiteTheme): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }
}
