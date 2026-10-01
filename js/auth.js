import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
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


            const loginInput =
                document.getElementById(
                    "loginEmail"
                ).value.trim();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            if (!loginInput) {

                window.showEventSphereMessage(
                    "warning",
                    "Login Required",
                    "Please enter your email or phone number."
                );

                return;

            }


            try {

                let loginEmail =
                    loginInput;


                // =================================================
                // CHECK WHETHER INPUT IS PHONE NUMBER
                // =================================================

                const isPhone =
                    !loginInput.includes("@");


                if (isPhone) {

                    const response =
                        await fetch(
                            "https://eventsphere-dndh.onrender.com/customer-login-email",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        phone:
                                            loginInput

                                    })

                            }
                        );


                    const data =
                        await response.json();


                    if (!data.success) {

                        window.showEventSphereMessage(
                            "error",
                            "Login Failed",
                            data.message ||
                            "No account found with this phone number."
                        );

                        return;

                    }


                    loginEmail =
                        data.email;

                }


                // =================================================
                // FIREBASE LOGIN
                // =================================================

                await signInWithEmailAndPassword(
                    auth,
                    loginEmail,
                    password
                );


                window.showEventSphereMessage(
                    "success",
                    "Login Successful",
                    "You have logged in successfully.",
                    () => {

                        window.location.replace(
                            "customer-dashboard.html"
                        );

                    }
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
                            "Incorrect email/phone number or password. Please try again.";

                        break;


                    case "auth/wrong-password":

                        message =
                            "Incorrect password. Please try again.";

                        break;


                    case "auth/user-not-found":

                        message =
                            "No account found. Please register first.";

                        break;


                    case "auth/invalid-email":

                        message =
                            "Please enter a valid email address or phone number.";

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
                            "Login failed. Please check your email/phone number and password and try again.";

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


            const loginInput =
                document.getElementById(
                    "loginEmail"
                ).value.trim();


            if (loginInput === "") {

                window.showEventSphereMessage(
                    "warning",
                    "Email or Phone Required",
                    "Please enter your email address or phone number first."
                );

                return;

            }


            try {

                let resetEmail =
                    loginInput;


                // =================================================
                // PHONE NUMBER
                // =================================================

                const isPhone =
                    !loginInput.includes("@");


                if (isPhone) {

                    const response =
                        await fetch(
                            "https://eventsphere-dndh.onrender.com/customer-login-email",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        phone:
                                            loginInput

                                    })

                            }
                        );


                    const data =
                        await response.json();


                    if (!data.success) {

                        window.showEventSphereMessage(
                            "error",
                            "Account Not Found",
                            data.message ||
                            "No account found with this phone number."
                        );

                        return;

                    }


                    resetEmail =
                        data.email;

                }


                // =================================================
                // SEND RESET EMAIL
                // =================================================

                await sendPasswordResetEmail(
                    auth,
                    resetEmail
                );


                window.showEventSphereMessage(
                    "success",
                    "Reset Email Sent",
                    "Password reset email has been sent to your registered email address."
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
                    error.message ||
                    "Unable to send the password reset email."
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
                "success",
                "Logged Out",
                "You have been logged out successfully.",
                () => {

                    window.location.replace(
                        "customer-login.html"
                    );

                }
            );

        }


        catch (error) {

            console.error(
                "Logout Error:",
                error
            );


            window.showEventSphereMessage(
                "error",
                "Logout Failed",
                error.message ||
                "Unable to log out. Please try again."
            );

        }

    };

    // =========================================================
// CUSTOMER CHANGE PASSWORD WITH EMAIL OTP
// =========================================================

let pendingNewPassword = "";
let pendingPasswordEmail = "";


// =========================================================
// OPEN CHANGE PASSWORD
// =========================================================

