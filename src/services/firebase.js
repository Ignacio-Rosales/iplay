import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
// experimentalAutoDetectLongPolling: evita el transporte WebChannel que algunas
// redes/antivirus/extensiones bloquean (se veían 503 en .../Write/channel y las
// escrituras nunca resolvían); Firestore detecta el mejor transporte disponible.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const auth = getAuth(app);

// Login "silencioso" del admin: se llama después de validar VITE_ADMIN_PASSWORD
// contra una cuenta fija de Firebase Auth, para que las reglas de Firestore puedan
// exigir request.auth != null en las escrituras sin agregar una pantalla de login extra.
export const loginAdmin = () =>
  signInWithEmailAndPassword(
    auth,
    import.meta.env.VITE_ADMIN_AUTH_EMAIL,
    import.meta.env.VITE_ADMIN_AUTH_PASSWORD
  );

export const logoutAdmin = () => signOut(auth);

// Función para agregar producto
export const addProduct = async (product) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), product);
    return docRef.id;
  } catch (error) {
    console.error('Error al agregar producto:', error);
    throw error;
  }
};

// Función para obtener productos
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return [];
  }
};

// Función para eliminar producto
export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.error('Error al eliminar producto:', error);
  }
};

// Función para actualizar producto
export const updateProduct = async (productId, product) => {
  try {
    await updateDoc(doc(db, 'products', productId), product);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw error;
  }
};

// Función para obtener la configuración de la tienda
export const getStoreSettings = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'store'));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error('Error al obtener configuración de la tienda:', error);
    return null;
  }
};

// Función para actualizar la configuración de la tienda
export const updateStoreSettings = async (settings) => {
  try {
    await setDoc(doc(db, 'settings', 'store'), settings, { merge: true });
  } catch (error) {
    console.error('Error al actualizar configuración de la tienda:', error);
    throw error;
  }
};