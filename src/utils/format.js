export function formatPrice(value) {
  return Math.round(Number(value) || 0).toLocaleString('es-AR');
}
