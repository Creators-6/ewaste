// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA5Xk6syLhoEVPKpOptk7xbhdXH4vunGmQ",
  authDomain: "ewaste-f45c3.firebaseapp.com",
  projectId: "ewaste-f45c3",
  storageBucket: "ewaste-f45c3.appspot.com",
  messagingSenderId: "513895863111",
  appId: "1:513895863111:web:ef421422ff96ebc3663262",
  measurementId: "G-G519C28EWG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);
export { auth, storage, db };