import { db, auth } from "./firebase-config.js";

import {
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const bookingForm =
    document.getElementById("bookingForm");


bookingForm.addEventListener("submit", async (e) => {

    e.preventDefault();


    const eventId =
        localStorage.getItem("selectedEventId");

    const eventDate =
        document.getElementById("eventDate").value;

    const eventEndTime =
        document.getElementById("eventEndTime").value;

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

                    body: JSON.stringify({
                        email: user.email
                    })
                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(data.message);

            return;

        }


        // ================= SAVE BOOKING DATA =================

        localStorage.setItem(
            "bookingData",
            JSON.stringify({

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

                eventEndTime:
                    eventEndTime,

                guests:
                    Number(guests),

                location:
                    location,

                requirements:
                    requirements

            })
        );


        alert(
            "Verification code has been sent to your email."
        );


        window.location.href =
            "booking-otp.html";

    }

    catch (error) {

        console.error(error);

        alert("Unable to send verification code.");

    }

});