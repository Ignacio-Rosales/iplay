import { useCart } from '../context/useCart';
import { getOptimizedImageUrl } from '../services/cloudinary';

export default function Header({ settings }) {
  const { title, tagline, logoUrl, headerBgUrl, headerOverlay } = settings;
  const { totalCount, openCart } = useCart();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // El overlay oscuro va sobre la imagen para que título y carrito siempre se lean.
  const overlay = Math.min(90, Math.max(0, Number(headerOverlay) || 0)) / 100;
  const headerStyle = headerBgUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, ${overlay}), rgba(0, 0, 0, ${overlay})), url("${getOptimizedImageUrl(headerBgUrl, 1600)}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : undefined;

  return (
    <header style={headerStyle}>
      <div className="header-content">
        <div
          className="logo-section"
          onClick={scrollToTop}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToTop(); }}
          role="button"
          tabIndex={0}
        >
          {logoUrl && <img src={logoUrl} alt={title} className="store-logo" />}
          <h1>{title}</h1>
          <p>{tagline}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-cart" onClick={openCart}>
            🛒 Carrito
            {totalCount > 0 && <span className="cart-badge">{totalCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
