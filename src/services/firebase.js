import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStore } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIRESEBASE_API_KEY,
    projectId: process.env.REACT_APP_FIRESEBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStore(app);