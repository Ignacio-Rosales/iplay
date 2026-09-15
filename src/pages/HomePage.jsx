import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../services/firebase';

const WHATSAPP_NUMBER = "";

const getMockProducts = () => [
  {
    id: '1',
    name: "Funda iPhone 15 MagSafe",
    price: 2499,
    discount: 10,
    description: "Funda de silicona clara con MagSafe para iPhone 15 Plus",
    image: 'https://via.placeholder.com/300x300?text=iPhone+15+Case'
  },
  {
    id: '2',
    name: "Funda iPhone 16 MagSafe",
    price: 2699,
    discount: 15,
    description: "Funda de silicona clara con MagSafe para iPhone 16",
    image: 'https://via.placeholder.com/300x300?text=iPhone+16+Case'
  },
  {
    id: '3',
    name: "Protector de Pantalla",
    price: 899,
    discount: null,
    description: "Protector de vidrio templado para iPhone 16",
    image: 'https://via.placeholder.com/300x300?text=Screen+Protector'
  }
];

export default function HomePage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const productsData = await getProducts();
    setProducts(productsData.length > 0 ? productsData : getMockProducts());
  };

  const handleMakePedido = (product) => {
    const finalPrice = product.discount
      ? (product.price * (1 - product.discount / 100)).toFixed(2)
      : product.price;

    const mensaje = `¡Hola! Me interesa este producto:\n\n📦 *${product.name}*\n💰 Precio: $${finalPrice}\n📝 ${product.description}\n\n¿Tienen stock disponible?`;

    const mensajeEncode = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeEncode}`;

    window.open(urlWhatsApp, '_blank');
  };

  return (
    <>
      <header>
        <div className="header-content">
          <div className="logo-section">
            <h1>iPlay</h1>
            <p>Accesorios Apple Premium</p>
          </div>
          <div className="header-actions">
            <span>📱 Compra por WhatsApp</span>
            <Link to="/admin" className="admin-link">⚙️ Admin</Link>
          </div>
        </div>
      </header>

      <div className='products-grid'>
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onMakePedido={handleMakePedido}
          />
        ))}
      </div>
    </>
  );
}
