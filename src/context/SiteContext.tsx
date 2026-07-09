import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SiteConfig } from '../types';
import { getSiteConfig } from '../services/siteConfig';

const SiteContext = createContext<SiteConfig | null>(null);

// Conteúdo de exibição da agenda (ano, estatísticas). A cor da marca e a
// identidade do sindicato vêm do TenantContext (config/tenants.ts) — por isso
// aqui NÃO aplicamos mais tema, para não sobrescrever o --brand do tenant.
export function SiteProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);

  useEffect(() => {
    let alive = true;
    getSiteConfig().then((cfg) => {
      if (!alive) return;
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
