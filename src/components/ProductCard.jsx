export default function ProductCard({ product, onAddToCart }) {
    const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

    return (
        <div className="product-card">
            <img src= {product.image} alt= {product.name} />

            <h3>{product.name}</h3>
            <p>{product.description}</p>

            <div className="price-section">
                {product.discount && (
                    <>
                        <span className="original-price">${product.price}</span>
                        <span className="discount">-{product.discount}%</span>
                    </>
                )}
                <span className="final-price">${finalPrice.toFixed(2)}</span>
            </div>

            <button onClick={() => onAddToCart(product)}>
                Agregar al carrito
            </button>
        </div>
    );
}