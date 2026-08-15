import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


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


        if (
            !email ||
            !registerDataString
        ) {

            alert(
                "Registration session expired. Please register again."
            );


            window.location.replace(
                "customer-register.html"
            );


            return;

        }


        const registerData =
            JSON.parse(
                registerDataString
            );


        if (otp.length !== 6) {

            alert(
                "Please enter the complete 6-digit OTP."
            );

            return;

        }


        try {

            // ================= VERIFY OTP =================

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


            if (!response.ok) {

                throw new Error(
                    "Unable to connect to the server."
                );

            }


            const data =
                await response.json();


            if (!data.success) {

                alert(
                    data.message
                );

                return;

            }


            // ================= CREATE FIREBASE ACCOUNT =================

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    registerData.email,
                    registerData.password
                );


            const user =
                userCredential.user;


            // ================= SAVE CUSTOMER DETAILS =================

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


            // ================= CLEAR TEMPORARY DATA =================

            localStorage.removeItem(
                "otpEmail"
            );


            localStorage.removeItem(
                "registerData"
            );


            alert(
                "Registration Successful!"
            );


            /*
             * IMPORTANT:
             * replace() prevents the OTP page
             * from appearing again when the
             * user presses Chrome Back.
             */

            window.location.replace(
                "customer-login.html"
            );

        }


        catch (error) {

            console.error(
                "OTP Verification Error:",
                error
            );


            alert(
                error.message ||
                "Failed to verify OTP. Please try again."
            );

        }

    }
);