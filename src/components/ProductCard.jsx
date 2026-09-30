import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../context/useCart';
import { formatPrice } from '../utils/format';
import { getOptimizedImageUrl } from '../services/cloudinary';
import { PRODUCT_TAGS, getRibbonKey, matchesAnyTag } from '../utils/productTags';

const NO_TAGS = [];

// Con filtros de etiqueta activos se prefiere primero una variante que los cumpla, y sobre
// ese conjunto se aplican el color y el modelo elegidos (mismo orden de prioridad que antes).
const pickVariant = (variants, preferredColor, preferredModel, selectedTags) => {
  let pool = variants;
  if (selectedTags.length > 0) {
    const tagged = variants.filter(v => matchesAnyTag(v, selectedTags));
    if (tagged.length) pool = tagged;
  }
  if (preferredColor) {
    const byColor = pool.filter(v => v.color === preferredColor);
    if (byColor.length) pool = byColor;
  }
  if (preferredModel) {
    const match = pool.find(v => v.model === preferredModel);
    if (match) return match;
  }
  return pool[0] ?? null;
};

export default function ProductCard({ product, preferredModel, preferredColor, selectedTags = NO_TAGS }) {
  const { addItem } = useCart();
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const colors = useMemo(() => [...new Set(variants.map(v => v.color).filter(Boolean))], [variants]);

  const [selectedVariant, setSelectedVariant] = useState(() => pickVariant(variants, preferredColor, preferredModel, selectedTags));
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (userPickedRef.current) return;
    setSelectedVariant(pickVariant(variants, preferredColor, preferredModel, selectedTags));
  }, [variants, preferredColor, preferredModel, selectedTags]);

  useEffect(() => {
    if (!isImageZoomed) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsImageZoomed(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isImageZoomed]);

  if (!selectedVariant) {
    return null;
  }

  const modelsForSelectedColor = variants.filter(v => v.color === selectedVariant.color);

  const handleSelectColor = (color) => {
    userPickedRef.current = true;
    const pool = variants.filter(v => v.color === color);
    const keepModel = pool.find(v => v.model === selectedVariant.model);
    setSelectedVariant(keepModel || pool[0]);
  };

  const handleStepColor = (step) => {
    if (colors.length < 2) return;
    const currentIndex = colors.indexOf(selectedVariant.color);
    const nextIndex = (currentIndex + step + colors.length) % colors.length;
    handleSelectColor(colors[nextIndex]);
  };

  const handleSelectModel = (variant) => {
    userPickedRef.current = true;
    setSelectedVariant(variant);
  };

  const finalPrice = selectedVariant.discount
    ? formatPrice(selectedVariant.price * (1 - selectedVariant.discount / 100))
    : formatPrice(selectedVariant.price)

  const stock = selectedVariant.stock ?? 0;
  const inStock = stock > 0;
  const rawImage = selectedVariant.image || product.image;
  const ribbonKey = getRibbonKey(selectedVariant);

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        {ribbonKey && (
          <span className={`product-ribbon ribbon-${ribbonKey}`}>{PRODUCT_TAGS[ribbonKey].label}</span>
        )}
        <img
          src={getOptimizedImageUrl(rawImage, 400)}
          alt={product.name}
          className="zoomable-image"
          loading="lazy"
          decoding="async"
          onClick={() => setIsImageZoomed(true)}
        />

        {isImageZoomed && createPortal(
          <div className="image-zoom-overlay" onClick={() => setIsImageZoomed(false)}>
            <img src={getOptimizedImageUrl(rawImage, 800)} alt={product.name} />
          </div>,
          document.body
        )}

        {colors.length > 1 && (
          <>
            <button
              type="button"
              className="image-nav-arrow prev"
              onClick={() => handleStepColor(-1)}
              aria-label="Color anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="image-nav-arrow next"
              onClick={() => handleStepColor(1)}
              aria-label="Siguiente color"
            >
              ›
            </button>
            <div className="image-nav-dots">
              {colors.map(c => (
                <span key={c} className={`image-nav-dot ${c === selectedVariant.color ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card-content">
        <h3>{product.name}</h3>
        <p>{product.description}</p>

        {colors.length > 1 ? (
          <div className="variant-picker-group">
            <span className="variant-picker-label">Color</span>
            <div className="variant-picker">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`variant-pill ${c === selectedVariant.color ? 'selected' : ''}`}
                  onClick={() => handleSelectColor(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : (
          selectedVariant.color && (
            <div className="product-tags">
              <span className="tag">{selectedVariant.color}</span>
            </div>
          )
        )}

        {modelsForSelectedColor.length > 1 ? (
          <div className="variant-picker-group">
            <span className="variant-picker-label">Modelo</span>
            <div className="variant-picker">
              {modelsForSelectedColor.map(v => (
                <button
                  key={v.model}
                  type="button"
                  className={`variant-pill ${v.model === selectedVariant.model ? 'selected' : ''}`}
                  onClick={() => handleSelectModel(v)}
                >
                  {v.model}
                </button>
              ))}
            </div>
          </div>
        ) : (
          selectedVariant.model && (
            <div className="product-tags">
              <span className="tag">{selectedVariant.model}</span>
            </div>
          )
        )}

        <div className="price-section">
          {selectedVariant.discount > 0 && (
            <>
              <span className="original-price">${formatPrice(selectedVariant.price)}</span>
              <span className="discount">-{selectedVariant.discount}%</span>
            </>
          )}
          <span className="final-price">${finalPrice}</span>
        </div>

        <div className="stock-info">
          {inStock ? (
            <span className="stock-badge in-stock">Quedan {stock} unidades</span>
          ) : (
            <span className="stock-badge out-of-stock">Sin stock</span>
          )}
        </div>

        <button
          className="btn-pedido"
          onClick={() => addItem(product, selectedVariant)}
        >
          <svg className="icon-cart" aria-hidden="true">
            <use href="/icons.svg#cart-icon" />
          </svg>
          {inStock ? 'Agregar al carrito' : 'Agregar (consultar disponibilidad)'}
        </button>
      </div>
    </div>
  );
}
