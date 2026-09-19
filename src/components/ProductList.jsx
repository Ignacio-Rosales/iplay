import ProductCard from './ProductCard';

export default function ProductList({ products, preferredModel, preferredColor }) {
  if (products.length === 0) {
    return <p className="no-results">No se encontraron productos con esos filtros.</p>;
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          preferredModel={preferredModel}
          preferredColor={preferredColor}
        />
      ))}
    </div>
  );
}
