import {
    auth,
    db
} from "./firebase-config.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// BACKEND
// =====================================================

const API_BASE_URL =
    "https://eventsphere-dndh.onrender.com";


// =====================================================
// HTML ELEMENTS
// =====================================================

const adminOtpForm =
    document.getElementById(
        "adminOtpForm"
    );

const otpInputs =
    document.querySelectorAll(
        ".otp-digit"
    );

const hiddenOtp =
    document.getElementById(
        "adminOtp"
    );

const resendButton =
    document.getElementById(
        "resendAdminOtp"
    );


// =====================================================
// UPDATE HIDDEN OTP
// =====================================================

function updateHiddenOtp() {

    if (!hiddenOtp) {
        return;
    }


    hiddenOtp.value =
        Array.from(otpInputs)
            .map(
                input =>
                    input.value
            )
            .join("");

}


// =====================================================
// OTP INPUT HANDLING
// =====================================================

otpInputs.forEach(
    (input, index) => {

        input.addEventListener(
            "input",
            () => {

                input.value =
                    input.value.replace(
                        /\D/g,
                        ""
                    );


                if (
                    input.value &&
                    index <
                    otpInputs.length - 1
                ) {

                    otpInputs[
                        index + 1
                    ].focus();

                }


                updateHiddenOtp();

            }
        );


        input.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                        "Backspace" &&
                    !input.value &&
                    index > 0
                ) {

                    otpInputs[
                        index - 1
                    ].focus();

                }

            }
        );

    }
);


// =====================================================
// GET OTP
// =====================================================

function getOtp() {

    updateHiddenOtp();


    return (
        hiddenOtp?.value.trim() ||
        ""
    );

}


// =====================================================
// VERIFY ADMIN OTP
// =====================================================

if (adminOtpForm) {

    adminOtpForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const otp =
                getOtp();


            const email =
                localStorage.getItem(
                    "adminOtpEmail"
                );


            console.log(
                "Admin OTP:",
                otp
            );


            console.log(
                "Admin Email:",
                email
            );


            // =================================================
            // CHECK EMAIL
            // =================================================

            if (!email) {

                alert(
                    "Admin login session expired. Please login again."
                );


                window.location.replace(
                    "admin-login.html"
                );


                return;

            }


            // =================================================
            // CHECK OTP
            // =================================================

            if (
                otp.length !== 6
            ) {

                alert(
                    "Please enter the complete 6-digit OTP."
                );


                return;

            }


            const verifyButton =
                adminOtpForm.querySelector(
                    "button[type='submit']"
                );


            try {

                // =================================================
                // LOADING
                // =================================================

                if (verifyButton) {

                    verifyButton.disabled =
                        true;

                    verifyButton.textContent =
                        "Verifying...";

                }


                // =================================================
                // VERIFY OTP ON SERVER
                // =================================================

                const response =
                    await fetch(
                        `${API_BASE_URL}/verify-otp`,
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

                                    otp:
                                        otp,

                                    loginType:
                                        "admin"

                                })

                        }
                    );


                const data =
                    await response.json();


                console.log(
                    "OTP Response:",
                    data
                );


                // =================================================
                // OTP FAILED
                // =================================================

                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Invalid OTP."
                    );


                    if (verifyButton) {

                        verifyButton.disabled =
                            false;

                        verifyButton.textContent =
                            "Verify OTP";

                    }


                    return;

                }


                // =================================================
                // OTP SUCCESS
                // =================================================

                console.log(
                    "Admin OTP verified successfully."
                );


                // =================================================
                // GET ADMIN UID SAVED DURING ADMIN LOGIN
                // =================================================

                const adminUid =
                    sessionStorage.getItem(
                        "adminUid"
                    );


                console.log(
                    "Saved Admin UID:",
                    adminUid
                );


                // =================================================
                // UID NOT FOUND
                // =================================================

                if (!adminUid) {

                    alert(
                        "Admin login session expired. Please login again."
                    );


                    if (verifyButton) {

                        verifyButton.disabled =
                            false;

                        verifyButton.textContent =
                            "Verify OTP";

                    }


                    return;

                }


                // =================================================
                // CHECK FIRESTORE ADMIN ACCOUNT
                // =================================================

                const userRef =
                    doc(
                        db,
                        "users",
                        adminUid
                    );


                const userSnapshot =
                    await getDoc(
                        userRef
                    );


                // =================================================
                // ADMIN DOCUMENT NOT FOUND
                // =================================================

                if (
                    !userSnapshot.exists()
                ) {

                    await signOut(
                        auth
                    );


                    sessionStorage.removeItem(
                        "adminUid"
                    );


                    alert(
                        "Admin account not found."
                    );


                    window.location.replace(
                        "admin-login.html"
                    );


                    return;

                }


                // =================================================
                // CHECK ADMIN ROLE
                // =================================================

                const userData =
                    userSnapshot.data();


                if (
                    userData.role !==
                    "admin"
                ) {

                    await signOut(
                        auth
                    );


                    sessionStorage.removeItem(
                        "adminUid"
                    );


                    alert(
                        "Access denied. This account is not an admin."
                    );


                    window.location.replace(
                        "admin-login.html"
                    );


                    return;

                }


                // =================================================
                // ADMIN OTP COMPLETED
                // =================================================

                sessionStorage.setItem(
                    "adminOtpVerified",
                    "true"
                );


                sessionStorage.setItem(
                    "adminOtpEmail",
                    email
                );


                // =================================================
                // REMOVE TEMPORARY OTP EMAIL
                // =================================================

                localStorage.removeItem(
                    "adminOtpEmail"
                );


                console.log(
                    "ADMIN LOGIN SUCCESSFUL"
                );


                // =================================================
                // OPEN ADMIN DASHBOARD
                // =================================================

                window.location.replace(
                    "admin-dashboard.html"
                );

            }


            catch (error) {

                console.error(
                    "Admin OTP Error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to verify OTP. Please try again."
                );


                if (verifyButton) {

                    verifyButton.disabled =
                        false;

                    verifyButton.textContent =
                        "Verify OTP";

                }

            }

        }
    );

}


