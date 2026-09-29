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

const emailOtpMethod =
    document.getElementById(
        "emailOtpMethod"
    );

const authenticatorMethod =
    document.getElementById(
        "authenticatorMethod"
    );

const verificationMethods =
    document.getElementById(
        "verificationMethods"
    );

const emailOtpSection =
    document.getElementById(
        "emailOtpSection"
    );

const authenticatorSection =
    document.getElementById(
        "authenticatorSection"
    );

const authenticatorForm =
    document.getElementById(
        "authenticatorForm"
    );

const authenticatorCode =
    document.getElementById(
        "authenticatorCode"
    );

const qrContainer =
    document.getElementById(
        "qrContainer"
    );

const manualSecret =
    document.getElementById(
        "manualSecret"
    );

const authenticatorSetup =
    document.getElementById(
        "authenticatorSetup"
    );

const authenticatorExisting =
    document.getElementById(
        "authenticatorExisting"
    );

const backToMethodsEmail =
    document.getElementById(
        "backToMethodsEmail"
    );

const backToMethodsAuthenticator =
    document.getElementById(
        "backToMethodsAuthenticator"
    );

const verificationDescription =
    document.getElementById(
        "verificationDescription"
    );


// =====================================================
// ADMIN EMAIL
// =====================================================

const adminOtpEmail =
    localStorage.getItem(
        "adminOtpEmail"
    );


// =====================================================
// CHECK ADMIN LOGIN SESSION
// =====================================================

if (!adminOtpEmail) {

    window.location.replace(
        "admin-login.html"
    );

}


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
                    event.key === "Backspace" &&
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
// GET EMAIL OTP
// =====================================================

function getOtp() {

    updateHiddenOtp();

    return (
        hiddenOtp?.value.trim() ||
        ""
    );

}


// =====================================================
// RESET EMAIL OTP BOXES
// =====================================================

function clearOtpBoxes() {

    otpInputs.forEach(
        input => {

            input.value = "";

        }
    );

    updateHiddenOtp();

}


// =====================================================
// SHOW VERIFICATION METHODS
// =====================================================

function showVerificationMethods() {

    if (verificationMethods) {

        verificationMethods.style.display =
            "flex";

    }

    if (emailOtpSection) {

        emailOtpSection.style.display =
            "none";

    }

    if (authenticatorSection) {

        authenticatorSection.style.display =
            "none";

    }

    if (verificationDescription) {

        verificationDescription.innerHTML =
            `
            Choose a verification method
            <br>
            to access the admin dashboard.
            `;

    }

}


// =====================================================
// SHOW EMAIL OTP
// =====================================================

async function showEmailOtp() {

    if (verificationMethods) {

        verificationMethods.style.display =
            "none";

    }

    if (authenticatorSection) {

        authenticatorSection.style.display =
            "none";

    }

    if (emailOtpSection) {

        emailOtpSection.style.display =
            "block";

    }

    if (verificationDescription) {

        verificationDescription.innerHTML =
            `
            Enter the OTP sent to your
            <br>
            admin email.
            `;

    }


    clearOtpBoxes();


    if (otpInputs.length > 0) {

        otpInputs[0].focus();

    }


    await sendAdminEmailOtp();

}


// =====================================================
// SEND ADMIN EMAIL OTP
// =====================================================

async function sendAdminEmailOtp() {

    if (!adminOtpEmail) {

        window.showEventSphereMessage(
            "warning",
            "Session Expired",
            "Your admin login session has expired. Please login again."
        );

        window.location.replace(
            "admin-login.html"
        );

        return false;

    }


    try {

        if (resendButton) {

            resendButton.disabled =
                true;

            resendButton.textContent =
                "Sending...";

        }


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
                                adminOtpEmail,

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

            window.showEventSphereMessage(
                "error",
                "OTP Failed",
                data.message ||
                "Unable to send the admin OTP."
            );

            if (resendButton) {

                resendButton.disabled =
                    false;

                resendButton.textContent =
                    "Resend OTP";

            }

            return false;

        }


        window.showEventSphereMessage(
            "success",
            "OTP Sent",
            "A verification OTP has been sent to your admin email."
        );


        if (resendButton) {

            resendButton.disabled =
                false;

            resendButton.textContent =
                "Resend OTP";

        }


        return true;

    }


    catch (error) {

        console.error(
            "Send Admin OTP Error:",
            error
        );


        window.showEventSphereMessage(
            "error",
            "OTP Failed",
            "Unable to send the admin OTP. Please try again."
        );


        if (resendButton) {

            resendButton.disabled =
                false;

            resendButton.textContent =
                "Resend OTP";

        }


        return false;

    }

}


