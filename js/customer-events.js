import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventsContainer =
    document.getElementById("eventsContainer");


// ====================== LOAD EVENTS ======================

async function loadEvents() {

    try {

        const querySnapshot =
            await getDocs(
                collection(db, "events")
            );


        eventsContainer.innerHTML = "";


        if (querySnapshot.empty) {

            eventsContainer.innerHTML = `

                <div class="no-events">

                    <i class="fa-solid fa-calendar-xmark"></i>

                    <h2>No Events Available</h2>

                    <p>
                        There are currently no events available.
                    </p>

                </div>

            `;

            return;

        }


        querySnapshot.forEach((eventDoc) => {

            const event =
                eventDoc.data();


            const eventCard =
                document.createElement("div");


            eventCard.className =
                "event-card";


            eventCard.innerHTML = `

                <div class="event-image-container">

                    <img
                        src="${event.image}"
                        alt="${event.eventName}"
                        class="event-image"
                    >

                </div>


                <div class="event-card-content">

                    <h2>
                        ${event.eventName}
                    </h2>


                    <div class="event-info">

                        <p>

                            <i class="fa-solid fa-tag"></i>

                            <strong>Category:</strong>

                            ${event.category}

                        </p>


                        <p>

                            <i class="fa-solid fa-indian-rupee-sign"></i>

                            <strong>Price:</strong>

                            ₹${event.price}

                        </p>

                    </div>


                    <p class="event-description">

                        ${event.description}

                    </p>


                    <button
                        class="book-event-button"
                        onclick="bookEvent('${eventDoc.id}')">

                        <i class="fa-solid fa-calendar-check"></i>

                        Book Now

                    </button>

                </div>

            `;


            eventsContainer.appendChild(
                eventCard
            );

        });

    }

    catch (error) {

        console.error(error);


        eventsContainer.innerHTML = `

            <div class="no-events">

                <i class="fa-solid fa-circle-exclamation"></i>

                <h2>Error Loading Events</h2>

                <p>
                    Please try again later.
                </p>

            </div>

        `;

    }

}


// ====================== BOOK EVENT ======================

window.bookEvent = function(eventId) {

    localStorage.setItem(
        "selectedEventId",
        eventId
    );

    window.location.href =
        "booking.html";

};


// ====================== START ======================

loadEvents();