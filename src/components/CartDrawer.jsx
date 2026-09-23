import { useCart } from '../context/useCart';
import { formatPrice } from '../utils/format';

const getFinalPrice = (item) => item.discount
  ? item.price * (1 - item.discount / 100)
  : item.price;

const buildOrderMessage = (items, totalPrice) => {
  const lines = items.map(item => {
    const finalPrice = formatPrice(getFinalPrice(item));
    const variantLabel = [item.color, item.model].filter(Boolean).join(' - ');
    const stockNote = item.stock <= 0 ? ' (verificar disponibilidad)' : '';
    return `▪️ *${item.name}*${variantLabel ? ` (${variantLabel})` : ''} x${item.qty} — $${finalPrice} c/u${stockNote}`;
  });

  return `¡Hola! Quiero hacer este pedido:\n\n${lines.join('\n')}\n\n*Total: $${formatPrice(totalPrice)}*`;
};

export default function CartDrawer({ whatsappNumber }) {
  const { items, isOpen, closeCart, removeItem, updateQty, clearCart, totalPrice } = useCart();

  if (!isOpen) return null;

  const handleConfirm = () => {
    const mensajeEncode = encodeURIComponent(buildOrderMessage(items, totalPrice));
    const urlWhatsApp = `https://wa.me/${whatsappNumber}?text=${mensajeEncode}`;
    window.open(urlWhatsApp, '_blank');
    clearCart();
    closeCart();
  };

  return (
    <div className="cart-overlay" onClick={closeCart}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Tu carrito</h2>
          <button type="button" className="btn-close-cart" onClick={closeCart}>✕</button>
        </div>

        {items.length === 0 ? (
          <p className="cart-empty">Todavía no agregaste productos.</p>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => {
                const variantLabel = [item.color, item.model].filter(Boolean).join(' - ');
                return (
                  <div key={item.key} className="cart-item">
                    <img src={item.image} alt={item.name} />
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.name}</span>
                      {variantLabel && <span className="cart-item-variant">{variantLabel}</span>}
                      <span className="cart-item-price">${formatPrice(getFinalPrice(item))} c/u</span>
                      {item.stock <= 0 && <span className="cart-item-warning">Sin stock confirmado</span>}
                    </div>
                    <div className="cart-item-qty">
                      <button type="button" onClick={() => updateQty(item.key, item.qty - 1)}>-</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.key, item.qty + 1)}>+</button>
                    </div>
                    <button type="button" className="btn-remove-item" onClick={() => removeItem(item.key)} aria-label="Quitar del carrito">🗑️</button>
                  </div>
                );
              })}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <span>${formatPrice(totalPrice)}</span>
              </div>
              <button
                type="button"
                className="btn-confirm-order"
                onClick={handleConfirm}
                disabled={!whatsappNumber}
              >
                📲 Confirmar pedido por WhatsApp
              </button>
              {!whatsappNumber && <p className="cart-warning">Número de WhatsApp no configurado.</p>}
              <button type="button" className="btn-clear-cart" onClick={clearCart}>Vaciar carrito</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
