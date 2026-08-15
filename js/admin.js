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


// ====================== ADMIN INACTIVITY LOGOUT ======================

const INACTIVITY_TIME = 15 * 60 * 1000;

let inactivityTimer = null;


// Start inactivity timer

function startInactivityTimer() {

    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }

    inactivityTimer = setTimeout(async () => {

        try {

            await signOut(auth);

            sessionStorage.removeItem(
                "adminOtpVerified"
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

    }, INACTIVITY_TIME);

}


// Reset inactivity timer

function resetInactivityTimer() {

    if (auth.currentUser) {

        startInactivityTimer();

    }

}


// Detect admin activity

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


// ====================== AUTH STATE ======================

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


// ====================== ADMIN LOGIN ======================

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

                // Clear any old OTP verification

                sessionStorage.removeItem(
                    "adminOtpVerified"
                );

                localStorage.removeItem(
                    "adminOtpEmail"
                );


                // ================= LOGIN =================

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                // ================= CHECK ADMIN ROLE =================

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


                    await signOut(auth);

                    return;

                }


                // ================= SEND OTP =================

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


                    await signOut(auth);

                    return;

                }


                // Store email for OTP verification

                localStorage.setItem(
                    "adminOtpEmail",
                    email
                );


                alert(
                    "OTP sent to your Admin Email."
                );


                /*
                 * IMPORTANT:
                 * Do not set adminOtpVerified here.
                 *
                 * It will only be set after the
                 * correct OTP is entered.
                 */

                window.location.replace(
                    "admin-otp.html"
                );

            }

            catch (error) {

                console.error(
                    "Admin Login Error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

}


// ====================== DASHBOARD STATISTICS ======================

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


    // Run only on Admin Dashboard

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

        // ================= CUSTOMERS =================

        const usersSnapshot =
            await getDocs(
                collection(
                    db,
                    "users"
                )
            );


        let totalCustomers = 0;


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


        // ================= EVENTS =================

        const eventsSnapshot =
            await getDocs(
                collection(
                    db,
                    "events"
                )
            );


        totalEventsElement.textContent =
            eventsSnapshot.size;


        // ================= BOOKINGS =================

        const bookingsSnapshot =
            await getDocs(
                collection(
                    db,
                    "bookings"
                )
            );


        const now =
            new Date();


        let activeBookings = 0;

        let completedBookings = 0;


        bookingsSnapshot.forEach(
            (bookingDoc) => {

                const booking =
                    bookingDoc.data();


                if (!booking.eventDate) {

                    return;

                }


                const eventEndTime =
                    booking.eventEndTime ||
                    "20:00";


                const eventEnd =
                    new Date(
                        `${booking.eventDate}T${eventEndTime}:00`
                    );


                // ================= COMPLETED =================

                if (
                    now >= eventEnd
                ) {

                    completedBookings++;

                }


                // ================= ACTIVE =================

                else {

                    activeBookings++;

                }

            }
        );


        // ================= DISPLAY COUNTS =================

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


// ====================== LOAD DASHBOARD ======================

loadDashboardStats();


// Refresh every 30 seconds

setInterval(
    () => {

        loadDashboardStats();

    },
    30000
);


// ====================== LOGOUT ======================

window.logout =
    async function () {

        try {

            await signOut(auth);


            // Clear admin OTP session

            sessionStorage.removeItem(
                "adminOtpVerified"
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