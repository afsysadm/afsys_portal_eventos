import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import type { TenantConfig } from '../config/tenants';
import { resolveTenant, applyTenantTheme } from '../config/tenants';

// Identidade/marca/contato do sindicato (tenant). Separado do SiteContext, que
// cuida de conteúdo de exibição da agenda (ano, estatísticas).
const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const tenant = useMemo(() => resolveTenant(), []);

  // Aplica a cor da marca antes da pintura (evita flash da cor default).
  useLayoutEffect(() => {
    applyTenantTheme(tenant);
  }, [tenant]);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant deve ser usado dentro de <TenantProvider>');
  return ctx;
}
