import { useState, useEffect, useMemo } from 'react';
import {
  addProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getStoreSettings,
  updateStoreSettings,
  getBanners,
  addBanner,
  updateBanner,
  deleteBanner,
  loginAdmin,
  logoutAdmin
} from '../services/firebase';
import { uploadImage } from '../services/cloudinary';
import { formatPrice } from '../utils/format';
import { PRODUCT_TAGS } from '../utils/productTags';
import '../styles/admin.css';

const emptyVariant = { model: '', color: '', price: '', discount: '', stock: '', tag: '', image: '', imageFile: null, imagePreview: '' };

const emptyProductFilters = { search: '', model: '', color: '', tag: '', stock: '', sort: 'default' };

const emptyProductForm = {
  name: '',
  description: '',
  image: '',
  imageFile: null,
  variants: [{ ...emptyVariant }]
};

// Evita que "iPhone 13", "iphone 13" e "IPHONE 13" queden como filtros
// distintos: si el valor ya existe entre los cargados (sin importar mayúsculas),
// reutiliza esa misma grafía; si es nuevo, la define para las próximas cargas.
const normalizeAgainstKnown = (value, knownValues) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  const existing = knownValues.find(v => v.toLowerCase() === trimmed.toLowerCase());
  return existing || trimmed;
};

