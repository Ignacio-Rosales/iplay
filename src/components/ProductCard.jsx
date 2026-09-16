import { useState, useMemo, useEffect, useRef } from 'react';

export default function ProductCard({ product, onMakePedido, preferredModel }) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const [selectedVariant, setSelectedVariant] = useState(() => variants[0] ?? null);
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (userPickedRef.current) return;
    const match = preferredModel && variants.find(v => v.model === preferredModel);
    setSelectedVariant(match || variants[0] || null);
  }, [preferredModel, variants]);

  const handleSelectVariant = (variant) => {
    userPickedRef.current = true;
    setSelectedVariant(variant);
  };

  if (!selectedVariant) {
    return null;
  }

  const finalPrice = selectedVariant.discount
    ? (selectedVariant.price * (1 - selectedVariant.discount / 100)).toFixed(2)
    : selectedVariant.price.toFixed(2)

  const stock = selectedVariant.stock ?? 0;
  const inStock = stock > 0;

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />

      <div className="card-content">
        <h3>{product.name}</h3>
        <p>{product.description}</p>

        {product.color && (
          <div className="product-tags">
            <span className="tag">{product.color}</span>
          </div>
        )}

        {variants.length > 1 ? (
          <div className="variant-picker">
            {variants.map(v => (
              <button
                key={v.model}
                type="button"
                className={`variant-pill ${v.model === selectedVariant.model ? 'selected' : ''}`}
                onClick={() => handleSelectVariant(v)}
              >
                {v.model}
              </button>
            ))}
          </div>
        ) : (
          <div className="product-tags">
            <span className="tag">{selectedVariant.model}</span>
          </div>
        )}

        <div className="price-section">
          {selectedVariant.discount > 0 && (
            <>
              <span className="original-price">${selectedVariant.price}</span>
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
          onClick={() => onMakePedido(product, selectedVariant)}
        >
          📞 {inStock ? 'Hacer Pedido por WhatsApp' : 'Consultar disponibilidad'}
        </button>
      </div>
    </div>
  );
}
