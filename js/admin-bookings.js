import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const bookingsContainer = document.getElementById("bookingsContainer");


async function loadBookings() {

    try {

        const snapshot = await getDocs(collection(db, "bookings"));

        bookingsContainer.innerHTML = "";

        if (snapshot.empty) {

            bookingsContainer.innerHTML = "<p>No bookings found.</p>";

            return;

        }


        snapshot.forEach((bookingDoc) => {

            const booking = bookingDoc.data();

            const card = document.createElement("div");

            card.className = "card";

            card.innerHTML = `

                <h2>${booking.eventName}</h2>

                <p><strong>Customer:</strong> ${booking.customerEmail}</p>

                <p><strong>Event Date:</strong> ${booking.eventDate}</p>

                <p><strong>Guests:</strong> ${booking.guests}</p>

                <p><strong>Location:</strong> ${booking.location}</p>

                <p><strong>Requirements:</strong> ${booking.requirements || "None"}</p>

                <p>
                    <strong>Status:</strong>
                    <span id="status-${bookingDoc.id}">
                        ${booking.status}
                    </span>
                </p>

                <button onclick="approveBooking('${bookingDoc.id}')">
                    Approve
                </button>

                <button onclick="rejectBooking('${bookingDoc.id}')">
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


window.approveBooking = async function (bookingId) {

    try {

        await updateDoc(
            doc(db, "bookings", bookingId),
            {
                status: "Approved"
            }
        );

        document.getElementById(
            `status-${bookingId}`
        ).textContent = "Approved";

        alert("Booking Approved!");

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


window.rejectBooking = async function (bookingId) {

    try {

        await updateDoc(
            doc(db, "bookings", bookingId),
            {
                status: "Rejected"
            }
        );

        document.getElementById(
            `status-${bookingId}`
        ).textContent = "Rejected";

        alert("Booking Rejected!");

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


loadBookings();