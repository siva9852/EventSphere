import { db, auth } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const myBookingsContainer =
    document.getElementById("myBookingsContainer");


async function loadMyBookings() {

    const user = auth.currentUser;

    if (!user) {

        alert("Please login first.");

        window.location.href = "customer-login.html";

        return;

    }

    try {

        const q = query(
            collection(db, "bookings"),
            where("customerId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        myBookingsContainer.innerHTML = "";

        if (snapshot.empty) {

            myBookingsContainer.innerHTML =
                "<p>You have no bookings.</p>";

            return;

        }


        snapshot.forEach((bookingDoc) => {

            const booking = bookingDoc.data();

            const card = document.createElement("div");

            card.className = "card";

            card.innerHTML = `

                <h2>${booking.eventName}</h2>

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
                    ${booking.status}
                </p>

                <hr>

            `;

            myBookingsContainer.appendChild(card);

        });

    }

    catch (error) {

        console.error(error);

        myBookingsContainer.innerHTML =
            "<p>Error loading bookings.</p>";

    }

}


auth.onAuthStateChanged((user) => {

    if (user) {

        loadMyBookings();

    }

});