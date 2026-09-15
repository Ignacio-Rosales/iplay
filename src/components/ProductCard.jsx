export default function ProductCard({ product, onMakePedido }) {
  const finalPrice = product.discount
    ? (product.price * (1 - product.discount / 100)).toFixed(2)
    : product.price.toFixed(2)

  const stock = product.stock ?? 0;
  const inStock = stock > 0;

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />

      <div className="card-content">
        <h3>{product.name}</h3>
        <p>{product.description}</p>

        {(product.model || product.color) && (
          <div className="product-tags">
            {product.model && <span className="tag">{product.model}</span>}
            {product.color && <span className="tag">{product.color}</span>}
          </div>
        )}

        <div className="price-section">
          {product.discount && (
            <>
              <span className="original-price">${product.price}</span>
              <span className="discount">-{product.discount}%</span>
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
          onClick={() => onMakePedido(product)}
        >
          📞 {inStock ? 'Hacer Pedido por WhatsApp' : 'Consultar disponibilidad'}
        </button>
      </div>
    </div>
  );
}