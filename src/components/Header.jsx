import { useCart } from '../context/useCart';

export default function Header({ settings }) {
  const { title, tagline, logoUrl } = settings;
  const { totalCount, openCart } = useCart();

  return (
    <header>
      <div className="header-content">
        <div className="logo-section">
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
