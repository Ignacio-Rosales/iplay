// El cliente puede cargar "@mitienda", "mitienda" o la URL completa: todo se
// normaliza a una URL absoluta al momento de mostrarlo.
export const socialUrl = (value, baseUrl) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, '').replace(/^\/+/, '');
  return `${baseUrl}${handle}`;
};

export const externalUrl = (value) => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};
