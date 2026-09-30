import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import Filters from '../components/Filters';
import CartDrawer from '../components/CartDrawer';
import BannerSlider from '../components/BannerSlider';
import { PRODUCT_TAGS, matchesAnyTag, variantHasTag } from '../utils/productTags';
import Footer from '../components/Footer';
import { getProducts, getStoreSettings, getBanners } from '../services/firebase';

const DEFAULT_SETTINGS = {
  title: 'iPlay',
  tagline: 'Accesorios Apple Premium',
  logoUrl: '',
  whatsappNumber: '',
  headerBgUrl: '',
  headerOverlay: 55,
  brandColor: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  address: '',
  mapUrl: '',
  hours: ''
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
// una variante repetida dentro del mismo producto no debe contarlo dos veces.
// `variantFilter` permite acotar antes a las variantes que además cumplen los
// filtros activos del OTRO campo, para que las opciones sean dinámicas: al
// elegir un modelo, la lista de colores solo debe mostrar los que ese modelo
// realmente tiene (y viceversa).
const buildVariantOptionCounts = (products, field, variantFilter = () => true) => {
  const productIdsByKey = new Map();
  const displayValueByKey = new Map();
  products.forEach(product => {
    const seenForThisProduct = new Set();
    (product.variants ?? []).filter(variantFilter).forEach(v => {
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
const BANNERS_CACHE_KEY = 'iplay_banners_cache';

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
  const [banners, setBanners] = useState(() => readCache(BANNERS_CACHE_KEY) ?? []);
  const [search, setSearch] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

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

  async function loadBanners() {
    const bannersData = (await getBanners()).filter(b => b.active !== false && b.image);
    setBanners(bannersData);
    writeCache(BANNERS_CACHE_KEY, bannersData);
  }

  useEffect(() => {
    // Carga inicial en el montaje: no hay librería de data-fetching en el proyecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
    loadSettings();
    loadBanners();
  }, []);

  const selectedModelKeys = useMemo(() => selectedModels.map(normalizedKey), [selectedModels]);
  const selectedColorKeys = useMemo(() => selectedColors.map(normalizedKey), [selectedColors]);

  // Modelo se filtra por los colores elegidos, y color por los modelos elegidos:
  // así cada dropdown solo ofrece combinaciones que realmente existen entre sí.
  const modelOptions = useMemo(
    () => buildVariantOptionCounts(products, 'model', v =>
      (selectedColorKeys.length === 0 || selectedColorKeys.includes(normalizedKey(v.color)))
      && matchesAnyTag(v, selectedTags)
    ),
    [products, selectedColorKeys, selectedTags]
  );
  const colorOptions = useMemo(
    () => buildVariantOptionCounts(products, 'color', v =>
      (selectedModelKeys.length === 0 || selectedModelKeys.includes(normalizedKey(v.model)))
      && matchesAnyTag(v, selectedTags)
    ),
    [products, selectedModelKeys, selectedTags]
  );

  // Si un valor seleccionado ya no es una opción válida (ningún producto lo
  // combina con el otro filtro activo), se lo ignora para filtrar/mostrar sin
  // necesidad de "limpiarlo" del estado: en cuanto vuelva a ser compatible
  // (p. ej. se destilda el otro filtro), reaparece seleccionado solo.
  const modelValidKeys = useMemo(() => new Set(modelOptions.map(o => normalizedKey(o.value))), [modelOptions]);
  const colorValidKeys = useMemo(() => new Set(colorOptions.map(o => normalizedKey(o.value))), [colorOptions]);

  const effectiveModelKeys = useMemo(
    () => selectedModelKeys.filter(k => modelValidKeys.has(k)),
    [selectedModelKeys, modelValidKeys]
  );
  const effectiveColorKeys = useMemo(
    () => selectedColorKeys.filter(k => colorValidKeys.has(k)),
    [selectedColorKeys, colorValidKeys]
  );

  const visibleSelectedModels = useMemo(
    () => selectedModels.filter(v => modelValidKeys.has(normalizedKey(v))),
    [selectedModels, modelValidKeys]
  );
  const visibleSelectedColors = useMemo(
    () => selectedColors.filter(v => colorValidKeys.has(normalizedKey(v))),
    [selectedColors, colorValidKeys]
  );

  // Modelo, color y oferta se evalúan sobre la MISMA variante: un producto con oferta solo
  // en "iPhone 14 rojo" no debe aparecer al filtrar "iPhone 13" + ofertas, aunque tenga
  // otra variante iPhone 13 sin oferta. Es la misma lógica cruzada de las opciones de arriba.
  const matchesModelAndColor = useCallback(
    (v) =>
      (effectiveModelKeys.length === 0 || effectiveModelKeys.includes(normalizedKey(v.model ?? '')))
      && (effectiveColorKeys.length === 0 || effectiveColorKeys.includes(normalizedKey(v.color ?? ''))),
    [effectiveModelKeys, effectiveColorKeys]
  );

  // Por cada etiqueta, cuántos productos tienen al menos una variante con ella compatible con
  // el modelo y color elegidos (no con las OTRAS etiquetas, igual que las opciones de modelo
  // y color no se acotan por sí mismas). Con 0 el botón se oculta.
  const tagOptions = useMemo(
    () => Object.entries(PRODUCT_TAGS).map(([key, { filterLabel, icon }]) => ({
      key,
      label: filterLabel,
      icon,
      count: products.filter(p =>
        (p.variants ?? []).some(v => variantHasTag(v, key) && matchesModelAndColor(v))
      ).length
    })),
    [products, matchesModelAndColor]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const noVariantFilters = effectiveModelKeys.length === 0 && effectiveColorKeys.length === 0 && selectedTags.length === 0;
    return products.filter(product => {
      const variants = product.variants ?? [];
      const matchesSearch = !query || [product.name, product.description, ...variants.flatMap(v => [v.model, v.color])]
        .some(field => field && field.toLowerCase().includes(query));
      const matchesVariant = variants.length === 0
        ? noVariantFilters
        : variants.some(v => matchesModelAndColor(v) && matchesAnyTag(v, selectedTags));
      return matchesSearch && matchesVariant;
    });
  }, [products, search, effectiveModelKeys, effectiveColorKeys, selectedTags, matchesModelAndColor]);

  const preferredModel = visibleSelectedModels.length > 0 ? visibleSelectedModels[0] : null;
  const preferredColor = visibleSelectedColors.length > 0 ? visibleSelectedColors[0] : null;

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

  const toggleTag = (key) => {
    setSelectedTags(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedModels([]);
    setSelectedColors([]);
    setSelectedTags([]);
  };

  // Un banner "interno" no navega: aplica los filtros del catálogo que el admin
  // eligió (búsqueda / modelo / color) y baja hasta la grilla.
  const handleBannerLink = (banner) => {
    setSearch(banner.filterSearch || '');
    setSelectedModels(banner.filterModel ? [banner.filterModel] : []);
    setSelectedColors(banner.filterColor ? [banner.filterColor] : []);
    setSelectedTags([]);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Un color de marca vacío deja los estilos por defecto (header oscuro, acento verde).
  const brandStyle = settings.brandColor
    ? {
        '--brand-header': settings.brandColor,
        '--brand-header-end': `color-mix(in srgb, ${settings.brandColor} 75%, black)`,
        '--brand-accent': settings.brandColor,
        '--brand-accent-soft': `color-mix(in srgb, ${settings.brandColor} 15%, transparent)`
      }
    : undefined;

  return (
    <div style={brandStyle}>
      <Header settings={settings} />

      <BannerSlider banners={banners} onInternalLink={handleBannerLink} />

      <Filters
        search={search}
        onSearchChange={setSearch}
        modelOptions={modelOptions}
        colorOptions={colorOptions}
        selectedModels={visibleSelectedModels}
        selectedColors={visibleSelectedColors}
        onToggleModel={toggleModel}
        onToggleColor={toggleColor}
        selectedTags={selectedTags}
        tagOptions={tagOptions}
        onToggleTag={toggleTag}
        onClear={clearFilters}
      />

      <ProductList
        products={filteredProducts}
        preferredModel={preferredModel}
        preferredColor={preferredColor}
        selectedTags={selectedTags}
      />

      <Footer settings={settings} />

      <CartDrawer whatsappNumber={settings.whatsappNumber} />
    </div>
  );
}
