import { useState, useEffect, use } from 'react';
import ProductCard from './components/ProductCard';
import './styles/styles.css'

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // Datos de ejemplo (luego se reemplaza con datos reales de la api)
  useEffect(() => {
    const mockProducts = [
      {
        id:1,
        name: "Laptop",
        price: 999,
        discount: 10,
        description: "Laptop de alta performance",
        image: 'https://via.placeholder.com/300'
      },
      {
        id:2,
        name: "Mouse",
        price: 29,
        discount: null,
        description: "Mouse inalámbrico",
        image: 'https://via.placeholder.com/300'
      },
      {
        id:3,
        name: "Teclado",
        price: 79,
        discount: 15,
        description: "Teclado mecánico RGB",
        image: 'https://via.placeholder.com/300'
      }
    ];
    setProducts(mockProducts)
  }, []);

  const handleAddToCart = (product) => {
    setCart([...cart, product]);
    alert(`${product.name} agregado al carrito`);
  }

  return (
    <div className='app'>
      <header>
        <h1>Mi Tienda</h1>
        <span>Carrito: {cart.length} items</span>
      </header>

      <div className='products-grid'>
        {products.map(product => (
          <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}

export default App