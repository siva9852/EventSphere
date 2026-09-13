import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =====================================================
// ADMIN INACTIVITY LOGOUT
// =====================================================

const INACTIVITY_TIME =
    15 * 60 * 1000;

let inactivityTimer = null;


// =====================================================
// START INACTIVITY TIMER
// =====================================================

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

                    await signOut(
                        auth
                    );

                    sessionStorage.removeItem(
                        "adminOtpVerified"
                    );

                    sessionStorage.removeItem(
                        "adminUid"
                    );

                    localStorage.removeItem(
                        "adminOtpEmail"
                    );

                    alert(
                        "You have been logged out due to inactivity."
                    );

                    window.location.replace(
                        "admin-login.html"
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


// =====================================================
// RESET INACTIVITY TIMER
// =====================================================

function resetInactivityTimer() {

    if (auth.currentUser) {

        startInactivityTimer();

    }

}


// =====================================================
// DETECT ADMIN ACTIVITY
// =====================================================

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


// =====================================================
// AUTH STATE
// =====================================================

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

                inactivityTimer =
                    null;

            }

        }

    }
);


// =====================================================
// ADMIN LOGIN
// =====================================================

const adminLoginForm =
    document.getElementById(
        "adminLoginForm"
    );


if (adminLoginForm) {

    adminLoginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const email =
                document.getElementById(
                    "adminEmail"
                ).value.trim();


            const password =
                document.getElementById(
                    "adminPassword"
                ).value;


            try {

                // =================================================
                // CLEAR OLD OTP DATA
                // =================================================

                sessionStorage.removeItem(
                    "adminOtpVerified"
                );

                sessionStorage.removeItem(
                    "adminUid"
                );

                localStorage.removeItem(
                    "adminOtpEmail"
                );


                // =================================================
                // ADMIN FIREBASE LOGIN
                // =================================================

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // =================================================
                // SAVE ADMIN UID
                // =================================================

                sessionStorage.setItem(
                    "adminUid",
                    user.uid
                );


                // =================================================
                // CHECK ADMIN ROLE
                // =================================================

                const docRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );


                const docSnap =
                    await getDoc(
                        docRef
                    );


                if (
                    !docSnap.exists() ||
                    docSnap.data().role !== "admin"
                ) {

                    alert(
                        "Access Denied! You are not an Admin."
                    );

                    sessionStorage.removeItem(
                        "adminUid"
                    );

                    await signOut(
                        auth
                    );

                    return;

                }


                // =================================================
                // SEND ADMIN OTP
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
                                        "admin"

                                })

                        }
                    );


                const data =
                    await response.json();


                // =================================================
                // OTP SEND FAILED
                // =================================================

                if (!data.success) {

                    alert(
                        data.message ||
                        "Unable to send OTP."
                    );

                    sessionStorage.removeItem(
                        "adminUid"
                    );

                    await signOut(
                        auth
                    );

                    return;

                }


                // =================================================
                // STORE ADMIN EMAIL
                // =================================================

                localStorage.setItem(
                    "adminOtpEmail",
                    email
                );


                sessionStorage.removeItem(
                    "adminOtpVerified"
                );


                alert(
                    "Admin Login OTP has been sent to your email."
                );


                // =================================================
                // GO TO OTP PAGE
                // =================================================

                window.location.replace(
                    "admin-otp.html"
                );

            }


            catch (error) {

                console.error(
                    "Admin Login Error:",
                    error
                );

                sessionStorage.removeItem(
                    "adminUid"
                );

                alert(
                    error.message
                );

            }

        }
    );

}


// =====================================================
// DASHBOARD STATISTICS
// =====================================================