window.openChangePassword =
    function () {

        const user =
            auth.currentUser;

        if (!user) {

            window.showEventSphereMessage(
                "warning",
                "Login Required",
                "Please login again."
            );

            return;
        }


        if (!user.email) {

            window.showEventSphereMessage(
                "error",
                "Email Not Found",
                "Your registered email address could not be found."
            );

            return;
        }


        const profilePopup =
            document.getElementById(
                "profilePopup"
            );

        if (profilePopup) {

            profilePopup.classList.remove(
                "show"
            );

        }


        document.getElementById(
            "newPassword"
        ).value = "";

        document.getElementById(
            "confirmNewPassword"
        ).value = "";


        document.getElementById(
            "changePasswordOverlay"
        ).classList.add(
            "show"
        );

    };


// =========================================================
// CLOSE CHANGE PASSWORD
// =========================================================

window.closeChangePassword =
    function () {

        const overlay =
            document.getElementById(
                "changePasswordOverlay"
            );

        if (overlay) {

            overlay.classList.remove(
                "show"
            );

        }


        const newPassword =
            document.getElementById(
                "newPassword"
            );

        const confirmPassword =
            document.getElementById(
                "confirmNewPassword"
            );

        if (newPassword) {

            newPassword.value = "";

        }

        if (confirmPassword) {

            confirmPassword.value = "";

        }

    };


// =========================================================
// SEND PASSWORD OTP
// =========================================================

const changePasswordForm =
    document.getElementById(
        "changePasswordForm"
    );


if (changePasswordForm) {

    changePasswordForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const user =
                auth.currentUser;


            if (!user) {

                window.showEventSphereMessage(
                    "warning",
                    "Login Required",
                    "Please login again."
                );

                return;
            }


            const email =
                String(
                    user.email || ""
                )
                    .trim()
                    .toLowerCase();


            if (!email) {

                window.showEventSphereMessage(
                    "error",
                    "Email Not Found",
                    "Your registered email address could not be found."
                );

                return;
            }


            const newPassword =
                document.getElementById(
                    "newPassword"
                ).value;


            const confirmPassword =
                document.getElementById(
                    "confirmNewPassword"
                ).value;


            if (!newPassword) {

                window.showEventSphereMessage(
                    "warning",
                    "Password Required",
                    "Please enter your new password."
                );

                return;
            }


            if (newPassword.length < 6) {

                window.showEventSphereMessage(
                    "warning",
                    "Password Too Short",
                    "Your new password must contain at least 6 characters."
                );

                return;
            }


            if (
                newPassword !==
                confirmPassword
            ) {

                window.showEventSphereMessage(
                    "error",
                    "Passwords Do Not Match",
                    "Please enter the same password in both fields."
                );

                return;
            }


            const sendButton =
                document.getElementById(
                    "sendPasswordOtpBtn"
                );


            sendButton.disabled =
                true;

            sendButton.textContent =
                "Sending...";


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
                                    email:
                                        email,

                                    loginType:
                                        "customer"
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to send verification code."
                    );

                }


                pendingNewPassword =
                    newPassword;

                pendingPasswordEmail =
                    email;


                document.getElementById(
                    "passwordOtpEmail"
                ).textContent =
                    email;


                document.getElementById(
                    "passwordVerificationCode"
                ).value = "";


                closeChangePassword();


                document.getElementById(
                    "passwordOtpOverlay"
                ).classList.add(
                    "show"
                );


                window.showEventSphereMessage(
                    "success",
                    "OTP Sent",
                    "A 6-digit verification code has been sent to your registered email address."
                );

            }

            catch (error) {

                console.error(
                    "Change Password OTP Error:",
                    error
                );


                window.showEventSphereMessage(
                    "error",
                    "OTP Failed",
                    error.message ||
                    "Unable to send the verification code."
                );

            }

            finally {

                sendButton.disabled =
                    false;

                sendButton.textContent =
                    "Continue";

            }

        }
    );

}


// =========================================================
// CLOSE PASSWORD OTP
// =========================================================

window.closePasswordOtp =
    function () {

        const overlay =
            document.getElementById(
                "passwordOtpOverlay"
            );

        if (overlay) {

            overlay.classList.remove(
                "show"
            );

        }


        const codeInput =
            document.getElementById(
                "passwordVerificationCode"
            );

        if (codeInput) {

            codeInput.value = "";

        }


        pendingNewPassword = "";
        pendingPasswordEmail = "";

    };


