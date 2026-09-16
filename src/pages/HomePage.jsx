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
    name: "Funda de Silicona MagSafe",
    description: "Funda de silicona clara con MagSafe",
    image: 'https://via.placeholder.com/300x300?text=Funda+MagSafe',
    color: 'Transparente',
    variants: [
      { model: 'iPhone 15', price: 2499, discount: 10, stock: 8 },
      { model: 'iPhone 16', price: 2699, discount: 15, stock: 3 }
    ]
  },
  {
    id: '2',
    name: "Protector de Pantalla",
    description: "Protector de vidrio templado",
    image: 'https://via.placeholder.com/300x300?text=Screen+Protector',
    color: 'N/A',
    variants: [
      { model: 'iPhone 16', price: 899, discount: 0, stock: 0 }
    ]
  }
];

// Cuenta cuántos productos tienen cada color, ordenado alfabéticamente
const buildColorOptions = (products) => {
  const counts = new Map();
  products.forEach(product => {
    const value = product.color;
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
};

// Cuenta cuántos productos DISTINTOS ofrecen cada modelo (una variante repetida
// dentro del mismo producto no debe contarlo dos veces), ordenado alfabéticamente
const buildModelOptions = (products) => {
  const productIdsByModel = new Map();
  products.forEach(product => {
    const seenForThisProduct = new Set();
    (product.variants ?? []).forEach(v => {
      if (!v.model || seenForThisProduct.has(v.model)) return;
      seenForThisProduct.add(v.model);
      if (!productIdsByModel.has(v.model)) productIdsByModel.set(v.model, new Set());
      productIdsByModel.get(v.model).add(product.id);
    });
  });
  return Array.from(productIdsByModel.entries())
    .map(([value, idSet]) => ({ value, count: idSet.size }))
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

  const modelOptions = useMemo(() => buildModelOptions(products), [products]);
  const colorOptions = useMemo(() => buildColorOptions(products), [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const variantModels = (product.variants ?? []).map(v => v.model);
      const matchesSearch = !query || [product.name, product.description, ...variantModels]
        .some(field => field && field.toLowerCase().includes(query));
      const matchesModel = selectedModels.length === 0 || variantModels.some(m => selectedModels.includes(m));
      const matchesColor = selectedColors.length === 0 || selectedColors.includes(product.color);
      return matchesSearch && matchesModel && matchesColor;
    });
  }, [products, search, selectedModels, selectedColors]);

  const preferredModel = selectedModels.length > 0 ? selectedModels[0] : null;

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

  const handleMakePedido = (product, variant) => {
    const finalPrice = variant.discount
      ? (variant.price * (1 - variant.discount / 100)).toFixed(2)
      : variant.price;

    const mensaje = `¡Hola! Me interesa este producto:\n\n📦 *${product.name}* (${variant.model})\n💰 Precio: $${finalPrice}\n📝 ${product.description}\n\n¿Tienen stock disponible?`;

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

      <ProductList products={filteredProducts} onMakePedido={handleMakePedido} preferredModel={preferredModel} />
    </>
  );
}
