import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addProduct, getProducts, deleteProduct } from '../services/firebase';
import { uploadImage } from '../services/cloudinary';
import '../styles/admin.css';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    discount: '',
    description: '',
    image: '',
    imageFile: null
  });
  const [imagePreview, setImagePreview] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated]);

  const loadProducts = async () => {
    const productsData = await getProducts();
    setProducts(productsData);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'discount' ? parseFloat(value) || '' : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe pesar más de 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        imageFile: file
      }));

      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.description) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    if (!formData.imageFile) {
      alert('Por favor selecciona una imagen');
      return;
    }

    setIsUploading(true);

    try {
      // Subir imagen
      const imageUrl = await uploadImage(formData.imageFile);

      if (!imageUrl) {
        alert('Error al subir la imagen');
        setIsUploading(false);
        return;
      }

      const newProduct = {
        name: formData.name,
        price: formData.price,
        discount: formData.discount || null,
        description: formData.description,
        image: imageUrl,
        createdAt: new Date()
      };

      await addProduct(newProduct);

      // Limpiar formulario
      setFormData({ name: '', price: '', discount: '', description: '', image: '', imageFile: null });
      setImagePreview('');

      await loadProducts();
      setIsUploading(false);
      alert('Producto agregado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      setIsUploading(false);
      alert('Error al agregar el producto');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('¿Eliminar este producto?')) {
      await deleteProduct(productId);
      loadProducts();
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
            />
            <button type="submit">Acceder</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>📦 Gestión de Productos</h1>
        <button className="logout-btn" onClick={() => setIsAuthenticated(false)}>
          Cerrar sesión
        </button>
      </div>

      <div className="admin-content">
        <div className="form-section">
          <h2>Agregar Nuevo Producto</h2>
          <form onSubmit={handleAddProduct} className="product-form">
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
              <label>Imagen del Producto *</label>
              <div className="image-upload">
                <input
                  type="file"
                  id="image-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
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

            <button type="submit" className="btn-add" disabled={isUploading}>
              {isUploading ? '⏳ Subiendo...' : '✅ Agregar Producto'}
            </button>
          </form>
        </div>

        <div className="products-list-section">
          <h2>Productos Actuales ({products.length})</h2>
          <div className="products-list">
            {products.length === 0 ? (
              <p className="no-products">No hay productos aún</p>
            ) : (
              products.map(product => (
                <div key={product.id} className="product-item">
                  <img src={product.image || 'https://via.placeholder.com/100'} alt={product.name} />
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p>${product.price} {product.discount && `(-${product.discount}%)`}</p>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}