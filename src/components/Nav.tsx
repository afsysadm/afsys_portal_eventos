import { useNavigate } from 'react-router-dom';
import { useSite } from '../context/SiteContext';

export function Nav() {
  const site = useSite();
  const navigate = useNavigate();

  return (
    <nav className="nav">
      <div className="wrap">
        <button className="brand" onClick={() => navigate('/')} aria-label="Início">
          <div className="mark">{site.marca}</div>
          <div className="txt">
            <b>{site.nome}</b>
            <span>{site.subtitulo}</span>
          </div>
        </button>
        <div className="nav-links">
          <a href="/#abertas">Abertas</a>
          <a href="/#breve">Em breve</a>
          <a href="/#passados">Realizados</a>
          <a href="/#eventos" className="nav-area">Área do trabalhador</a>
        </div>
      </div>
    </nav>
  );
}