const defaultStoreSettings = {
  title: '',
  tagline: '',
  whatsappNumber: '',
  logoUrl: '',
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

const emptyBannerForm = {
  image: '',
  imageFile: null,
  imagePreview: '',
  linkType: 'none',
  linkUrl: '',
  filterSearch: '',
  filterModel: '',
  filterColor: ''
};

// No existe un emoji estándar de "ojo tachado" (🙈 es un mono), así que se dibuja en SVG;
// hereda el color del texto (currentColor) y el tamaño de la fuente.
const EyeOffIcon = () => (
  <svg
    className="icon-eye-off"
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const linkTypeLabels ={ none: 'Sin link', filter: 'Filtra la tienda', external: 'Link externo' };

// Si el cliente pega "www.sitio.com" sin protocolo, el <a> lo trataría como ruta
// relativa; se le antepone https:// para que abra el sitio externo.
const normalizeExternalUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [products, setProducts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyProductForm);
  const [imagePreview, setImagePreview] = useState('');
  const [productFilters, setProductFilters] = useState(emptyProductFilters);

  const [settingsForm, setSettingsForm] = useState(defaultStoreSettings);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [headerBgFile, setHeaderBgFile] = useState(null);
  const [headerBgPreview, setHeaderBgPreview] = useState('');

  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadStoreSettings();
      loadBanners();
    }
  }, [isAuthenticated]);

  async function loadProducts() {
    const productsData = await getProducts();
    setProducts(productsData);
  }

  async function loadStoreSettings() {
    const storeSettings = await getStoreSettings();
    if (storeSettings) {
      setSettingsForm({ ...defaultStoreSettings, ...storeSettings });
      setLogoPreview(storeSettings.logoUrl || '');
      setHeaderBgPreview(storeSettings.headerBgUrl || '');
    }
  }

  async function loadBanners() {
    setBanners(await getBanners());
  }

  const modelSuggestions = useMemo(
    () => [...new Set(products.flatMap(p => (p.variants ?? []).map(v => v.model)).filter(Boolean))],
    [products]
  );
  const colorSuggestions = useMemo(
    () => [...new Set(products.flatMap(p => (p.variants ?? []).map(v => v.color)).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = productFilters.search.trim().toLowerCase();
    const { model, color, tag, stock, sort } = productFilters;

    const matches = products.filter(p => {
      const variants = p.variants ?? [];
      if (query) {
        const haystack = [p.name, p.description, ...variants.flatMap(v => [v.model, v.color])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!query.split(/\s+/).every(word => haystack.includes(word))) return false;
      }
      // Modelo, color, etiqueta y stock se evalúan sobre la MISMA variante,
      // igual que en la tienda, para que "iPhone 13 + Rosa" no coincida con
      // un producto que tiene iPhone 13 negro y iPhone 14 rosa.
      return variants.some(v =>
        (!model || v.model === model) &&
        (!color || v.color === color) &&
        (!tag || (tag === 'oferta' ? v.tag === 'oferta' || v.discount > 0 : v.tag === tag)) &&
        (!stock || (stock === 'out' ? !(v.stock > 0) : v.stock > 0 && v.stock <= 3))
      ) || (!model && !color && !tag && !stock);
    });

    const minPrice = p => Math.min(...(p.variants ?? []).map(v => v.price ?? Infinity));
    const sorters = {
      recent: (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'es'),
      priceAsc: (a, b) => minPrice(a) - minPrice(b),
      priceDesc: (a, b) => minPrice(b) - minPrice(a)
    };
    return sort === 'default' ? matches : [...matches].sort(sorters[sort]);
  }, [products, productFilters]);

  const hasActiveFilters = Object.entries(productFilters).some(
    ([key, value]) => key !== 'sort' && value !== ''
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setProductFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password !== import.meta.env.VITE_ADMIN_PASSWORD) {
      alert('Contraseña incorrecta');
      return;
    }

    setIsLoggingIn(true);
    try {
      await loginAdmin();
      setIsAuthenticated(true);
      setPassword('');
    } catch (error) {
      console.error('Error al autenticar con Firebase:', error);
      alert('No se pudo iniciar sesión. Contactá al administrador.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => {
        if (i !== index) return variant;
        const parsed = field === 'model' || field === 'color' || field === 'tag' ? value : (parseFloat(value) || (value === '' ? '' : 0));
        return { ...variant, [field]: parsed };
      })
    }));
  };

  const addVariantRow = () => {
    setFormData(prev => ({ ...prev, variants: [...prev.variants, { ...emptyVariant }] }));
  };

  const removeVariantRow = (index) => {
    setFormData(prev => {
      if (prev.variants.length <= 1) return prev;
      return { ...prev, variants: prev.variants.filter((_, i) => i !== index) };
    });
  };

  const validateImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe pesar más de 5MB');
      return false;
    }
    return true;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !validateImageFile(file)) return;

    setFormData(prev => ({ ...prev, imageFile: file }));

    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleVariantImageChange = (index, e) => {
    const file = e.target.files[0];
    if (!file || !validateImageFile(file)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        variants: prev.variants.map((v, i) =>
          i === index ? { ...v, imageFile: file, imagePreview: event.target.result } : v
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: '', imageFile: null }));
    setImagePreview('');
  };

  const handleRemoveVariantImage = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) =>
        i === index ? { ...v, image: '', imageFile: null, imagePreview: '' } : v
      )
    }));
  };

  const resetProductForm = () => {
    setFormData(emptyProductForm);
    setImagePreview('');
    setEditingId(null);
  };

  const handleEditProduct = (product) => {
    setEditingId(product.id);
    const variants = Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants.map(v => ({
          model: v.model || '',
          color: v.color || '',
          price: v.price ?? '',
          discount: v.discount ?? '',
          stock: v.stock ?? '',
          tag: v.tag || '',
          image: v.image || '',
          imageFile: null,
          imagePreview: v.image || ''
        }))
      : [{
          model: product.model || '',
          color: product.color || '',
          price: product.price ?? '',
          discount: product.discount ?? '',
          stock: product.stock ?? '',
          tag: '',
          image: '',
          imageFile: null,
          imagePreview: ''
        }];
    setFormData({
      name: product.name || '',
      description: product.description || '',
      image: product.image || '',
      imageFile: null,
      variants
    });
    setImagePreview(product.image || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    // Se normaliza contra los valores de OTROS productos, no contra el propio:
    // si comparáramos contra el propio, al editar un producto para corregir su
    // grafía ("Iphone 13" -> "iPhone 13") la comparación encontraría el valor
    // viejo de ese mismo producto (todavía en `products`) y revertiría el cambio.
    const otherProducts = products.filter(p => p.id !== editingId);
    // Listas "vivas": arrancan con los valores de otros productos y se van completando
    // a medida que se procesa cada variante del formulario actual, para que dos
    // variantes nuevas del mismo producto ("iPhone 13" y "iphone 13") también
    // converjan a la misma grafía entre sí, no solo contra productos ya guardados.
    const knownModels = [...new Set(otherProducts.flatMap(p => (p.variants ?? []).map(v => v.model)).filter(Boolean))];
    const knownColors = [...new Set(otherProducts.flatMap(p => (p.variants ?? []).map(v => v.color)).filter(Boolean))];

    const parsedVariants = formData.variants
      .filter(v => v.model.trim() !== '')
      .map(v => {
        const model = normalizeAgainstKnown(v.model, knownModels);
        if (model && !knownModels.some(m => m.toLowerCase() === model.toLowerCase())) {
          knownModels.push(model);
        }
        const color = normalizeAgainstKnown(v.color, knownColors);
        if (color && !knownColors.some(c => c.toLowerCase() === color.toLowerCase())) {
          knownColors.push(color);
        }
        return {
          model,
          color,
          price: parseFloat(v.price) || 0,
          discount: v.discount === '' ? 0 : parseFloat(v.discount) || 0,
          stock: v.stock === '' ? 0 : parseFloat(v.stock) || 0,
          tag: v.tag || '',
          image: v.image || '',
          imageFile: v.imageFile || null
        };
      });

    if (parsedVariants.length === 0) {
      alert('Agrega al menos una variante con modelo y precio');
      return;
    }
    if (parsedVariants.some(v => !v.price || v.price <= 0)) {
      alert('Cada variante necesita un precio válido mayor a 0');
      return;
    }

    const hasAnyImage = formData.imageFile || formData.image || parsedVariants.some(v => v.imageFile || v.image);
    if (!hasAnyImage) {
      alert('Agregá al menos una imagen: la del producto o la de alguna variante');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = formData.image;
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile);
        if (!imageUrl) {
          alert('Error al subir la imagen');
          setIsUploading(false);
          return;
        }
      }

      const cleanedVariants = [];
      for (const v of parsedVariants) {
        let variantImage = v.image;
        if (v.imageFile) {
          variantImage = await uploadImage(v.imageFile);
          if (!variantImage) {
            alert(`Error al subir la imagen de la variante ${v.model}`);
            setIsUploading(false);
            return;
          }
        }
        cleanedVariants.push({
          model: v.model,
          color: v.color,
          price: v.price,
          discount: v.discount,
          stock: v.stock,
          tag: v.tag,
          image: variantImage
        });
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        image: imageUrl,
        variants: cleanedVariants
      };

      if (editingId) {
        await updateProduct(editingId, productData);
        alert('Producto actualizado exitosamente');
      } else {
        await addProduct({ ...productData, createdAt: new Date() });
        alert('Producto agregado exitosamente');
      }

      resetProductForm();
      await loadProducts();
      setIsUploading(false);
    } catch (error) {
      console.error('Error:', error);
      setIsUploading(false);
      alert(editingId ? 'Error al actualizar el producto' : 'Error al agregar el producto');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Eliminar este producto?')) {
      await deleteProduct(productId);
      if (editingId === productId) resetProductForm();
      loadProducts();
    }
  };

  const handleSettingsInputChange = (e) => {
    const { name, value } = e.target;
    setSettingsForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file || !validateImageFile(file)) return;

    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (event) => setLogoPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSettingsForm(prev => ({ ...prev, logoUrl: '' }));
  };

  const handleHeaderBgChange = (e) => {
    const file = e.target.files[0];
    if (!file || !validateImageFile(file)) return;

    setHeaderBgFile(file);

    const reader = new FileReader();
    reader.onload = (event) => setHeaderBgPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveHeaderBg = () => {
    setHeaderBgFile(null);
    setHeaderBgPreview('');
    setSettingsForm(prev => ({ ...prev, headerBgUrl: '' }));
  };

  const handleBannerInputChange = (e) => {
    const { name, value } = e.target;
    setBannerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || !validateImageFile(file)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBannerForm(prev => ({ ...prev, imageFile: file, imagePreview: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const resetBannerForm = () => {
    setBannerForm(emptyBannerForm);
    setEditingBannerId(null);
  };

  const handleEditBanner = (banner) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      image: banner.image || '',
      imageFile: null,
      imagePreview: banner.image || '',
      linkType: banner.linkType || 'none',
      linkUrl: banner.linkUrl || '',
      filterSearch: banner.filterSearch || '',
      filterModel: banner.filterModel || '',
      filterColor: banner.filterColor || ''
    });
  };

  const handleSubmitBanner = async (e) => {
    e.preventDefault();

    if (!bannerForm.imageFile && !bannerForm.image) {
      alert('Seleccioná una imagen para el banner');
      return;
    }

    const { linkType } = bannerForm;
    const linkUrl = linkType === 'external' ? normalizeExternalUrl(bannerForm.linkUrl) : '';
    if (linkType === 'external' && !linkUrl) {
      alert('Ingresá la dirección del link externo');
      return;
    }
    const filterSearch = linkType === 'filter' ? bannerForm.filterSearch.trim() : '';
    const filterModel = linkType === 'filter' ? bannerForm.filterModel : '';
    const filterColor = linkType === 'filter' ? bannerForm.filterColor : '';
    if (linkType === 'filter' && !filterSearch && !filterModel && !filterColor) {
      alert('Elegí al menos un filtro (búsqueda, modelo o color) para este banner');
      return;
    }

    setIsSavingBanner(true);
    try {
      let image = bannerForm.image;
      if (bannerForm.imageFile) {
        image = await uploadImage(bannerForm.imageFile);
        if (!image) {
          alert('Error al subir la imagen del banner');
          setIsSavingBanner(false);
          return;
        }
      }

      const bannerData = { image, linkType, linkUrl, filterSearch, filterModel, filterColor };

      if (editingBannerId) {
        await updateBanner(editingBannerId, bannerData);
      } else {
        const nextOrder = banners.reduce((max, b) => Math.max(max, b.order ?? 0), 0) + 1;
        await addBanner({ ...bannerData, active: true, order: nextOrder, createdAt: new Date() });
      }

      resetBannerForm();
      await loadBanners();
      setIsSavingBanner(false);
    } catch (error) {
      console.error('Error:', error);
      setIsSavingBanner(false);
      alert('Error al guardar el banner');
    }
  };

  const handleToggleBanner = async (banner) => {
    try {
      await updateBanner(banner.id, { active: banner.active === false });
      await loadBanners();
    } catch {
      alert('Error al actualizar el banner');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('¿Eliminar este banner?')) return;
    try {
      await deleteBanner(bannerId);
      if (editingBannerId === bannerId) resetBannerForm();
      await loadBanners();
    } catch {
      alert('Error al eliminar el banner');
    }
  };

  // Intercambia con el vecino y reescribe el `order` de TODA la lista según su nueva
  // posición: cambiar solo los dos involucrados dejaría valores repetidos (los banners
  // nuevos arrancan en 1 y las posiciones en 0) y el desempate sería arbitrario.
  const handleMoveBanner = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= banners.length) return;
    const reordered = [...banners];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await Promise.all(
        reordered
          .map((banner, position) => ({ banner, position }))
          .filter(({ banner, position }) => banner.order !== position)
          .map(({ banner, position }) => updateBanner(banner.id, { order: position }))
      );
      await loadBanners();
    } catch {
      alert('Error al reordenar los banners');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    if (!settingsForm.whatsappNumber) {
      alert('Completa el número de WhatsApp');
      return;
    }

    setIsSavingSettings(true);

    try {
      let logoUrl = settingsForm.logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadImage(logoFile);
        if (!uploadedUrl) {
          alert('Error al subir el logo');
          setIsSavingSettings(false);
          return;
        }
        logoUrl = uploadedUrl;
      }

      let headerBgUrl = settingsForm.headerBgUrl;
      if (headerBgFile) {
        const uploadedBg = await uploadImage(headerBgFile);
        if (!uploadedBg) {
          alert('Error al subir la imagen de fondo del header');
          setIsSavingSettings(false);
          return;
        }
        headerBgUrl = uploadedBg;
      }

      const newSettings = {
        title: settingsForm.title,
        tagline: settingsForm.tagline,
        whatsappNumber: settingsForm.whatsappNumber,
        logoUrl,
        headerBgUrl,
        headerOverlay: Number(settingsForm.headerOverlay) || 0,
        brandColor: settingsForm.brandColor,
        instagram: settingsForm.instagram.trim(),
        facebook: settingsForm.facebook.trim(),
        tiktok: settingsForm.tiktok.trim(),
        address: settingsForm.address.trim(),
        mapUrl: settingsForm.mapUrl.trim(),
        hours: settingsForm.hours.trim()
      };

      await updateStoreSettings(newSettings);
      setSettingsForm(newSettings);
      setLogoFile(null);
      setHeaderBgFile(null);
      setIsSavingSettings(false);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error:', error);
      setIsSavingSettings(false);
      alert('Error al guardar la configuración');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="login-box">
          <h1>🔐 Panel de Admin</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Ingresa la contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
            />
            <button type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Accediendo...' : 'Acceder'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📦 Gestión de Productos</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      <div className="settings-section">
        <h2>⚙️ Configuración de la Tienda</h2>
        <form onSubmit={handleSaveSettings} className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label>Título de la tienda</label>
              <input
                type="text"
                name="title"
                value={settingsForm.title}
                onChange={handleSettingsInputChange}
                placeholder="iPlay"
              />
            </div>
            <div className="form-group">
              <label>Bajada / Tagline</label>
              <input
                type="text"
                name="tagline"
                value={settingsForm.tagline}
                onChange={handleSettingsInputChange}
                placeholder="Accesorios Apple Premium"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Número de WhatsApp *</label>
            <input
              type="text"
              name="whatsappNumber"
              value={settingsForm.whatsappNumber}
              onChange={handleSettingsInputChange}
              placeholder="Ej: 5491122334455 (código de país + número, sin +)"
              required
            />
          </div>

          <div className="form-group">
            <label>Logo de la tienda</label>
            <div className="image-upload">
              <input
                type="file"
                id="logo-input"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={isSavingSettings}
              />
              <label htmlFor="logo-input" className="file-label">
                🖼️ Seleccionar logo
              </label>
            </div>
            {logoPreview && (
              <div className="image-preview">
                <img src={logoPreview} alt="Logo preview" />
                <button type="button" className="btn-remove-logo" onClick={handleRemoveLogo}>
                  ✕ Quitar logo
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Color de marca</label>
            <div className="color-picker-row">
              <input
                type="color"
                name="brandColor"
                value={settingsForm.brandColor || '#1a1a1a'}
                onChange={handleSettingsInputChange}
              />
              <span>{settingsForm.brandColor || 'Por defecto (negro y verde)'}</span>
              {settingsForm.brandColor && (
                <button
                  type="button"
                  className="btn-remove-logo"
                  onClick={() => setSettingsForm(prev => ({ ...prev, brandColor: '' }))}
                >
                  Restablecer
                </button>
              )}
            </div>
            <small className="field-hint">Se usa en el fondo del header y en los detalles de los filtros.</small>
          </div>

          <div className="form-group">
            <label>Imagen de fondo del header (opcional)</label>
            <div className="image-upload">
              <input
                type="file"
                id="header-bg-input"
                accept="image/*"
                onChange={handleHeaderBgChange}
                disabled={isSavingSettings}
              />
              <label htmlFor="header-bg-input" className="file-label">
                🖼️ Seleccionar imagen de fondo
              </label>
            </div>
            <small className="field-hint">Recomendado: 1600×400 px o más ancha que alta. Se recorta al centro.</small>
            {headerBgPreview && (
              <>
                <div className="image-preview">
                  <img src={headerBgPreview} alt="Fondo del header" />
                  <button type="button" className="btn-remove-logo" onClick={handleRemoveHeaderBg}>
                    ✕ Quitar imagen de fondo
                  </button>
                </div>
                <label className="overlay-label">
                  Oscurecer imagen: {settingsForm.headerOverlay}%
                  <input
                    type="range"
                    name="headerOverlay"
                    min="0"
                    max="90"
                    value={settingsForm.headerOverlay}
                    onChange={handleSettingsInputChange}
                  />
                </label>
                <small className="field-hint">Si el título no se lee bien, subí este valor.</small>
              </>
            )}
          </div>

          <div className="form-group settings-subsection">
            <label>Pie de página (todo opcional)</label>
            <small className="field-hint">
              Lo que dejes vacío no se muestra. Si no cargás nada, el pie de página no aparece.
            </small>
            <div className="form-row">
              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={settingsForm.instagram}
                  onChange={handleSettingsInputChange}
                  placeholder="@mitienda o link completo"
                />
              </div>
              <div className="form-group">
                <label>Facebook</label>
                <input
                  type="text"
                  name="facebook"
                  value={settingsForm.facebook}
                  onChange={handleSettingsInputChange}
                  placeholder="mitienda o link completo"
                />
              </div>
            </div>
            <div className="form-group">
              <label>TikTok</label>
              <input
                type="text"
                name="tiktok"
                value={settingsForm.tiktok}
                onChange={handleSettingsInputChange}
                placeholder="@mitienda o link completo"
              />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                name="address"
                value={settingsForm.address}
                onChange={handleSettingsInputChange}
                placeholder="Ej: Av. Corrientes 1234, CABA"
              />
            </div>
            <div className="form-group">
              <label>Link de Google Maps</label>
              <input
                type="text"
                name="mapUrl"
                value={settingsForm.mapUrl}
                onChange={handleSettingsInputChange}
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>
            <div className="form-group">
              <label>Horarios</label>
              <textarea
                name="hours"
                value={settingsForm.hours}
                onChange={handleSettingsInputChange}
                placeholder={'Lunes a viernes: 10 a 19 hs\nSábados: 10 a 14 hs'}
                rows="3"
              ></textarea>
            </div>
          </div>

          <button type="submit" className="btn-add" disabled={isSavingSettings}>
            {isSavingSettings ? '⏳ Guardando...' : '💾 Guardar configuración'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2>Banners de ofertas y anuncios ({banners.length})</h2>
        <form onSubmit={handleSubmitBanner} className="settings-form">
          <div className="form-group">
            <label>{editingBannerId ? 'Imagen del banner (subí otra para reemplazarla)' : 'Imagen del banner *'}</label>
            <div className="image-upload">
              <input
                type="file"
                id="banner-input"
                accept="image/*"
                onChange={handleBannerImageChange}
                disabled={isSavingBanner}
              />
              <label htmlFor="banner-input" className="file-label">
                🖼️ Seleccionar imagen
              </label>
            </div>
            <small className="field-hint">
              Proporción 2:1 — ideal 1600×800 px. Dejá lo importante (texto, precio) en el centro: los bordes pueden recortarse.
            </small>
            {bannerForm.imagePreview && (
              <div className="banner-admin-preview">
                <img src={bannerForm.imagePreview} alt="Vista previa del banner" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Al hacer clic en el banner</label>
            <select name="linkType" value={bannerForm.linkType} onChange={handleBannerInputChange}>
              <option value="none">No hace nada</option>
              <option value="filter">Filtra los productos de la tienda</option>
              <option value="external">Abre un link externo (pestaña nueva)</option>
            </select>
          </div>

          {bannerForm.linkType === 'external' && (
            <div className="form-group">
              <label>Dirección del link</label>
              <input
                type="text"
                name="linkUrl"
                value={bannerForm.linkUrl}
                onChange={handleBannerInputChange}
                placeholder="https://www.instagram.com/mitienda"
              />
            </div>
          )}

          {bannerForm.linkType === 'filter' && (
            <>
              <div className="form-group">
                <label>Buscar por texto (ej: nombre de un producto)</label>
                <input
                  type="text"
                  name="filterSearch"
                  value={bannerForm.filterSearch}
                  onChange={handleBannerInputChange}
                  placeholder="Ej: Funda MagSafe"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Modelo</label>
                  <select name="filterModel" value={bannerForm.filterModel} onChange={handleBannerInputChange}>
                    <option value="">Cualquiera</option>
                    {modelSuggestions.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <select name="filterColor" value={bannerForm.filterColor} onChange={handleBannerInputChange}>
                    <option value="">Cualquiera</option>
                    {colorSuggestions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="submit" className="btn-add" disabled={isSavingBanner}>
              {isSavingBanner ? '⏳ Guardando...' : editingBannerId ? '✅ Guardar banner' : '+ Agregar banner'}
            </button>
            {editingBannerId && (
              <button type="button" className="btn-cancel" onClick={resetBannerForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>

        <div className="banners-admin-list">
          {banners.length === 0 ? (
            <p className="no-products">No hay banners aún</p>
          ) : (
            banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`banner-admin-item ${banner.active === false ? 'inactive' : ''} ${editingBannerId === banner.id ? 'editing' : ''}`}
              >
                <img src={banner.image} alt={`Banner ${index + 1}`} />
                <div className="banner-admin-info">
                  <strong>{banner.active === false ? 'Oculto' : 'Visible'}</strong>
                  <span>
                    {linkTypeLabels[banner.linkType || 'none']}
                    {banner.linkType === 'external' && banner.linkUrl ? ` · ${banner.linkUrl}` : ''}
                    {banner.linkType === 'filter'
                      ? ` · ${[banner.filterSearch, banner.filterModel, banner.filterColor].filter(Boolean).join(' / ')}`
                      : ''}
                  </span>
                </div>
                <div className="banner-admin-actions">
                  <button type="button" className="btn-edit" onClick={() => handleMoveBanner(index, -1)} disabled={index === 0} aria-label="Subir">↑</button>
                  <button type="button" className="btn-edit" onClick={() => handleMoveBanner(index, 1)} disabled={index === banners.length - 1} aria-label="Bajar">↓</button>
                  <button type="button" className="btn-edit" onClick={() => handleToggleBanner(banner)}>
                    {banner.active === false ? '👁️ Mostrar' : <><EyeOffIcon /> Ocultar</>}
                  </button>
                  <button type="button" className="btn-edit" onClick={() => handleEditBanner(banner)}>✏️ Editar</button>
                  <button type="button" className="btn-delete" onClick={() => handleDeleteBanner(banner.id)}>🗑️ Eliminar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="admin-content">
        <div className="form-section">
          <h2>{editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h2>
          <form onSubmit={handleSubmitProduct} className="product-form">
            <div className="form-group">
              <label>Nombre del Producto *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Funda iPhone 15 MagSafe"
                required
              />
            </div>

            <div className="form-group">
              <label>Variantes por modelo y color *</label>
              {formData.variants.map((variant, index) => (
                <div className="variant-row" key={index}>
                  <div className="variant-row-fields">
                    <input
                      type="text"
                      list="model-suggestions"
                      value={variant.model}
                      onChange={(e) => handleVariantChange(index, 'model', e.target.value)}
                      placeholder="Ej: iPhone 13"
                    />
                    <input
                      type="text"
                      list="color-suggestions"
                      value={variant.color}
                      onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                      placeholder="Ej: Rosa"
                    />
                    <input
                      type="number"
                      value={variant.price}
                      onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                      placeholder="Precio"
                      step="0.01"
                    />
                    <input
                      type="number"
                      value={variant.discount}
                      onChange={(e) => handleVariantChange(index, 'discount', e.target.value)}
                      placeholder="Desc. %"
                      min="0"
                      max="100"
                    />
                    <input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                      placeholder="Stock"
                      min="0"
                    />
                    {formData.variants.length > 1 && (
                      <button
                        type="button"
                        className="btn-remove-variant"
                        onClick={() => removeVariantRow(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="variant-row-image">
                    <select
                      className="variant-tag-select"
                      value={variant.tag}
                      onChange={(e) => handleVariantChange(index, 'tag', e.target.value)}
                      aria-label="Etiqueta de la variante"
                    >
                      <option value="">Sin etiqueta</option>
                      {Object.entries(PRODUCT_TAGS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="file"
                      id={`variant-image-${index}`}
                      className="variant-image-input"
                      accept="image/*"
                      onChange={(e) => handleVariantImageChange(index, e)}
                    />
                    <label htmlFor={`variant-image-${index}`} className="file-label-small">
                      🖼️ Imagen propia (opcional)
                    </label>
                    {(variant.imagePreview || variant.image) && (
                      <div className="variant-image-preview">
                        <img src={variant.imagePreview || variant.image} alt={variant.model || 'variante'} />
                        <button
                          type="button"
                          className="btn-remove-variant"
                          onClick={() => handleRemoveVariantImage(index)}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <datalist id="model-suggestions">
                {modelSuggestions.map(m => <option key={m} value={m} />)}
              </datalist>
              <datalist id="color-suggestions">
                {colorSuggestions.map(c => <option key={c} value={c} />)}
              </datalist>
              <button type="button" className="btn-add-variant" onClick={addVariantRow}>
                + Agregar variante
              </button>
            </div>

            <div className="form-group">
              <label>Descripción *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe el producto..."
                rows="3"
                required
              ></textarea>
            </div>

            <div className="form-group">
              <label>Imagen del Producto (opcional si cada variante tiene la suya)</label>
              <div className="image-upload">
                <input
                  type="file"
                  id="image-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploading}
                />
                <label htmlFor="image-input" className="file-label">
                  📸 Seleccionar imagen
                </label>
              </div>

              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button type="button" className="btn-remove-logo" onClick={handleRemoveImage}>
                    ✕ Quitar imagen
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-add" disabled={isUploading}>
                {isUploading
                  ? '⏳ Guardando...'
                  : editingId ? '✅ Guardar cambios' : '✅ Agregar Producto'}
              </button>
              {editingId && (
                <button type="button" className="btn-cancel" onClick={resetProductForm}>
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="products-list-section">
          <h2>
            Productos Actuales ({hasActiveFilters ? `${filteredProducts.length} de ${products.length}` : products.length})
          </h2>

          <div className="admin-filters">
            <input
              type="search"
              name="search"
              className="admin-filters-search"
              value={productFilters.search}
              onChange={handleFilterChange}
              placeholder="🔍 Buscar por nombre, descripción, modelo o color..."
            />
            <div className="admin-filters-row">
              <select name="model" value={productFilters.model} onChange={handleFilterChange} aria-label="Filtrar por modelo">
                <option value="">Todos los modelos</option>
                {modelSuggestions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select name="color" value={productFilters.color} onChange={handleFilterChange} aria-label="Filtrar por color">
                <option value="">Todos los colores</option>
                {colorSuggestions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select name="tag" value={productFilters.tag} onChange={handleFilterChange} aria-label="Filtrar por etiqueta">
                <option value="">Todas las etiquetas</option>
                {Object.entries(PRODUCT_TAGS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select name="stock" value={productFilters.stock} onChange={handleFilterChange} aria-label="Filtrar por stock">
                <option value="">Todo el stock</option>
                <option value="low">Stock bajo (1 a 3)</option>
                <option value="out">Sin stock</option>
              </select>
              <select name="sort" value={productFilters.sort} onChange={handleFilterChange} aria-label="Ordenar">
                <option value="default">Orden original</option>
                <option value="recent">Más recientes</option>
                <option value="name">Nombre (A-Z)</option>
                <option value="priceAsc">Precio: menor a mayor</option>
                <option value="priceDesc">Precio: mayor a menor</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button type="button" className="btn-cancel" onClick={() => setProductFilters(emptyProductFilters)}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>

          <div className="products-list">
            {products.length === 0 ? (
              <p className="no-products">No hay productos aún</p>
            ) : filteredProducts.length === 0 ? (
              <p className="no-products">Ningún producto coincide con la búsqueda</p>
            ) : (
              filteredProducts.map(product => (
                <div key={product.id} className={`product-item ${editingId === product.id ? 'editing' : ''}`}>
                  <img src={product.image || 'https://via.placeholder.com/100'} alt={product.name} />
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    {(() => {
                      const variants = product.variants ?? [];
                      const prices = variants.map(v => v.price).filter(n => typeof n === 'number');
                      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                      const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
                      const priceLabel = prices.length === 0
                        ? '—'
                        : prices.every(p => p === prices[0])
                          ? `$${formatPrice(prices[0])}`
                          : `$${formatPrice(Math.min(...prices))} - $${formatPrice(Math.max(...prices))}`;
                      return (
                        <>
                          <p>{priceLabel} · {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}</p>
                          <p className="product-meta">
                            {colors.length > 0 ? colors.join(', ') : 'Sin color'} · Stock total: {totalStock}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  <div className="product-item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditProduct(product)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
