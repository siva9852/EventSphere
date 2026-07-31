import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3brV0IsvPqpwPZ40uH-tQXNn2XTBciYI",
  authDomain: "eventsphere-9b964.firebaseapp.com",
  projectId: "eventsphere-9b964",
  storageBucket: "eventsphere-9b964.firebasestorage.app",
  messagingSenderId: "219276930403",
  appId: "1:219276930403:web:43ff0e5e824e8a4c027756"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);