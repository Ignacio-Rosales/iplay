import { useState, useEffect, useCallback } from 'react';
import { getOptimizedImageUrl } from '../services/cloudinary';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 40;

export default function BannerSlider({ banners, onInternalLink }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const count = banners.length;
  // Si un banner se desactiva/borra mientras se navega, el índice puede quedar fuera de rango.
  const index = count > 0 ? current % count : 0;

  const goTo = useCallback((i) => setCurrent((i + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  const renderSlide = (banner, i) => {
    const img = (
      <img
        src={getOptimizedImageUrl(banner.image, 1600)}
        alt={banner.alt || 'Banner'}
        loading={i === 0 ? 'eager' : 'lazy'}
        decoding="async"
        draggable="false"
      />
    );

    if (banner.linkType === 'external' && banner.linkUrl) {
      return (
        <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="banner-link">
          {img}
        </a>
      );
    }
    if (banner.linkType === 'filter') {
      return (
        <button type="button" className="banner-link" onClick={() => onInternalLink(banner)}>
          {img}
        </button>
      );
    }
    return <div className="banner-static">{img}</div>;
  };

  return (
    <section
      className="banner-slider"
      aria-roledescription="carrusel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
    >
      <div className="banner-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((banner, i) => (
          <div
            className="banner-slide"
            key={banner.id}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {renderSlide(banner, i)}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" className="banner-arrow banner-arrow-prev" onClick={() => goTo(index - 1)} aria-label="Anterior">
            ‹
          </button>
          <button type="button" className="banner-arrow banner-arrow-next" onClick={() => goTo(index + 1)} aria-label="Siguiente">
            ›
          </button>
          <div className="banner-dots">
            {banners.map((banner, i) => (
              <button
                type="button"
                key={banner.id}
                className={`banner-dot ${i === index ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Ir al banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
