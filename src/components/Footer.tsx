import { useTenant } from '../context/TenantContext';
import { TenantLogo } from './TenantLogo';

export function Footer() {
  const tenant = useTenant();
  const ano = new Date().getFullYear();
  const { contato } = tenant;

  // Instagram: aceita handle (@x) ou URL; site: aceita domínio ou URL.
  const igHandle = contato.instagram?.replace(/^@/, '');
  const igUrl = contato.instagram?.startsWith('http')
    ? contato.instagram
    : `https://instagram.com/${igHandle}`;
  const siteUrl = contato.site?.startsWith('http') ? contato.site : `https://${contato.site}`;

  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div className="foot-brand">
            <div className="brand" style={{ cursor: 'default' }}>
              <TenantLogo size={44} />
              <div className="txt">
                <b>{tenant.nomeCurto}</b>
                <span>{tenant.regiao}</span>
              </div>
            </div>
            <p className="foot-legal">{tenant.nomeCompleto}</p>
          </div>

          <div className="foot-col">
            <h5>Eventos</h5>
            <a href="/#abertas">Inscrições abertas</a>
            <a href="/#breve">Em breve</a>
            <a href="/#passados">Realizados</a>
          </div>

          <div className="foot-col">
            <h5>Contato</h5>
            <p>{contato.endereco}</p>
            <a href={`tel:${contato.telefone.replace(/[^\d+]/g, '')}`}>{contato.telefone}</a>
            <a href={`mailto:${contato.email}`}>{contato.email}</a>
            {contato.instagram && (
              <a href={igUrl} target="_blank" rel="noopener noreferrer">
                Instagram {contato.instagram}
              </a>
            )}
            {contato.site && (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                {contato.site}
              </a>
            )}
          </div>
        </div>

        <div className="foot-bottom">
          <span>© {ano} · {tenant.nomeCurto}</span>
          <span>Tecnologia AFSYS Sistemas</span>
        </div>
      </div>
    </footer>
  );
}
