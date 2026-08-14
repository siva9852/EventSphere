import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ====================== ADMIN INACTIVITY LOGOUT ======================

const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutes

let inactivityTimer = null;


// Start inactivity timer

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

            window.location.href =
                "admin-login.html";

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


// Check authentication state

auth.onAuthStateChanged((user) => {

    if (user) {

        startInactivityTimer();

    } else {

        if (inactivityTimer) {

            clearTimeout(inactivityTimer);

            inactivityTimer = null;

        }

    }

});


// ====================== ADMIN LOGIN ======================

const adminLoginForm =
    document.getElementById("adminLoginForm");


if (adminLoginForm) {

    adminLoginForm.addEventListener("submit", async (e) => {

        e.preventDefault();


        const email =
            document.getElementById("adminEmail").value;

        const password =
            document.getElementById("adminPassword").value;


        try {

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                userCredential.user;


            // Check Admin Role

            const docRef =
                doc(db, "users", user.uid);

            const docSnap =
                await getDoc(docRef);


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


            // Send OTP

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/send-otp",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email: email
                        })
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                alert(data.message);

                await signOut(auth);

                return;

            }


            localStorage.setItem(
                "adminOtpEmail",
                email
            );


            alert(
                "OTP sent to your Admin Email."
            );


            window.location.href =
                "admin-otp.html";

        }

        catch (error) {

            alert(error.message);

        }

    });

}


// ====================== DASHBOARD STATISTICS ======================

async function loadDashboardStats() {

    const totalCustomersElement =
        document.getElementById("totalCustomers");

    const totalBookingsElement =
        document.getElementById("totalBookings");

    const activeBookingsElement =
        document.getElementById("activeBookings");

    const completedBookingsElement =
        document.getElementById("completedBookings");

    const totalEventsElement =
        document.getElementById("totalEvents");


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
                collection(db, "users")
            );


        let totalCustomers = 0;


        usersSnapshot.forEach((userDoc) => {

            const user =
                userDoc.data();


            if (user.role === "user") {

                totalCustomers++;

            }

        });


        totalCustomersElement.textContent =
            totalCustomers;


        // ================= EVENTS =================

        const eventsSnapshot =
            await getDocs(
                collection(db, "events")
            );


        totalEventsElement.textContent =
            eventsSnapshot.size;


        // ================= BOOKINGS =================

        const bookingsSnapshot =
            await getDocs(
                collection(db, "bookings")
            );


        const now =
            new Date();


        let activeBookings = 0;

        let newlyCompleted = 0;


        for (
            const bookingDoc of bookingsSnapshot.docs
        ) {

            const booking =
                bookingDoc.data();


            if (!booking.eventDate) {

                continue;

            }


            // Customer-selected end time

            const eventEndTime =
                booking.eventEndTime || "20:00";


            const eventEnd =
                new Date(
                    `${booking.eventDate}T${eventEndTime}:00`
                );


            // ================= ACTIVE =================

            if (now < eventEnd) {

                activeBookings++;

            }


            // ================= COMPLETED =================

            else {

                newlyCompleted++;

                console.log(
                    "Completed booking:",
                    booking.eventName,
                    booking.eventDate,
                    eventEndTime
                );

            }

        }


        activeBookingsElement.textContent =
            activeBookings;


        // ================= STATISTICS =================

        const statsRef =
            doc(db, "statistics", "main");


        const statsSnap =
            await getDoc(statsRef);


        let completedBookings = 0;


        if (statsSnap.exists()) {

            const stats =
                statsSnap.data();


            completedBookings =
                stats.completedEvents || 0;

        }


        // Add newly completed bookings

        if (newlyCompleted > 0) {

            completedBookings +=
                newlyCompleted;


            await setDoc(
                statsRef,
                {
                    completedEvents:
                        completedBookings
                },
                {
                    merge: true
                }
            );

        }


        completedBookingsElement.textContent =
            completedBookings;


        // ================= TOTAL BOOKINGS =================

        let totalBookings = 0;


        if (statsSnap.exists()) {

            const stats =
                statsSnap.data();


            totalBookings =
                stats.totalBookings || 0;

        }


        totalBookingsElement.textContent =
            totalBookings;

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

setInterval(() => {

    loadDashboardStats();

}, 30000);


// ====================== LOGOUT ======================

window.logout = async function () {

    try {

        await signOut(auth);


        if (inactivityTimer) {

            clearTimeout(inactivityTimer);

            inactivityTimer = null;

        }


        alert(
            "Logged out successfully!"
        );


        window.location.href =
            "admin-login.html";

    }

    catch (error) {

        alert(error.message);

    }

};