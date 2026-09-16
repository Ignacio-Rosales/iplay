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
import '../styles/admin.css';

const emptyVariant = { model: '', price: '', discount: '', stock: '' };

const emptyProductForm = {
  name: '',
  description: '',
  color: '',
  image: '',
  imageFile: null,
  variants: [{ ...emptyVariant }]
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
    () => [...new Set(products.map(p => p.color).filter(Boolean))],
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
        const parsed = field === 'model' ? value : (parseFloat(value) || (value === '' ? '' : 0));
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
          price: v.price ?? '',
          discount: v.discount ?? '',
          stock: v.stock ?? ''
        }))
      : [{
          model: product.model || '',
          price: product.price ?? '',
          discount: product.discount ?? '',
          stock: product.stock ?? ''
        }];
    setFormData({
      name: product.name || '',
      description: product.description || '',
      color: product.color || '',
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

    const cleanedVariants = formData.variants
      .filter(v => v.model.trim() !== '')
      .map(v => ({
        model: v.model.trim(),
        price: parseFloat(v.price) || 0,
        discount: v.discount === '' ? 0 : parseFloat(v.discount) || 0,
        stock: v.stock === '' ? 0 : parseFloat(v.stock) || 0
      }));

    if (cleanedVariants.length === 0) {
      alert('Agrega al menos una variante con modelo y precio');
      return;
    }
    if (cleanedVariants.some(v => !v.price || v.price <= 0)) {
      alert('Cada variante necesita un precio válido mayor a 0');
      return;
    }

    if (!editingId && !formData.imageFile) {
      alert('Por favor selecciona una imagen');
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

      const productData = {
        name: formData.name,
        description: formData.description,
        color: formData.color || '',
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
              <label>Color</label>
              <input
                type="text"
                name="color"
                list="color-suggestions"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Ej: Negro"
              />
              <datalist id="color-suggestions">
                {colorSuggestions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label>Variantes por modelo *</label>
              {formData.variants.map((variant, index) => (
                <div className="variant-row" key={index}>
                  <input
                    type="text"
                    list="model-suggestions"
                    value={variant.model}
                    onChange={(e) => handleVariantChange(index, 'model', e.target.value)}
                    placeholder="Ej: iPhone 13"
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
              ))}
              <datalist id="model-suggestions">
                {modelSuggestions.map(m => <option key={m} value={m} />)}
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
              <label>Imagen del Producto {editingId ? '' : '*'}</label>
              <div className="image-upload">
                <input
                  type="file"
                  id="image-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingId}
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
                      const priceLabel = prices.length === 0
                        ? '—'
                        : prices.every(p => p === prices[0])
                          ? `$${prices[0]}`
                          : `$${Math.min(...prices)} - $${Math.max(...prices)}`;
                      return (
                        <>
                          <p>{priceLabel} · {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}</p>
                          <p className="product-meta">
                            {product.color || 'Sin color'} · Stock total: {totalStock}
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
