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

    const otp = document.getElementById("otp").value;

    const email = localStorage.getItem("otpEmail");

    const registerData = JSON.parse(localStorage.getItem("registerData"));

    try {

        const response = await fetch("http://localhost:3000/verify-otp", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                email,
                otp

            })

        });

        const data = await response.json();

        if (!data.success) {

            alert(data.message);

            return;

        }

        // OTP verified

        const userCredential = await createUserWithEmailAndPassword(

            auth,

            registerData.email,

            registerData.password

        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {

            fullName: registerData.fullName,

            email: registerData.email,

            phone: registerData.phone,

            role: "customer"

        });

        localStorage.removeItem("otpEmail");

        localStorage.removeItem("registerData");

        alert("Registration Successful!");

        window.location.href = "customer-login.html";

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

});