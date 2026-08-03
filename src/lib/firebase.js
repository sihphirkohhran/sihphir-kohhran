import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBzbtcO4D8IdLZOvGg7yy5KDaWCumlOEIA",
  authDomain: "sihphir-presbyterian-kohhran.firebaseapp.com",
  projectId: "sihphir-presbyterian-kohhran",
  storageBucket: "sihphir-presbyterian-kohhran.firebasestorage.app",
  messagingSenderId: "298034346266",
  appId: "1:298034346266:web:a3645de6669348047a54a3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);