// =====================================================
// VERIFY ADMIN ACCOUNT
// =====================================================

async function verifyAdminAccount() {

    const adminUid =
        sessionStorage.getItem(
            "adminUid"
        );


    if (!adminUid) {

        window.showEventSphereMessage(
            "warning",
            "Session Expired",
            "Your admin login session has expired. Please login again."
        );

        return false;

    }


    try {

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


        if (
            !userSnapshot.exists()
        ) {

            await signOut(
                auth
            );


            sessionStorage.removeItem(
                "adminUid"
            );


            window.showEventSphereMessage(
                "error",
                "Admin Account Not Found",
                "The administrator account could not be found."
            );


            window.location.replace(
                "admin-login.html"
            );


            return false;

        }


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


            window.showEventSphereMessage(
                "error",
                "Access Denied",
                "This account does not have administrator access."
            );


            window.location.replace(
                "admin-login.html"
            );


            return false;

        }


        return true;

    }


    catch (error) {

        console.error(
            "Admin Account Verification Error:",
            error
        );


        window.showEventSphereMessage(
            "error",
            "Verification Failed",
            "Unable to verify the administrator account."
        );


        return false;

    }

}


// =====================================================
// COMPLETE ADMIN LOGIN
// =====================================================

async function completeAdminLogin() {

    const validAdmin =
        await verifyAdminAccount();


    if (!validAdmin) {

        return;

    }


    sessionStorage.setItem(
        "adminOtpVerified",
        "true"
    );


    sessionStorage.setItem(
        "adminOtpEmail",
        adminOtpEmail
    );


    localStorage.removeItem(
        "adminOtpEmail"
    );


    window.showEventSphereMessage(
        "success",
        "Login Successful",
        "Admin login successful. Welcome to the EventSphere Admin Panel."
    );


    setTimeout(
        () => {

            window.location.replace(
                "admin-dashboard.html"
            );

        },
        1200
    );

}


// =====================================================
// EMAIL OTP FORM
// =====================================================

if (adminOtpForm) {

    adminOtpForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const otp =
                getOtp();


            if (!adminOtpEmail) {

                window.showEventSphereMessage(
                    "warning",
                    "Session Expired",
                    "Your admin login session has expired. Please login again."
                );

                window.location.replace(
                    "admin-login.html"
                );

                return;

            }


            if (
                otp.length !== 6
            ) {

                window.showEventSphereMessage(
                    "warning",
                    "OTP Required",
                    "Please enter the complete 6-digit OTP."
                );

                return;

            }


            const verifyButton =
                adminOtpForm.querySelector(
                    "button[type='submit']"
                );


            try {

                if (verifyButton) {

                    verifyButton.disabled =
                        true;

                    verifyButton.textContent =
                        "Verifying...";

                }


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
                                        adminOtpEmail,

                                    otp:
                                        otp,

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

                    window.showEventSphereMessage(
                        "error",
                        "Invalid OTP",
                        data.message ||
                        "The OTP is incorrect or has expired."
                    );


                    if (verifyButton) {

                        verifyButton.disabled =
                            false;

                        verifyButton.textContent =
                            "Verify Email OTP";

                    }

                    return;

                }


                await completeAdminLogin();

            }


            catch (error) {

                console.error(
                    "Admin Email OTP Error:",
                    error
                );


                window.showEventSphereMessage(
                    "error",
                    "OTP Verification Failed",
                    error.message ||
                    "Unable to verify OTP. Please try again."
                );


                if (verifyButton) {

                    verifyButton.disabled =
                        false;

                    verifyButton.textContent =
                        "Verify Email OTP";

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

            clearOtpBoxes();

            if (otpInputs.length > 0) {

                otpInputs[0].focus();

            }

            await sendAdminEmailOtp();

        }
    );

}


