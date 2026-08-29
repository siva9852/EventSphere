import {
    adminAuth,
    db
} from "./firebase-config.js";


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

                    // ONLY ADMIN AUTH
                    await signOut(
                        adminAuth
                    );


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
                        "Automatic Admin Logout Error:",
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

    if (
        adminAuth.currentUser
    ) {

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
// ADMIN AUTH STATE
// =====================================================

adminAuth.onAuthStateChanged(
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
                // CLEAR OLD OTP
                // =================================================

                sessionStorage.removeItem(
                    "adminOtpVerified"
                );


                localStorage.removeItem(
                    "adminOtpEmail"
                );


                // =================================================
                // ADMIN LOGIN
                // =================================================
                // IMPORTANT:
                // Admin uses adminAuth, NOT customer auth.

                const userCredential =
                    await signInWithEmailAndPassword(
                        adminAuth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


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


                    await signOut(
                        adminAuth
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


                if (
                    !data.success
                ) {

                    alert(
                        data.message
                    );


                    await signOut(
                        adminAuth
                    );


                    return;

                }


                // =================================================
                // SAVE ADMIN OTP EMAIL
                // =================================================

                localStorage.setItem(
                    "adminOtpEmail",
                    email
                );


                alert(
                    "Admin Login OTP has been sent to your email."
                );


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


    // =====================================================
    // RUN ONLY ON ADMIN DASHBOARD
    // =====================================================

    if (
        !totalCustomersElement ||
        !totalBookingsElement ||
        !activeBookingsElement ||
        !completedBookingsElement ||
        !totalEventsElement
    ) {

        return;

    }


    // =====================================================
    // ADMIN MUST BE LOGGED IN
    // =====================================================

    const adminUser =
        adminAuth.currentUser;


    if (!adminUser) {

        return;

    }


    try {

        // =================================================
        // VERIFY ADMIN
        // =================================================

        const adminSnapshot =
            await getDoc(
                doc(
                    db,
                    "users",
                    adminUser.uid
                )
            );


        if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin"
        ) {

            return;

        }


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


                const endTime =
                    booking.eventEndTime ||
                    "20:00";


                const eventEnd =
                    new Date(
                        `${booking.eventDate}T${endTime}:00`
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

            // IMPORTANT:
            // ONLY ADMIN AUTH IS SIGNED OUT.

            await signOut(
                adminAuth
            );


            if (inactivityTimer) {

                clearTimeout(
                    inactivityTimer
                );


                inactivityTimer =
                    null;

            }


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

            console.error(
                "Admin Logout Error:",
                error
            );


            alert(
                error.message
            );

        }

    };