async function loadDashboardStats() {

    const totalCustomersElement =
        document.getElementById(
            "totalCustomers"
        );


    const totalBookingsElement =
        document.getElementById(
            "totalBookings"
        );


    const activeBookingsElement =
        document.getElementById(
            "activeBookings"
        );


    const completedBookingsElement =
        document.getElementById(
            "completedBookings"
        );


    const totalEventsElement =
        document.getElementById(
            "totalEvents"
        );


    // =================================================
    // RUN ONLY ON ADMIN DASHBOARD
    // =================================================

    if (
        !totalCustomersElement ||
        !totalBookingsElement ||
        !activeBookingsElement ||
        !completedBookingsElement ||
        !totalEventsElement
    ) {

        return;

    }


    try {

        // =================================================
        // CUSTOMERS
        // =================================================

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        let totalCustomers =
            0;


        usersSnapshot.forEach(
            (userDoc) => {

                const user =
                    userDoc.data();


                if (
                    user.role === "user" ||
                    user.role === "customer"
                ) {

                    totalCustomers++;

                }

            }
        );


        totalCustomersElement.textContent =
            totalCustomers;


        // =================================================
        // EVENTS
        // =================================================

        const eventsSnapshot =
            await getDocs(
                collection(
                    db,
                    "events"
                )
            );


        totalEventsElement.textContent =
            eventsSnapshot.size;


        // =================================================
        // BOOKINGS
        // =================================================

        const bookingsSnapshot =
            await getDocs(
                collection(
                    db,
                    "bookings"
                )
            );


        const now =
            new Date();


        let activeBookings =
            0;


        let completedBookings =
            0;


        bookingsSnapshot.forEach(
            (bookingDoc) => {

                const booking =
                    bookingDoc.data();


                if (
                    !booking.eventDate
                ) {

                    return;

                }


                const eventEndTime =
                    booking.eventEndTime ||
                    "20:00";


                const eventEnd =
                    new Date(
                        `${booking.eventDate}T${eventEndTime}:00`
                    );


                // =================================================
                // COMPLETED
                // =================================================

                if (
                    now >= eventEnd
                ) {

                    completedBookings++;

                }

                // =================================================
                // ACTIVE
                // =================================================

                else {

                    activeBookings++;

                }

            }
        );


        // =================================================
        // DISPLAY COUNTS
        // =================================================

        totalBookingsElement.textContent =
            bookingsSnapshot.size;


        activeBookingsElement.textContent =
            activeBookings;


        completedBookingsElement.textContent =
            completedBookings;

    }


    catch (error) {

        console.error(
            "Dashboard Statistics Error:",
            error
        );


        totalCustomersElement.textContent =
            "Error";


        totalBookingsElement.textContent =
            "Error";


        activeBookingsElement.textContent =
            "Error";


        completedBookingsElement.textContent =
            "Error";


        totalEventsElement.textContent =
            "Error";

    }

}


// =====================================================
// LOAD DASHBOARD
// =====================================================

loadDashboardStats();


// =====================================================
// REFRESH EVERY 30 SECONDS
// =====================================================

setInterval(
    () => {

        loadDashboardStats();

    },
    30000
);


// =====================================================
// ADMIN LOGOUT
// =====================================================

window.logout =
    async function () {

        try {

            await signOut(
                auth
            );


            sessionStorage.removeItem(
                "adminOtpVerified"
            );


            sessionStorage.removeItem(
                "adminUid"
            );


            localStorage.removeItem(
                "adminOtpEmail"
            );


            alert(
                "Logged out successfully!"
            );


            window.location.replace(
                "admin-login.html"
            );

        }

        catch (error) {

            alert(
                error.message
            );

        }

    };


// =====================================================
// COUPON CREATION
// =====================================================

const couponForm =
    document.getElementById(
        "couponForm"
    );


if (couponForm) {

    couponForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            // =================================================
            // GET FORM VALUES
            // =================================================

            const code =
                document
                    .getElementById(
                        "couponCode"
                    )
                    .value
                    .trim()
                    .toUpperCase();


            const discountType =
                document
                    .getElementById(
                        "discountType"
                    )
                    .value;


            const discountValue =
                Number(
                    document
                        .getElementById(
                            "discountValue"
                        )
                        .value
                );


            const minimumAmount =
                Number(
                    document
                        .getElementById(
                            "minimumAmount"
                        )
                        .value ||
                    0
                );


            const maximumDiscount =
                Number(
                    document
                        .getElementById(
                            "maximumDiscount"
                        )
                        .value ||
                    0
                );


            const expiryDate =
                document
                    .getElementById(
                        "couponExpiry"
                    )
                    .value;


            const usageLimit =
                Number(
                    document
                        .getElementById(
                            "usageLimit"
                        )
                        .value
                );


            try {

                // =================================================
                // CURRENT ADMIN
                // =================================================

                const user =
                    auth.currentUser;


                if (!user) {

                    alert(
                        "Admin login session expired. Please login again."
                    );

                    return;

                }


                // =================================================
                // FIREBASE ID TOKEN
                // =================================================

                const idToken =
                    await user.getIdToken();


                // =================================================
                // CREATE COUPON
                // =================================================

                const response =
                    await fetch(
                        "https://eventsphere-dndh.onrender.com/admin/coupons",
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
                                        code,

                                    discountType:
                                        discountType,

                                    discountValue:
                                        discountValue,

                                    minimumAmount:
                                        minimumAmount,

                                    maximumDiscount:
                                        maximumDiscount,

                                    expiryDate:
                                        expiryDate,

                                    usageLimit:
                                        usageLimit

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
                        "Unable to create coupon."
                    );

                    return;

                }


                alert(
                    "Coupon created successfully! 🎉"
                );


                couponForm.reset();

            }


            catch (error) {

                console.error(
                    "COUPON ERROR:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to connect to the server."
                );

            }

        }
    );

}

// =====================================================
// SERVICE MAINTENANCE MANAGEMENT
// =====================================================

const maintenanceForm =
    document.getElementById(
        "maintenanceForm"
    );

const maintenanceStatus =
    document.getElementById(
        "maintenanceStatus"
    );

const disableMaintenanceBtn =
    document.getElementById(
        "disableMaintenanceBtn"
    );


// =====================================================
// LOAD MAINTENANCE SETTINGS
// =====================================================

