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
    variants: [
      { model: 'iPhone 15', color: 'Transparente', price: 2499, discount: 10, stock: 8 },
      { model: 'iPhone 16', color: 'Transparente', price: 2699, discount: 15, stock: 3 }
    ]
  },
  {
    id: '2',
    name: "Protector de Pantalla",
    description: "Protector de vidrio templado",
    image: 'https://via.placeholder.com/300x300?text=Screen+Protector',
    variants: [
      { model: 'iPhone 16', color: '', price: 899, discount: 0, stock: 0 }
    ]
  }
];

// Clave insensible a mayúsculas para agrupar variantes: cubre productos guardados
// antes de normalizarse en el admin (p. ej. "iPhone 13" y "iphone 13" sueltos en
// Firestore), que si no se agruparían como dos filtros distintos en el index.
const normalizedKey = (value) => value.trim().toLowerCase();

// Cuenta cuántos productos DISTINTOS ofrecen cada valor de variante (modelo o color) —
// una variante repetida dentro del mismo producto no debe contarlo dos veces
const buildVariantOptionCounts = (products, field) => {
  const productIdsByKey = new Map();
  const displayValueByKey = new Map();
  products.forEach(product => {
    const seenForThisProduct = new Set();
    (product.variants ?? []).forEach(v => {
      const value = v[field];
      if (!value) return;
      const key = normalizedKey(value);
      if (seenForThisProduct.has(key)) return;
      seenForThisProduct.add(key);
      if (!displayValueByKey.has(key)) displayValueByKey.set(key, value);
      if (!productIdsByKey.has(key)) productIdsByKey.set(key, new Set());
      productIdsByKey.get(key).add(product.id);
    });
  });
  return Array.from(productIdsByKey.entries())
    .map(([key, idSet]) => ({ value: displayValueByKey.get(key), count: idSet.size }))
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

  const modelOptions = useMemo(() => buildVariantOptionCounts(products, 'model'), [products]);
  const colorOptions = useMemo(() => buildVariantOptionCounts(products, 'color'), [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedModelKeys = selectedModels.map(normalizedKey);
    const selectedColorKeys = selectedColors.map(normalizedKey);
    return products.filter(product => {
      const variantModels = (product.variants ?? []).map(v => v.model);
      const variantColors = (product.variants ?? []).map(v => v.color);
      const matchesSearch = !query || [product.name, product.description, ...variantModels, ...variantColors]
        .some(field => field && field.toLowerCase().includes(query));
      const matchesModel = selectedModelKeys.length === 0
        || variantModels.some(m => m && selectedModelKeys.includes(normalizedKey(m)));
      const matchesColor = selectedColorKeys.length === 0
        || variantColors.some(c => c && selectedColorKeys.includes(normalizedKey(c)));
      return matchesSearch && matchesModel && matchesColor;
    });
  }, [products, search, selectedModels, selectedColors]);

  const preferredModel = selectedModels.length > 0 ? selectedModels[0] : null;
  const preferredColor = selectedColors.length > 0 ? selectedColors[0] : null;

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

    const variantLabel = [variant.color, variant.model].filter(Boolean).join(' - ');
    const mensaje = `¡Hola! Me interesa este producto:\n\n📦 *${product.name}*${variantLabel ? ` (${variantLabel})` : ''}\n💰 Precio: $${finalPrice}\n📝 ${product.description}\n\n¿Tienen stock disponible?`;

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

      <ProductList
        products={filteredProducts}
        onMakePedido={handleMakePedido}
        preferredModel={preferredModel}
        preferredColor={preferredColor}
      />
    </>
  );
}