// =========================================================
// VERIFY PASSWORD OTP
// =========================================================

window.verifyPasswordChange =
    async function () {

        const code =
            document.getElementById(
                "passwordVerificationCode"
            ).value.trim();


        const verifyButton =
            document.getElementById(
                "verifyPasswordOtpBtn"
            );


        if (!code) {

            window.showEventSphereMessage(
                "warning",
                "Code Required",
                "Please enter the 6-digit verification code."
            );

            return;
        }


        if (!/^\d{6}$/.test(code)) {

            window.showEventSphereMessage(
                "warning",
                "Invalid Code",
                "Please enter a valid 6-digit verification code."
            );

            return;
        }


        if (
            !pendingNewPassword ||
            !pendingPasswordEmail
        ) {

            window.showEventSphereMessage(
                "error",
                "Verification Error",
                "Your password verification session has expired. Please try again."
            );

            closePasswordOtp();

            return;
        }


        const user =
            auth.currentUser;


        if (!user) {

            window.showEventSphereMessage(
                "warning",
                "Login Required",
                "Please login again."
            );

            closePasswordOtp();

            return;
        }


        verifyButton.disabled =
            true;

        verifyButton.textContent =
            "Verifying...";


        try {

            // =========================================
            // VERIFY EMAIL OTP
            // =========================================

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
                                email:
                                    pendingPasswordEmail,

                                otp:
                                    code
                            })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Invalid verification code."
                );

            }


            // =========================================
            // OTP VERIFIED
            // NOW UPDATE FIREBASE PASSWORD
            // =========================================

            await updatePassword(
                user,
                pendingNewPassword
            );


            closePasswordOtp();


            window.showEventSphereMessage(
                "success",
                "Password Changed",
                "Your password has been changed successfully."
            );


            pendingNewPassword = "";
            pendingPasswordEmail = "";

        }

        catch (error) {

            console.error(
                "Password Change Error:",
                error
            );


            let message =
                "Unable to change your password. Please try again.";


            switch (
                error.code
            ) {

                case "auth/weak-password":

                    message =
                        "The new password is too weak. Please use a stronger password.";

                    break;


                case "auth/requires-recent-login":

                    message =
                        "Your login session is too old. Please logout and login again, then retry the password change.";

                    break;


                case "auth/network-request-failed":

                    message =
                        "Unable to connect. Please check your internet connection.";

                    break;


                default:

                    message =
                        error.message ||
                        message;

                    break;

            }


            window.showEventSphereMessage(
                "error",
                "Password Change Failed",
                message
            );

        }

        finally {

            verifyButton.disabled =
                false;

            verifyButton.textContent =
                "Verify & Change";

        }

    };


// =========================================================
// RESEND PASSWORD OTP
// =========================================================

window.resendPasswordOtp =
    async function () {

        if (!pendingPasswordEmail) {

            window.showEventSphereMessage(
                "error",
                "Verification Error",
                "Your verification session has expired. Please try again."
            );

            closePasswordOtp();

            return;
        }


        const resendButton =
            document.getElementById(
                "resendPasswordOtpBtn"
            );


        resendButton.disabled =
            true;

        resendButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';


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
                                email:
                                    pendingPasswordEmail,

                                loginType:
                                    "customer"
                            })
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to resend verification code."
                );

            }


            document.getElementById(
                "passwordVerificationCode"
            ).value = "";


            window.showEventSphereMessage(
                "success",
                "Code Sent",
                "A new verification code has been sent to your registered email."
            );

        }

        catch (error) {

            console.error(
                "Password OTP Resend Error:",
                error
            );


            window.showEventSphereMessage(
                "error",
                "Resend Failed",
                error.message ||
                "Unable to resend the verification code."
            );

        }

        finally {

            resendButton.disabled =
                false;

            resendButton.innerHTML =
                '<i class="fa-solid fa-rotate-right"></i> Resend Code';

        }

    };