async function loadMaintenanceSettings() {

    if (!maintenanceStatus) {
        return;
    }

    try {

        const maintenanceRef =
            doc(
                db,
                "settings",
                "maintenance"
            );


        const maintenanceSnap =
            await getDoc(
                maintenanceRef
            );


        if (!maintenanceSnap.exists()) {

            maintenanceStatus.innerHTML = `
                <strong>🟢 Service Online</strong>
                <br>
                No maintenance has been scheduled.
            `;

            return;
        }


        const data =
            maintenanceSnap.data();


        const enabled =
            data.enabled === true;


        const message =
            data.message ||
            "EventSphere is currently under maintenance.";


        const startTime =
            data.startTime || "";


        const endTime =
            data.endTime || "";


        document.getElementById(
            "maintenanceEnabled"
        ).value =
            enabled
                ? "true"
                : "false";


        document.getElementById(
            "maintenanceMessage"
        ).value =
            message;


        document.getElementById(
            "maintenanceStart"
        ).value =
            startTime;


        document.getElementById(
            "maintenanceEnd"
        ).value =
            endTime;


        if (enabled) {

            maintenanceStatus.innerHTML = `
                <strong style="color:#dc2626;">
                    🔴 Maintenance Enabled
                </strong>

                <br><br>

                <strong>Message:</strong>
                ${escapeMaintenanceHtml(message)}

                <br><br>

                <strong>Start:</strong>
                ${startTime || "Not specified"}

                <br>

                <strong>End:</strong>
                ${endTime || "Not specified"}
            `;

        } else {

            maintenanceStatus.innerHTML = `
                <strong style="color:#16a34a;">
                    🟢 Service Online
                </strong>

                <br><br>

                Maintenance mode is currently disabled.
            `;

        }

    }

    catch (error) {

        console.error(
            "Maintenance Load Error:",
            error
        );


        maintenanceStatus.innerHTML = `
            <strong style="color:#dc2626;">
                Unable to load maintenance status.
            </strong>
        `;

    }

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeMaintenanceHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =====================================================
// SAVE MAINTENANCE SETTINGS
// =====================================================

if (maintenanceForm) {

    maintenanceForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Admin login session expired. Please login again."
                );

                return;
            }


            const enabled =
                document.getElementById(
                    "maintenanceEnabled"
                ).value === "true";


            const message =
                document.getElementById(
                    "maintenanceMessage"
                ).value.trim();


            const startTime =
                document.getElementById(
                    "maintenanceStart"
                ).value;


            const endTime =
                document.getElementById(
                    "maintenanceEnd"
                ).value;


            if (enabled && !message) {

                alert(
                    "Please enter a maintenance message."
                );

                return;
            }


            if (
                enabled &&
                startTime &&
                endTime &&
                new Date(endTime) <=
                new Date(startTime)
            ) {

                alert(
                    "Maintenance end time must be after the start time."
                );

                return;
            }


            try {

                const maintenanceRef =
                    doc(
                        db,
                        "settings",
                        "maintenance"
                    );


                const { setDoc } =
                    await import(
                        "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
                    );


                await setDoc(
                    maintenanceRef,
                    {

                        enabled:
                            enabled,

                        message:
                            message ||
                            "EventSphere is currently under maintenance.",

                        startTime:
                            startTime,

                        endTime:
                            endTime,

                        updatedAt:
                            new Date().toISOString(),

                        updatedBy:
                            user.uid

                    },
                    {
                        merge: true
                    }
                );


                alert(
                    enabled
                        ? "Maintenance mode enabled successfully! 🛠️"
                        : "Service is now online! 🟢"
                );


                await loadMaintenanceSettings();

            }

            catch (error) {

                console.error(
                    "Maintenance Save Error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to save maintenance settings."
                );

            }

        }
    );

}


// =====================================================
// DISABLE MAINTENANCE
// =====================================================

if (disableMaintenanceBtn) {

    disableMaintenanceBtn.addEventListener(
        "click",
        async () => {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Admin login session expired. Please login again."
                );

                return;
            }


            const confirmDisable =
                confirm(
                    "Are you sure you want to make EventSphere available to customers?"
                );


            if (!confirmDisable) {
                return;
            }


            try {

                const maintenanceRef =
                    doc(
                        db,
                        "settings",
                        "maintenance"
                    );


                const { setDoc } =
                    await import(
                        "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
                    );


                await setDoc(
                    maintenanceRef,
                    {

                        enabled:
                            false,

                        updatedAt:
                            new Date().toISOString(),

                        updatedBy:
                            user.uid

                    },
                    {
                        merge: true
                    }
                );


                document.getElementById(
                    "maintenanceEnabled"
                ).value =
                    "false";


                alert(
                    "Maintenance disabled. EventSphere is now online! 🟢"
                );


                await loadMaintenanceSettings();

            }

            catch (error) {

                console.error(
                    "Maintenance Disable Error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to disable maintenance."
                );

            }

        }
    );

}


// =====================================================
// LOAD CURRENT SETTINGS
// =====================================================

loadMaintenanceSettings();