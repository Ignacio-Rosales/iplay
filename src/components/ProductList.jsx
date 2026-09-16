import ProductCard from './ProductCard';

export default function ProductList({ products, onMakePedido, preferredModel, preferredColor }) {
  if (products.length === 0) {
    return <p className="no-results">No se encontraron productos con esos filtros.</p>;
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onMakePedido={onMakePedido}
          preferredModel={preferredModel}
          preferredColor={preferredColor}
        />
      ))}
    </div>
  );
}
