// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3x3NYG7HWVwkeXlcQTVH6T4IA9F2_2T4",
  authDomain: "equinox-galactic.firebaseapp.com",
  projectId: "equinox-galactic",
  storageBucket: "equinox-galactic.firebasestorage.app",
  messagingSenderId: "534200641170",
  appId: "1:534200641170:web:fef6df37289c8019aee84b",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
