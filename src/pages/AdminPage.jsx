import { useState, useEffect, useMemo } from 'react';
import {
  addProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  getStoreSettings,
  updateStoreSettings,
  loginAdmin,
  logoutAdmin
} from '../services/firebase';
import { uploadImage } from '../services/cloudinary';
import { formatPrice } from '../utils/format';
import '../styles/admin.css';

const emptyVariant = { model: '', color: '', price: '', discount: '', stock: '', image: '', imageFile: null, imagePreview: '' };

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
  logoUrl: ''
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

  const [settingsForm, setSettingsForm] = useState(defaultStoreSettings);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadStoreSettings();
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
    }
  }

  const modelSuggestions = useMemo(
    () => [...new Set(products.flatMap(p => (p.variants ?? []).map(v => v.model)).filter(Boolean))],
    [products]
  );
  const colorSuggestions = useMemo(
    () => [...new Set(products.flatMap(p => (p.variants ?? []).map(v => v.color)).filter(Boolean))],
    [products]
  );

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
        const parsed = field === 'model' || field === 'color' ? value : (parseFloat(value) || (value === '' ? '' : 0));
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

      const newSettings = {
        title: settingsForm.title,
        tagline: settingsForm.tagline,
        whatsappNumber: settingsForm.whatsappNumber,
        logoUrl
      };

      await updateStoreSettings(newSettings);
      setSettingsForm(newSettings);
      setLogoFile(null);
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

          <button type="submit" className="btn-add" disabled={isSavingSettings}>
            {isSavingSettings ? '⏳ Guardando...' : '💾 Guardar configuración'}
          </button>
        </form>
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
          <h2>Productos Actuales ({products.length})</h2>
          <div className="products-list">
            {products.length === 0 ? (
              <p className="no-products">No hay productos aún</p>
            ) : (
              products.map(product => (
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
