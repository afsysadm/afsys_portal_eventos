import { useState, type CSSProperties } from 'react';
import { useTenant } from '../context/TenantContext';

// Logo (brasão) do sindicato, circular, sobre fundo claro (header/rodapé).
// Enquanto o arquivo .webp não estiver disponível, cai num monograma com as
// iniciais sobre a cor da marca — nunca mostra imagem quebrada.
export function TenantLogo({ size = 42 }: { size?: number }) {
  const t = useTenant();
  const [failed, setFailed] = useState(false);
  const dim: CSSProperties = { width: size, height: size };

  const iniciais =
    t.nomeCurto
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || t.nomeCurto.slice(0, 2).toUpperCase();

  if (failed || !t.logo) {
    return (
      <div className="brand-logo brand-logo--mono" style={dim} aria-label={t.nomeCurto}>
        {iniciais}
      </div>
    );
  }

  return (
    <img
      className="brand-logo"
      style={dim}
      src={t.logo}
      alt={t.nomeCurto}
      onError={() => setFailed(true)}
    />
  );
}
