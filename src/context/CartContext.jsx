import { useState, useEffect, useMemo } from 'react';
import { CartContext } from './cart-context';

const STORAGE_KEY = 'iplay_cart';

const variantKey = (productId, variant) => `${productId}::${variant.model || ''}::${variant.color || ''}`;

const loadStoredCart = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage puede fallar (modo privado, cuota llena, etc.) — el carrito
      // sigue funcionando en memoria para esta sesión, solo no persiste.
    }
  }, [items]);

  const addItem = (product, variant) => {
    const key = variantKey(product.id, variant);
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        key,
        productId: product.id,
        name: product.name,
        image: variant.image || product.image,
        model: variant.model || '',
        color: variant.color || '',
        price: variant.price,
        discount: variant.discount || 0,
        stock: variant.stock ?? 0,
        qty: 1
      }];
    });
  };

  const removeItem = (key) => {
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen(prev => !prev);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  const totalPrice = useMemo(() => items.reduce((sum, i) => {
    const finalPrice = i.discount ? i.price * (1 - i.discount / 100) : i.price;
    return sum + finalPrice * i.qty;
  }, 0), [items]);

  const value = {
    items, addItem, removeItem, updateQty, clearCart,
    isOpen, openCart, closeCart, toggleCart,
    totalCount, totalPrice
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
