import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const bookingsContainer =
    document.getElementById("bookingsContainer");


async function loadBookings() {

    try {

        const snapshot =
            await getDocs(collection(db, "bookings"));

        bookingsContainer.innerHTML = "";

        if (snapshot.empty) {

            bookingsContainer.innerHTML =
                "<p>No bookings found.</p>";

            return;

        }


        snapshot.forEach((bookingDoc) => {

            const booking = bookingDoc.data();

            const card = document.createElement("div");

            card.className = "card";

            card.innerHTML = `

                <h2>${booking.eventName}</h2>

                <p>
                    <strong>Customer:</strong>
                    ${booking.customerEmail}
                </p>

                <p>
                    <strong>Event Date:</strong>
                    ${booking.eventDate}
                </p>

                <p>
                    <strong>Guests:</strong>
                    ${booking.guests}
                </p>

                <p>
                    <strong>Location:</strong>
                    ${booking.location}
                </p>

                <p>
                    <strong>Requirements:</strong>
                    ${booking.requirements || "None"}
                </p>

                <p>
                    <strong>Status:</strong>
                    <span id="status-${bookingDoc.id}">
                        ${booking.status}
                    </span>
                </p>

                <button
                    onclick="approveBooking(
                        '${bookingDoc.id}',
                        '${booking.customerEmail}',
                        '${booking.eventName}'
                    )">

                    Approve

                </button>

                <button
                    onclick="rejectBooking(
                        '${bookingDoc.id}',
                        '${booking.customerEmail}',
                        '${booking.eventName}'
                    )">

                    Reject

                </button>

                <hr>

            `;

            bookingsContainer.appendChild(card);

        });

    }

    catch (error) {

        console.error(error);

        bookingsContainer.innerHTML =
            "<p>Error loading bookings.</p>";

    }

}


// ================= APPROVE =================

window.approveBooking = async function (
    bookingId,
    customerEmail,
    eventName
) {

    try {

        await updateDoc(
            doc(db, "bookings", bookingId),
            {
                status: "Approved"
            }
        );


        // Send email to customer

        const response = await fetch(
            "https://eventsphere-dndh.onrender.com/booking-status",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email: customerEmail,

                    eventName: eventName,

                    status: "Approved"

                })

            }
        );


        const data = await response.json();


        if (!data.success) {

            alert(
                "Booking approved, but email could not be sent."
            );

            return;

        }


        document.getElementById(
            `status-${bookingId}`
        ).textContent = "Approved";


        alert(
            "Booking Approved! Email sent to customer."
        );

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


// ================= REJECT =================

window.rejectBooking = async function (
    bookingId,
    customerEmail,
    eventName
) {

    try {

        await updateDoc(
            doc(db, "bookings", bookingId),
            {
                status: "Rejected"
            }
        );


        // Send email to customer

        const response = await fetch(
            "https://eventsphere-dndh.onrender.com/booking-status",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    email: customerEmail,

                    eventName: eventName,

                    status: "Rejected"

                })

            }
        );


        const data = await response.json();


        if (!data.success) {

            alert(
                "Booking rejected, but email could not be sent."
            );

            return;

        }


        document.getElementById(
            `status-${bookingId}`
        ).textContent = "Rejected";


        alert(
            "Booking Rejected! Email sent to customer."
        );

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


loadBookings();