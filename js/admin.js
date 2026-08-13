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


            // Save Admin Email

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

    const completedEventsElement =
        document.getElementById("completedEvents");

    const totalEventsElement =
        document.getElementById("totalEvents");


    // Only run this section on Admin Dashboard

    if (
        !totalCustomersElement ||
        !totalBookingsElement ||
        !activeBookingsElement ||
        !completedEventsElement ||
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


            if (user.role === "customer") {

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


        const totalEvents =
            eventsSnapshot.size;


        totalEventsElement.textContent =
            totalEvents;


        // ================= ACTIVE BOOKINGS =================

        const bookingsSnapshot =
            await getDocs(
                collection(db, "bookings")
            );


        let activeBookings = 0;


        const now =
            new Date();


        bookingsSnapshot.forEach((bookingDoc) => {

            const booking =
                bookingDoc.data();


            if (!booking.eventDate) {

                return;

            }


            const eventEndTime =
                booking.eventEndTime || "20:00";


            const eventEnd =
                new Date(
                    `${booking.eventDate}T${eventEndTime}:00`
                );


            if (now < eventEnd) {

                activeBookings++;

            }

        });


        activeBookingsElement.textContent =
            activeBookings;


        // ================= TOTAL BOOKINGS =================

        const statsRef =
            doc(db, "statistics", "main");


        const statsSnap =
            await getDoc(statsRef);


        if (statsSnap.exists()) {

            const stats =
                statsSnap.data();


            totalBookingsElement.textContent =
                stats.totalBookings || 0;


            completedEventsElement.textContent =
                stats.completedEvents || 0;

        }

        else {

            totalBookingsElement.textContent =
                0;

            completedEventsElement.textContent =
                0;

        }

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

        completedEventsElement.textContent =
            "Error";

        totalEventsElement.textContent =
            "Error";

    }

}


// Load dashboard statistics

loadDashboardStats();


// ====================== LOGOUT ======================

window.logout = async function () {

    try {

        await signOut(auth);

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