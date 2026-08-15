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


// ====================== INACTIVITY LOGOUT ======================

const INACTIVITY_TIME = 30 * 60 * 1000;

let inactivityTimer = null;


function startInactivityTimer() {

    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }

    inactivityTimer = setTimeout(async () => {

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

    }, INACTIVITY_TIME);

}


function resetInactivityTimer() {

    if (auth.currentUser) {
        startInactivityTimer();
    }

}


// Detect user activity

[
    "click",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart"
].forEach((event) => {

    document.addEventListener(
        event,
        resetInactivityTimer
    );

});


// Check Firebase login state

auth.onAuthStateChanged((user) => {

    if (user) {

        startInactivityTimer();

    }

    else {

        if (inactivityTimer) {

            clearTimeout(inactivityTimer);

            inactivityTimer = null;

        }

    }

});


// ====================== REGISTRATION ======================

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


            if (password !== confirmPassword) {

                alert(
                    "Passwords do not match!"
                );

                return;

            }


            try {

                const response =
                    await fetch(
                        "https://eventsphere-dndh.onrender.com/send-otp",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email: email
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


                // Store user details temporarily

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
                    "OTP has been sent to your email."
                );


                // Replace instead of normal navigation

                window.location.replace(
                    "otp-verification.html"
                );

            }

            catch (error) {

                console.error(
                    error
                );

                alert(
                    "Server Error"
                );

            }

        }
    );

}


// ====================== LOGIN ======================

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

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                alert(
                    "Login Successful!"
                );


                /*
                 * IMPORTANT:
                 * replace() removes the login page
                 * from browser history.
                 */

                window.location.replace(
                    "customer-dashboard.html"
                );

            }

            catch (error) {

                alert(
                    error.message
                );

            }

        }
    );

}


// ====================== FORGOT PASSWORD ======================

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

                alert(
                    error.message
                );

            }

        }
    );

}


// ====================== USER LOGOUT ======================

window.logout =
    async function () {

        try {

            await signOut(auth);


            if (inactivityTimer) {

                clearTimeout(
                    inactivityTimer
                );

                inactivityTimer = null;

            }


            alert(
                "Logged out successfully!"
            );


            /*
             * replace() prevents returning to
             * the authenticated dashboard.
             */

            window.location.replace(
                "customer-login.html"
            );

        }

        catch (error) {

            alert(
                error.message
            );

        }

    };