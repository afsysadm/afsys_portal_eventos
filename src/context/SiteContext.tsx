import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SiteConfig } from '../types';
import { getSiteConfig } from '../services/siteConfig';
import { applyTheme } from '../theme/palette';

const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    let alive = true;
    getSiteConfig().then((cfg) => {
      if (!alive) return;
      applyTheme(cfg.theme);
      setConfig(cfg);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!config) {
    // Estado de carregamento mínimo (evita flash sem tema).
    return null;
  }

  return <SiteContext.Provider value={config}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteConfig {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite deve ser usado dentro de <SiteProvider>');
  return ctx;
}
