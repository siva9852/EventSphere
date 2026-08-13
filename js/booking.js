import { db, auth } from "./firebase-config.js";

import {
    collection,
    addDoc,
    getDoc,
    doc,
    serverTimestamp,
    setDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const bookingForm =
    document.getElementById("bookingForm");


bookingForm.addEventListener("submit", async (e) => {

    e.preventDefault();


    const eventId =
        localStorage.getItem("selectedEventId");

    const eventDate =
        document.getElementById("eventDate").value;

    const guests =
        document.getElementById("guests").value;

    const location =
        document.getElementById("location").value;

    const requirements =
        document.getElementById("requirements").value;


    const user =
        auth.currentUser;


    if (!user) {

        alert("Please login first.");

        window.location.href =
            "customer-login.html";

        return;

    }


    try {

        const eventDoc =
            await getDoc(
                doc(db, "events", eventId)
            );


        if (!eventDoc.exists()) {

            alert("Event not found.");

            return;

        }


        const event =
            eventDoc.data();


        // ================= CREATE BOOKING =================

        await addDoc(
            collection(db, "bookings"),
            {

                eventId:
                    eventId,

                eventName:
                    event.eventName,

                price:
                    event.price,

                customerId:
                    user.uid,

                customerEmail:
                    user.email,

                eventDate:
                    eventDate,

                // Event ends at 8:00 PM
                eventEndTime:
                    "20:00",

                guests:
                    Number(guests),

                location:
                    location,

                requirements:
                    requirements,

                status:
                    "Pending",

                createdAt:
                    serverTimestamp()

            }
        );


        // ================= UPDATE TOTAL BOOKINGS =================

        await setDoc(
            doc(db, "statistics", "main"),
            {
                totalBookings:
                    increment(1)
            },
            {
                merge: true
            }
        );


        alert(
            "Booking Successful! Waiting for admin approval."
        );


        localStorage.removeItem(
            "selectedEventId"
        );


        window.location.href =
            "customer-dashboard.html";

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

});