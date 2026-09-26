const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Pide a Cloudinary una versión ya redimensionada/comprimida de la imagen
// (en vez de bajar el original) insertando las transformaciones en la URL:
// f_auto elige el mejor formato para el navegador (webp/avif), q_auto ajusta
// la calidad automáticamente y w_<width> limita el ancho. Si la url no es de
// Cloudinary (ej. mocks o datos viejos) se devuelve sin tocar.
export const getOptimizedImageUrl = (url, width) => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
};

// Sube una imagen a Cloudinary usando un upload preset "unsigned"
export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error('Error al subir imagen a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error al subir imagen:', error);
    return null;
  }
};