// =====================================================
// GET FIREBASE ID TOKEN
// =====================================================

async function getAdminIdToken() {

    if (!auth.currentUser) {

        throw new Error(
            "Admin Firebase session was not found."
        );

    }


    return await auth.currentUser.getIdToken(
        true
    );

}


// =====================================================
// CHECK AUTHENTICATOR STATUS
// =====================================================

async function getAuthenticatorStatus() {

    const idToken =
        await getAdminIdToken();


    const response =
        await fetch(
            `${API_BASE_URL}/admin/authenticator/status`,
            {

                method:
                    "GET",

                headers: {

                    "Authorization":
                        `Bearer ${idToken}`

                }

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
            "Unable to check authenticator status."
        );

    }


    return data;

}


// =====================================================
// SHOW AUTHENTICATOR
// =====================================================

async function showAuthenticator() {

    if (verificationMethods) {

        verificationMethods.style.display =
            "none";

    }

    if (emailOtpSection) {

        emailOtpSection.style.display =
            "none";

    }

    if (authenticatorSection) {

        authenticatorSection.style.display =
            "block";

    }

    if (verificationDescription) {

        verificationDescription.innerHTML =
            `
            Verify using your
            <br>
            Google Authenticator app.
            `;

    }


    try {

        const status =
            await getAuthenticatorStatus();


        if (
            status.enabled === true
        ) {

            // =================================================
            // AUTHENTICATOR ALREADY ENABLED
            // =================================================

            if (authenticatorSetup) {

                authenticatorSetup.style.display =
                    "none";

            }


            if (authenticatorExisting) {

                authenticatorExisting.style.display =
                    "block";

            }


            if (authenticatorCode) {

                authenticatorCode.value =
                    "";

                authenticatorCode.focus();

            }

        }

        else {

            // =================================================
            // FIRST TIME AUTHENTICATOR SETUP
            // =================================================

            await setupAuthenticator();

        }

    }


    catch (error) {

        console.error(
            "Authenticator Status Error:",
            error
        );


        window.showEventSphereMessage(
            "error",
            "Authenticator Error",
            error.message ||
            "Unable to connect to the authenticator service."
        );


        showVerificationMethods();

    }

}


// =====================================================
// SETUP GOOGLE AUTHENTICATOR
// =====================================================

async function setupAuthenticator() {

    try {

        const idToken =
            await getAdminIdToken();


        const response =
            await fetch(
                `${API_BASE_URL}/admin/authenticator/setup`,
                {

                    method:
                        "POST",

                    headers: {

                        "Authorization":
                            `Bearer ${idToken}`

                    }

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
                "Unable to start authenticator setup."
            );

        }


        // =================================================
        // ALREADY ENABLED
        // =================================================

        if (
            data.enabled === true
        ) {

            if (authenticatorSetup) {

                authenticatorSetup.style.display =
                    "none";

            }


            if (authenticatorExisting) {

                authenticatorExisting.style.display =
                    "block";

            }


            return;

        }


        // =================================================
        // DISPLAY QR CODE
        // =================================================

        if (
            qrContainer &&
            data.qrCode
        ) {

            qrContainer.innerHTML =
                "";


            const qrImage =
                document.createElement(
                    "img"
                );


            qrImage.src =
                data.qrCode;


            qrImage.alt =
                "Google Authenticator QR Code";


            qrImage.style.width =
                "280px";


            qrImage.style.height =
                "280px";


            qrImage.style.maxWidth =
                "100%";


            qrImage.style.borderRadius =
                "10px";


            qrImage.style.background =
                "#ffffff";


            qrImage.style.padding =
                "8px";


            qrContainer.appendChild(
                qrImage
            );

        }


        // =================================================
        // DISPLAY MANUAL SECRET
        // =================================================

        if (
            manualSecret &&
            data.secret
        ) {

            manualSecret.textContent =
                data.secret;

        }


        if (authenticatorSetup) {

            authenticatorSetup.style.display =
                "block";

        }


        if (authenticatorExisting) {

            authenticatorExisting.style.display =
                "none";

        }


        if (authenticatorCode) {

            authenticatorCode.value =
                "";

            authenticatorCode.focus();

        }


        window.showEventSphereMessage(
            "success",
            "Authenticator Setup",
            "Scan the QR code with Google Authenticator and enter the 6-digit code shown in the app."
        );

    }


    catch (error) {

        console.error(
            "Authenticator Setup Error:",
            error
        );


        window.showEventSphereMessage(
            "error",
            "Setup Failed",
            error.message ||
            "Unable to create authenticator setup."
        );

    }

}


