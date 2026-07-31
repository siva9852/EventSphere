import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// ====================== ADMIN LOGIN ======================

const adminLoginForm = document.getElementById("adminLoginForm");

if (adminLoginForm) {

    adminLoginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("adminEmail").value;
        const password = document.getElementById("adminPassword").value;

        try {

            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            const user = userCredential.user;

            // Check Admin Role
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || docSnap.data().role !== "admin") {

                alert("Access Denied! You are not an Admin.");

                await signOut(auth);

                return;

            }

            // Send OTP
            const response = await fetch("http://localhost:3000/send-otp", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email
                })

            });

            const data = await response.json();

            if (!data.success) {

                alert(data.message);

                await signOut(auth);

                return;

            }

            // Save Admin Email
            localStorage.setItem("adminOtpEmail", email);

            alert("OTP sent to your Admin Email.");

            window.location.href = "admin-otp.html";

        } catch (error) {

            alert(error.message);

        }

    });

}

// ====================== LOGOUT ======================

window.logout = async function () {

    try {

        await signOut(auth);

        alert("Logged out successfully!");

        window.location.href = "admin-login.html";

    }

    catch (error) {

        alert(error.message);

    }

};