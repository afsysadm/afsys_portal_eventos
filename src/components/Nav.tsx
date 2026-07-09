import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { TenantLogo } from './TenantLogo';

export function Nav() {
  const tenant = useTenant();
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="wrap">
        <button className="brand" onClick={() => navigate('/')} aria-label="Início">
          <TenantLogo size={42} />
          <div className="txt">
            <b>{tenant.nomeCurto}</b>
            <span>{tenant.regiao}</span>
          </div>
        </button>
        <div className="nav-links">
          <a href="/#abertas">Abertas</a>
          <a href="/#breve">Em breve</a>
          <a href="/#passados">Realizados</a>
        </div>
      </div>
    </nav>
  );
}
