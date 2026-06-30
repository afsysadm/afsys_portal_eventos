import type { CorEvento, SiteTheme } from '../types';

// Cor real (hex) de cada cor neon de evento.
// Mantida fixa (paleta da plataforma) para coerência visual entre clientes.
export const EVENT_COLORS: Record<CorEvento, string> = {
  lime: '#A3E635',
  cyan: '#27D3EE',
  amber: '#FBBF24',
  magenta: '#FF2E7E',
  violet: '#A855F7',
  emerald: '#34E0A1',
};

// Tema padrão "Festival" (o visual aprovado).
// Para um novo cliente, basta criar outro SiteTheme alterando estas variáveis
// (cores de fundo, cor primária/secundária dos CTAs e tipografia) — a estrutura
// e os componentes permanecem os mesmos.
export const THEME_FESTIVAL: SiteTheme = {
  id: 'festival',
  vars: {
    '--bg': '#120A1F',
    '--bg2': '#0A0613',
    '--text': '#F7F3FF',
    '--soft': '#C2B6DD',
    '--dim': '#897DA8',
    '--line': 'rgba(255,255,255,.12)',
    '--glass': 'rgba(255,255,255,.045)',
    '--glass-2': 'rgba(255,255,255,.08)',
    // cores de acento da plataforma (também usadas pelos eventos)
    '--magenta': '#FF2E7E',
    '--violet': '#A855F7',
    '--cyan': '#27D3EE',
    '--amber': '#FBBF24',
    '--lime': '#A3E635',
    '--emerald': '#34E0A1',
    // cor primária dos CTAs (degradê) — derivada das de acento
    '--cta-from': '#FF2E7E',
    '--cta-to': '#A855F7',
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
