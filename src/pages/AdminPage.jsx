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

const emptyProductForm = {
  name: '',
  price: '',
  discount: '',
  description: '',
  model: '',
  color: '',
  stock: '',
  image: '',
  imageFile: null
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
    () => [...new Set(products.map(p => p.model).filter(Boolean))],
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
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'discount' || name === 'stock' ? parseFloat(value) || '' : value
    }));
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
    setFormData({
      name: product.name || '',
      price: product.price || '',
      discount: product.discount || '',
      description: product.description || '',
      model: product.model || '',
      color: product.color || '',
      stock: product.stock ?? '',
      image: product.image || '',
      imageFile: null
    });
    setImagePreview(product.image || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.description) {
      alert('Por favor completa los campos requeridos');
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
        price: formData.price,
        discount: formData.discount || null,
        description: formData.description,
        model: formData.model || '',
        color: formData.color || '',
        stock: formData.stock === '' ? 0 : formData.stock,
        image: imageUrl
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

            <div className="form-row">
              <div className="form-group">
                <label>Precio *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="2499"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Descuento (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Modelo</label>
                <input
                  type="text"
                  name="model"
                  list="model-suggestions"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="Ej: iPhone 13"
                />
                <datalist id="model-suggestions">
                  {modelSuggestions.map(m => <option key={m} value={m} />)}
                </datalist>
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
            </div>

            <div className="form-group">
              <label>Stock</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="10"
                min="0"
              />
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
                    <p>${product.price} {product.discount && `(-${product.discount}%)`}</p>
                    <p className="product-meta">
                      {[product.model, product.color].filter(Boolean).join(' · ') || 'Sin modelo/color'}
                      {' · '}Stock: {product.stock ?? 0}
                    </p>
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
