import { useState, useMemo, useEffect, useRef } from 'react';
import { useCart } from '../context/useCart';
import { formatPrice } from '../utils/format';

const pickVariant = (variants, preferredColor, preferredModel) => {
  let pool = variants;
  if (preferredColor) {
    const byColor = variants.filter(v => v.color === preferredColor);
    if (byColor.length) pool = byColor;
  }
  if (preferredModel) {
    const match = pool.find(v => v.model === preferredModel);
    if (match) return match;
  }
  return pool[0] ?? null;
};

export default function ProductCard({ product, preferredModel, preferredColor }) {
  const { addItem } = useCart();
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const colors = useMemo(() => [...new Set(variants.map(v => v.color).filter(Boolean))], [variants]);

  const [selectedVariant, setSelectedVariant] = useState(() => pickVariant(variants, preferredColor, preferredModel));
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (userPickedRef.current) return;
    setSelectedVariant(pickVariant(variants, preferredColor, preferredModel));
  }, [variants, preferredColor, preferredModel]);

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

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        <img src={selectedVariant.image || product.image} alt={product.name} />

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
          🛒 {inStock ? 'Agregar al carrito' : 'Agregar (consultar disponibilidad)'}
        </button>
      </div>
    </div>
  );
}
