export default function Header({ settings }) {
  const { title, tagline, logoUrl } = settings;

  return (
    <header>
      <div className="header-content">
        <div className="logo-section">
          {logoUrl && <img src={logoUrl} alt={title} className="store-logo" />}
          <h1>{title}</h1>
          <p>{tagline}</p>
        </div>
        <div className="header-actions">
          <span>📱 Compra por WhatsApp</span>
        </div>
      </div>
    </header>
  );
}
