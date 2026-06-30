import { useSite } from '../context/SiteContext';

export function Footer() {
  const site = useSite();
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div className="brand" style={{ cursor: 'default' }}>
            <div className="mark">{site.marca}</div>
            <div className="txt">
              <b>{site.nome}</b>
              <span>{site.subtitulo}</span>
            </div>
          </div>
          <div className="foot-col">
            <h5>Eventos</h5>
            <a href="/#abertas">Inscrições abertas</a>
            <a href="/#breve">Em breve</a>
            <a href="/#passados">Realizados</a>
          </div>
          <div className="foot-col">
            <h5>Institucional</h5>
            {site.contato?.endereco && <p className="ph-soft">{site.contato.endereco}</p>}
            {site.contato?.whatsapp && <p className="ph-soft">{site.contato.whatsapp}</p>}
            <p>Tecnologia AFSYS Sistemas</p>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {site.ano} · <span className="ph-soft">{site.nome}</span></span>
          <span>hoteleiros.afsys.com.br</span>
        </div>
      </div>
    </footer>
  );
}
