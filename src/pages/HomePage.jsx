import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import Filters from '../components/Filters';
import { getProducts, getStoreSettings } from '../services/firebase';

const DEFAULT_SETTINGS = {
  title: 'iPlay',
  tagline: 'Accesorios Apple Premium',
  logoUrl: '',
  whatsappNumber: ''
};

const getMockProducts = () => [
  {
    id: '1',
    name: "Funda iPhone 15 MagSafe",
    price: 2499,
    discount: 10,
    description: "Funda de silicona clara con MagSafe para iPhone 15 Plus",
    image: 'https://via.placeholder.com/300x300?text=iPhone+15+Case',
    model: 'iPhone 15',
    color: 'Transparente',
    stock: 8
  },
  {
    id: '2',
    name: "Funda iPhone 16 MagSafe",
    price: 2699,
    discount: 15,
    description: "Funda de silicona clara con MagSafe para iPhone 16",
    image: 'https://via.placeholder.com/300x300?text=iPhone+16+Case',
    model: 'iPhone 16',
    color: 'Transparente',
    stock: 3
  },
  {
    id: '3',
    name: "Protector de Pantalla",
    price: 899,
    discount: null,
    description: "Protector de vidrio templado para iPhone 16",
    image: 'https://via.placeholder.com/300x300?text=Screen+Protector',
    model: 'iPhone 16',
    color: 'N/A',
    stock: 0
  }
];

// Cuenta cuántos productos tienen cada valor de `field`, ordenado alfabéticamente
const buildOptionsWithCounts = (products, field) => {
  const counts = new Map();
  products.forEach(product => {
    const value = product[field];
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
};

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [search, setSearch] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  async function loadProducts() {
    const productsData = await getProducts();
    setProducts(productsData.length > 0 ? productsData : getMockProducts());
  }

  async function loadSettings() {
    const storeSettings = await getStoreSettings();
    if (storeSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...storeSettings });
    }
  }

  useEffect(() => {
    // Carga inicial en el montaje: no hay librería de data-fetching en el proyecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
    loadSettings();
  }, []);

  const modelOptions = useMemo(() => buildOptionsWithCounts(products, 'model'), [products]);
  const colorOptions = useMemo(() => buildOptionsWithCounts(products, 'color'), [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch = !query || [product.name, product.model, product.description]
        .some(field => field && field.toLowerCase().includes(query));
      const matchesModel = selectedModels.length === 0 || selectedModels.includes(product.model);
      const matchesColor = selectedColors.length === 0 || selectedColors.includes(product.color);
      return matchesSearch && matchesModel && matchesColor;
    });
  }, [products, search, selectedModels, selectedColors]);

  const toggleModel = (value) => {
    setSelectedModels(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const toggleColor = (value) => {
    setSelectedColors(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedModels([]);
    setSelectedColors([]);
  };

  const handleMakePedido = (product) => {
    const finalPrice = product.discount
      ? (product.price * (1 - product.discount / 100)).toFixed(2)
      : product.price;

    const mensaje = `¡Hola! Me interesa este producto:\n\n📦 *${product.name}*\n💰 Precio: $${finalPrice}\n📝 ${product.description}\n\n¿Tienen stock disponible?`;

    const mensajeEncode = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${settings.whatsappNumber}?text=${mensajeEncode}`;

    window.open(urlWhatsApp, '_blank');
  };

  return (
    <>
      <Header settings={settings} />

      <Filters
        search={search}
        onSearchChange={setSearch}
        modelOptions={modelOptions}
        colorOptions={colorOptions}
        selectedModels={selectedModels}
        selectedColors={selectedColors}
        onToggleModel={toggleModel}
        onToggleColor={toggleColor}
        onClear={clearFilters}
      />

      <ProductList products={filteredProducts} onMakePedido={handleMakePedido} />
    </>
  );
}
