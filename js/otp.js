import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// OTP FORM
// =========================================================

const otpForm =
    document.getElementById("otpForm");


otpForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const otp =
            document.getElementById(
                "otp"
            ).value.trim();


        const email =
            localStorage.getItem(
                "otpEmail"
            );


        const registerDataString =
            localStorage.getItem(
                "registerData"
            );


        // =====================================================
        // CHECK REGISTRATION SESSION
        // =====================================================

        if (
            !email ||
            !registerDataString
        ) {

            window.showEventSphereMessage(
                "warning",
                "Registration Session Expired",
                "Your registration session has expired. Please register again.",
                () => {

                    window.location.replace(
                        "customer-register.html"
                    );

                }
            );

            return;

        }


        const registerData =
            JSON.parse(
                registerDataString
            );


        // =====================================================
        // CHECK OTP LENGTH
        // =====================================================

        if (otp.length !== 6) {

            window.showEventSphereMessage(
                "warning",
                "OTP Required",
                "Please enter the complete 6-digit OTP."
            );

            return;

        }


        try {

            // =================================================
            // VERIFY OTP
            // =================================================

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/verify-otp",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                email: email,

                                otp: otp

                            })

                    }
                );


            // =================================================
            // SERVER CONNECTION ERROR
            // =================================================

            if (!response.ok) {

                throw new Error(
                    "Unable to connect to the server."
                );

            }


            const data =
                await response.json();


            // =================================================
            // INVALID OTP
            // =================================================

            if (!data.success) {

                window.showEventSphereMessage(
                    "error",
                    "OTP Verification Failed",
                    data.message ||
                    "The OTP is incorrect or has expired."
                );

                return;

            }


            // =================================================
            // CREATE FIREBASE ACCOUNT
            // =================================================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    registerData.email,
                    registerData.password
                );


            const user =
                userCredential.user;


            // =================================================
            // SAVE CUSTOMER DETAILS
            // =================================================

            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {

                    fullName:
                        registerData.fullName,

                    email:
                        registerData.email,

                    phone:
                        registerData.phone,

                    role:
                        "customer",

                    createdAt:
                        new Date()

                }
            );


            // =================================================
            // CLEAR TEMPORARY DATA
            // =================================================

            localStorage.removeItem(
                "otpEmail"
            );


            localStorage.removeItem(
                "registerData"
            );


            // =================================================
            // REGISTRATION SUCCESS
            // =================================================

            window.showEventSphereMessage(
                "success",
                "Registration Successful",
                "Your EventSphere account has been created successfully.",
                () => {

                    window.location.replace(
                        "customer-login.html"
                    );

                }
            );

        }


        // =====================================================
        // ERROR
        // =====================================================

        catch (error) {

            console.error(
                "OTP Verification Error:",
                error
            );


            window.showEventSphereMessage(
                "error",
                "Registration Failed",
                error.message ||
                "Failed to verify OTP. Please try again."
            );

        }

    }
);
