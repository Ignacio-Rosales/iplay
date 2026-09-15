export default function ProductCard({ product, onMakePedido }) {
  const finalPrice = product.discount 
    ? (product.price * (1 - product.discount / 100)).toFixed(2)
    : product.price.toFixed(2)

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      
      <div className="card-content">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        
        <div className="price-section">
          {product.discount && (
            <>
              <span className="original-price">${product.price}</span>
              <span className="discount">-{product.discount}%</span>
            </>
          )}
          <span className="final-price">${finalPrice}</span>
        </div>

        <button 
          className="btn-pedido"
          onClick={() => onMakePedido(product)}
        >
          📞 Hacer Pedido por WhatsApp
        </button>
      </div>
    </div>
  );
}