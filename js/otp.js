import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const otpForm = document.getElementById("otpForm");

otpForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const otp = document.getElementById("otp").value.trim();
    const email = localStorage.getItem("otpEmail");
    const registerData = JSON.parse(localStorage.getItem("registerData"));

    if (!email || !registerData) {
        alert("Registration session expired. Please register again.");
        window.location.href = "customer-register.html";
        return;
    }

    try {

        // Verify OTP from Render backend
        const response = await fetch("https://eventsphere-dndh.onrender.com/verify-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                otp
            })
        });

        if (!response.ok) {
            throw new Error("Unable to connect to the server.");
        }

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        // Create Firebase Authentication account
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            registerData.email,
            registerData.password
        );

        const user = userCredential.user;

        // Save customer details in Firestore
        await setDoc(doc(db, "users", user.uid), {
            fullName: registerData.fullName,
            email: registerData.email,
            phone: registerData.phone,
            role: "customer",
            createdAt: new Date()
        });

        // Clear temporary storage
        localStorage.removeItem("otpEmail");
        localStorage.removeItem("registerData");

        alert("Registration Successful!");

        window.location.href = "customer-login.html";

    } catch (error) {

        console.error("OTP Verification Error:", error);

        alert(error.message || "Failed to verify OTP. Please try again.");

    }

});