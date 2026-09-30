import { socialUrl, externalUrl } from '../utils/links';
import SocialIcon from './SocialIcons';

export default function Footer({ settings }) {
  const { title, whatsappNumber, instagram, facebook, tiktok, address, mapUrl, hours } = settings;

  const socials = [
    { label: 'Instagram', url: socialUrl(instagram, 'https://instagram.com/') },
    { label: 'Facebook', url: socialUrl(facebook, 'https://facebook.com/') },
    { label: 'TikTok', url: socialUrl(tiktok, 'https://www.tiktok.com/@') }
  ].filter(s => s.url);

  const addressText = (address ?? '').trim();
  const hoursText = (hours ?? '').trim();
  const mapLink = externalUrl(mapUrl);

  // Sin ningún dato cargado en el admin no se muestra el footer: el WhatsApp solo
  // no alcanza, porque ya está disponible en el carrito y en cada producto.
  if (socials.length === 0 && !addressText && !hoursText && !mapLink) return null;

  const whatsappDigits = (whatsappNumber ?? '').replace(/\D/g, '');
  if (whatsappDigits) {
    socials.push({ label: 'WhatsApp', url: `https://wa.me/${whatsappDigits}` });
  }

  return (
    <footer className="site-footer">
      <div className="footer-content">
        {socials.length > 0 && (
          <div className="footer-block">
            <h4>Seguinos</h4>
            <div className="footer-links">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                >
                  <SocialIcon name={s.label} />
                </a>
              ))}
            </div>
          </div>
        )}

        {(addressText || mapLink) && (
          <div className="footer-block">
            <h4>Dónde estamos</h4>
            {addressText && <p>{addressText}</p>}
            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="footer-map-link">
                Ver en el mapa
              </a>
            )}
          </div>
        )}

        {hoursText && (
          <div className="footer-block">
            <h4>Horarios</h4>
            <p className="footer-hours">{hoursText}</p>
          </div>
        )}
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} {title}</p>
    </footer>
  );
}