// =====================================================
// RESEND ADMIN OTP
// =====================================================

if (resendButton) {

    resendButton.addEventListener(
        "click",
        async () => {

            const email =
                localStorage.getItem(
                    "adminOtpEmail"
                );


            if (!email) {

                alert(
                    "Admin login session expired. Please login again."
                );


                window.location.replace(
                    "admin-login.html"
                );


                return;

            }


            try {

                resendButton.disabled =
                    true;


                resendButton.textContent =
                    "Sending...";


                const response =
                    await fetch(
                        `${API_BASE_URL}/send-otp`,
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
                                        "admin"

                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Unable to resend OTP."
                    );


                    resendButton.disabled =
                        false;


                    resendButton.textContent =
                        "Resend OTP";


                    return;

                }


                // =================================================
                // CLEAR OTP BOXES
                // =================================================

                otpInputs.forEach(
                    input => {

                        input.value =
                            "";

                    }
                );


                updateHiddenOtp();


                // =================================================
                // FOCUS FIRST BOX
                // =================================================

                if (
                    otpInputs.length > 0
                ) {

                    otpInputs[0].focus();

                }


                alert(
                    "A new Admin OTP has been sent to your email."
                );


                resendButton.disabled =
                    false;


                resendButton.textContent =
                    "Resend OTP";

            }


            catch (error) {

                console.error(
                    "Resend OTP Error:",
                    error
                );


                alert(
                    "Unable to resend OTP. Please try again."
                );


                resendButton.disabled =
                    false;


                resendButton.textContent =
                    "Resend OTP";

            }

        }
    );

}


// =====================================================
// CHECK OTP PAGE
// =====================================================

const adminOtpEmail =
    localStorage.getItem(
        "adminOtpEmail"
    );


if (!adminOtpEmail) {

    window.location.replace(
        "admin-login.html"
    );

}