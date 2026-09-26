import { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import Filters from '../components/Filters';
import CartDrawer from '../components/CartDrawer';
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

const PRODUCTS_CACHE_KEY = 'iplay_products_cache';
const SETTINGS_CACHE_KEY = 'iplay_settings_cache';

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, etc.) — sin cache
    // la página sigue funcionando, solo pierde el pintado instantáneo.
  }
};

export default function HomePage() {
  // Se pinta primero con lo que haya en cache (si hay) para que la página
  // cargue instantánea, y en paralelo se pide la versión fresca a Firestore
  // (stale-while-revalidate) — así, si los productos no cambiaron desde la
  // última visita, el usuario ni nota el pedido de red.
  const [products, setProducts] = useState(() => readCache(PRODUCTS_CACHE_KEY) ?? []);
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readCache(SETTINGS_CACHE_KEY) }));
  const [search, setSearch] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  async function loadProducts() {
    const productsData = await getProducts();
    const finalProducts = productsData.length > 0 ? productsData : getMockProducts();
    setProducts(finalProducts);
    writeCache(PRODUCTS_CACHE_KEY, finalProducts);
  }

  async function loadSettings() {
    const storeSettings = await getStoreSettings();
    if (storeSettings) {
      const finalSettings = { ...DEFAULT_SETTINGS, ...storeSettings };
      setSettings(finalSettings);
      writeCache(SETTINGS_CACHE_KEY, finalSettings);
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
        preferredModel={preferredModel}
        preferredColor={preferredColor}
      />

      <CartDrawer whatsappNumber={settings.whatsappNumber} />
    </>
  );
}
