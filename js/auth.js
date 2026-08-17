import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// INACTIVITY LOGOUT
// =========================================================

const INACTIVITY_TIME =
    30 * 60 * 1000;

let inactivityTimer = null;


// =========================================================
// START INACTIVITY TIMER
// =========================================================

function startInactivityTimer() {

    if (inactivityTimer) {

        clearTimeout(
            inactivityTimer
        );

    }

    inactivityTimer =
        setTimeout(
            async () => {

                try {

                    await signOut(auth);

                    alert(
                        "You have been logged out due to inactivity."
                    );

                    window.location.replace(
                        "customer-login.html"
                    );

                }

                catch (error) {

                    console.error(
                        "Automatic Logout Error:",
                        error
                    );

                }

            },
            INACTIVITY_TIME
        );

}


// =========================================================
// RESET INACTIVITY TIMER
// =========================================================

function resetInactivityTimer() {

    if (auth.currentUser) {

        startInactivityTimer();

    }

}


// =========================================================
// DETECT USER ACTIVITY
// =========================================================

[
    "click",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart"
].forEach(
    (event) => {

        document.addEventListener(
            event,
            resetInactivityTimer
        );

    }
);


// =========================================================
// CHECK FIREBASE LOGIN STATE
// =========================================================

auth.onAuthStateChanged(
    (user) => {

        if (user) {

            startInactivityTimer();

        }

        else {

            if (inactivityTimer) {

                clearTimeout(
                    inactivityTimer
                );

                inactivityTimer = null;

            }

        }

    }
);


// =========================================================
// CUSTOMER REGISTRATION
// =========================================================

const registerForm =
    document.getElementById(
        "registerForm"
    );


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const fullName =
                document.getElementById(
                    "fullName"
                ).value;


            const email =
                document.getElementById(
                    "email"
                ).value;


            const phone =
                document.getElementById(
                    "phone"
                ).value;


            const password =
                document.getElementById(
                    "password"
                ).value;


            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;


            // =================================================
            // PASSWORD CHECK
            // =================================================

            if (
                password !==
                confirmPassword
            ) {

                alert(
                    "Passwords do not match!"
                );

                return;

            }


            try {

                // =================================================
                // SEND CUSTOMER REGISTRATION OTP
                // =================================================

                const response =
                    await fetch(
                        "https://eventsphere-dndh.onrender.com/send-otp",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    email:
                                        email,

                                    loginType:
                                        "registration"

                                })

                        }
                    );


                const data =
                    await response.json();


                if (!data.success) {

                    alert(
                        data.message
                    );

                    return;

                }


                // =================================================
                // STORE USER DETAILS TEMPORARILY
                // =================================================

                localStorage.setItem(
                    "otpEmail",
                    email
                );


                localStorage.setItem(
                    "registerData",
                    JSON.stringify({

                        fullName,

                        email,

                        phone,

                        password

                    })
                );


                alert(
                    "Customer Registration OTP has been sent to your email."
                );


                // =================================================
                // GO TO REGISTRATION OTP
                // =================================================

                window.location.replace(
                    "otp-verification.html"
                );

            }

            catch (error) {

                console.error(
                    "Registration OTP Error:",
                    error
                );

                alert(
                    "Server Error"
                );

            }

        }
    );

}


// =========================================================
// CUSTOMER LOGIN
// =========================================================

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value;


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            try {

                // =================================================
                // NORMAL CUSTOMER LOGIN
                // =================================================

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                alert(
                    "Login Successful!"
                );


                // =================================================
                // CUSTOMER DASHBOARD
                // =================================================

                window.location.replace(
                    "customer-dashboard.html"
                );

            }

            catch (error) {

                console.error(
                    "Customer Login Error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

}


// =========================================================
// FORGOT PASSWORD
// =========================================================

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );


if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        async (e) => {

            e.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value;


            if (email === "") {

                alert(
                    "Please enter your email address first."
                );

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );


                alert(
                    "Password reset email has been sent."
                );

            }

            catch (error) {

                console.error(
                    "Password Reset Error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

}


// =========================================================
// CUSTOMER LOGOUT
// =========================================================

window.logout =
    async function () {

        try {

            await signOut(
                auth
            );


            if (inactivityTimer) {

                clearTimeout(
                    inactivityTimer
                );

                inactivityTimer = null;

            }


            alert(
                "Logged out successfully!"
            );


            window.location.replace(
                "customer-login.html"
            );

        }

        catch (error) {

            console.error(
                "Logout Error:",
                error
            );


            alert(
                error.message
            );

        }

    };