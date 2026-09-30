// Etiquetas que el cliente asigna a mano a cada variante (se guarda la clave en `variant.tag`).
// `icon` y `filterLabel` (en plural) son los del botón de filtro de la tienda; `label` es el de la cinta.
export const PRODUCT_TAGS = {
  nuevo: { label: 'Nuevo', filterLabel: 'Nuevos', icon: '✨' },
  oferta: { label: 'Oferta', filterLabel: 'Ofertas', icon: '🏷️' },
  ultimas: { label: 'Últimas unidades', filterLabel: 'Últimas unidades', icon: '⏳' }
};

// Una variante está "en oferta" si tiene descuento o el cliente la etiquetó como oferta.
// Es lo que usan los filtros y la cinta, para que siempre coincidan.
export const isOfferVariant = (variant) =>
  variant?.tag === 'oferta' || (variant?.discount ?? 0) > 0;

// ¿La variante pertenece a esta etiqueta a la hora de filtrar? Oferta se deduce también del
// descuento; nuevo y últimas unidades salen solo de lo que eligió el cliente.
export const variantHasTag = (variant, key) =>
  key === 'oferta' ? isOfferVariant(variant) : variant?.tag === key;

// Con varias etiquetas elegidas alcanza con cumplir una (o); sin ninguna elegida no filtra.
export const matchesAnyTag = (variant, keys) =>
  keys.length === 0 || keys.some(key => variantHasTag(variant, key));

// Etiqueta que se dibuja sobre la imagen: la elegida a mano manda; si no hay, una
// variante con descuento muestra "Oferta" sola.
export const getRibbonKey = (variant) => {
  if (PRODUCT_TAGS[variant?.tag]) return variant.tag;
  return isOfferVariant(variant) ? 'oferta' : null;
};
