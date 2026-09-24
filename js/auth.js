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

               window.showEventSphereMessage(
    "error",
    "Registration Failed",
    "Passwords do not match. Please enter the same password in both fields."
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

                  window.showEventSphereMessage(
    "error",
    "OTP Failed",
    data.message || "Unable to send the registration OTP."
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


                window.showEventSphereMessage(
    "success",
    "OTP Sent",
    "Customer registration OTP has been sent to your email."
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

                window.showEventSphereMessage(
    "error",
    "Server Error",
    "Unable to send the registration OTP. Please try again later."
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


                window.showEventSphereMessage(
    "success",
    "Login Successful",
    "You have logged in successfully."
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

    let message =
        "Unable to login. Please try again.";

    switch (error.code) {

        case "auth/invalid-credential":

            message =
                "Incorrect email or password. Please try again.";

            break;


        case "auth/wrong-password":

            message =
                "Incorrect password. Please try again.";

            break;


        case "auth/user-not-found":

            message =
                "No account found with this email. Please register first.";

            break;


        case "auth/invalid-email":

            message =
                "Please enter a valid email address.";

            break;


        case "auth/user-disabled":

            message =
                "This account has been disabled. Please contact support.";

            break;


        case "auth/too-many-requests":

            message =
                "Too many login attempts. Please try again later.";

            break;


        case "auth/network-request-failed":

            message =
                "Unable to connect. Please check your internet connection.";

            break;


        default:

            message =
                "Login failed. Please check your email and password and try again.";

            break;

    }

window.showEventSphereMessage(
    "error",
    "Login Failed",
    message
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

               window.showEventSphereMessage(
    "warning",
    "Email Required",
    "Please enter your email address first."
);

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );

                  window.showEventSphereMessage(
    "success",
    "Reset Email Sent",
    "Password reset email has been sent to your email address."
);
            }

            catch (error) {

                console.error(
                    "Password Reset Error:",
                    error
                );


                window.showEventSphereMessage(
    "error",
    "Password Reset Failed",
    error.message || "Unable to send the password reset email."
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


            window.showEventSphereMessage(
    "warning",
    "Session Expired",
    "You have been logged out due to inactivity."
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