// =====================================================
// AUTHENTICATOR CODE INPUT
// =====================================================

if (authenticatorCode) {

    authenticatorCode.addEventListener(
        "input",
        () => {

            authenticatorCode.value =
                authenticatorCode.value.replace(
                    /\D/g,
                    ""
                ).slice(
                    0,
                    6
                );

        }
    );

}


// =====================================================
// AUTHENTICATOR FORM
// =====================================================

if (authenticatorForm) {

    authenticatorForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const code =
                authenticatorCode?.value
                    .trim() ||
                "";


            if (
                !/^\d{6}$/.test(code)
            ) {

                window.showEventSphereMessage(
                    "warning",
                    "Code Required",
                    "Please enter the complete 6-digit authenticator code."
                );

                return;

            }


            const verifyButton =
                authenticatorForm.querySelector(
                    "button[type='submit']"
                );


            try {

                if (verifyButton) {

                    verifyButton.disabled =
                        true;

                    verifyButton.textContent =
                        "Verifying...";

                }


                const idToken =
                    await getAdminIdToken();


                // =================================================
                // CHECK CURRENT AUTHENTICATOR STATUS
                // =================================================

                const status =
                    await getAuthenticatorStatus();


                let endpoint;


                if (
                    status.enabled === true
                ) {

                    endpoint =
                        `${API_BASE_URL}/admin/authenticator/verify`;

                }

                else {

                    endpoint =
                        `${API_BASE_URL}/admin/authenticator/verify-setup`;

                }


                // =================================================
                // VERIFY TOTP
                // =================================================

                const response =
                    await fetch(
                        endpoint,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${idToken}`

                            },

                            body:
                                JSON.stringify({

                                    code:
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

                    window.showEventSphereMessage(
                        "error",
                        "Invalid Authenticator Code",
                        data.message ||
                        "The authenticator code is incorrect."
                    );


                    if (verifyButton) {

                        verifyButton.disabled =
                            false;

                        verifyButton.textContent =
                            "Verify Authenticator";

                    }

                    return;

                }


                // =================================================
                // AUTHENTICATOR SUCCESS
                // =================================================

                await completeAdminLogin();

            }


            catch (error) {

                console.error(
                    "Authenticator Verification Error:",
                    error
                );


                window.showEventSphereMessage(
                    "error",
                    "Authenticator Verification Failed",
                    error.message ||
                    "Unable to verify the authenticator code."
                );


                if (verifyButton) {

                    verifyButton.disabled =
                        false;

                    verifyButton.textContent =
                        "Verify Authenticator";

                }

            }

        }
    );

}


// =====================================================
// EMAIL OTP METHOD BUTTON
// =====================================================

if (emailOtpMethod) {

    emailOtpMethod.addEventListener(
        "click",
        async () => {

            await showEmailOtp();

        }
    );

}


// =====================================================
// AUTHENTICATOR METHOD BUTTON
// =====================================================

if (authenticatorMethod) {

    authenticatorMethod.addEventListener(
        "click",
        async () => {

            await showAuthenticator();

        }
    );

}


// =====================================================
// BACK TO METHODS - EMAIL
// =====================================================

if (backToMethodsEmail) {

    backToMethodsEmail.addEventListener(
        "click",
        () => {

            showVerificationMethods();

        }
    );

}


// =====================================================
// BACK TO METHODS - AUTHENTICATOR
// =====================================================

if (backToMethodsAuthenticator) {

    backToMethodsAuthenticator.addEventListener(
        "click",
        () => {

            showVerificationMethods();

        }
    );

}


// =====================================================
// INITIAL PAGE
// =====================================================

showVerificationMethods();