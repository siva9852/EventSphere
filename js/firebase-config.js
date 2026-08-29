import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    initializeAuth,
    browserSessionPersistence
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
// CUSTOMER FIREBASE APP
// =====================================================

const customerApp =
    initializeApp(
        firebaseConfig
    );


// =====================================================
// ADMIN FIREBASE APP
// =====================================================
//
// This is a separate Firebase App instance.
// Therefore Admin Auth is completely separate
// from Customer Auth.
//
// =====================================================

const adminApp =
    initializeApp(
        firebaseConfig,
        "EventSphereAdmin"
    );


// =====================================================
// CUSTOMER AUTH
// =====================================================

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

export const adminAuth =
    initializeAuth(
        adminApp,
        {
            persistence:
                browserSessionPersistence
        }
    );


// =====================================================
// FIRESTORE
// =====================================================

export const db =
    getFirestore(
        customerApp
    );