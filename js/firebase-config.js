import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    initializeAuth,
    browserSessionPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {

    apiKey:
        "AIzaSyD3brV0IsvPqpwPZ40uH-tQXNn2XTBciYI",

    authDomain:
        "eventsphere-9b964.firebaseapp.com",

    projectId:
        "eventsphere-9b964",

    storageBucket:
        "eventsphere-9b964.firebasestorage.app",

    messagingSenderId:
        "219276930403",

    appId:
        "1:219276930403:web:43ff0e5e824e8a4c027756"
};


// =====================================================
// CUSTOMER APP
// =====================================================

const customerApp =
    initializeApp(
        firebaseConfig
    );


// =====================================================
// ADMIN APP
// =====================================================

const adminApp =
    initializeApp(
        firebaseConfig,
        "EventSphereAdmin"
    );


// =====================================================
// CUSTOMER AUTH
// =====================================================
// Customer stays session based.

export const auth =
    initializeAuth(
        customerApp,
        {
            persistence:
                browserSessionPersistence
        }
    );


// =====================================================
// ADMIN AUTH
// =====================================================
// Admin uses local persistence so the authenticated
// Admin user survives navigation to admin-otp.html.

export const adminAuth =
    initializeAuth(
        adminApp,
        {
            persistence:
                browserLocalPersistence
        }
    );


// =====================================================
// FIRESTORE
// =====================================================

export const db =
    getFirestore(
        customerApp
    );          