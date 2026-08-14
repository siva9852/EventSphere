import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventsContainer = document.getElementById("eventsContainer");

eventsContainer.className = "events-grid";


// ====================== LOAD EVENTS ======================

async function loadEvents() {

    try {

        const querySnapshot =
            await getDocs(collection(db, "events"));

        eventsContainer.innerHTML = "";


        if (querySnapshot.empty) {

            eventsContainer.innerHTML =
                `<div class="no-events">
                    <p>No events found.</p>
                </div>`;

            return;

        }


        querySnapshot.forEach((eventDoc) => {

            const event = eventDoc.data();

            const eventCard =
                document.createElement("div");

            eventCard.className = "event-card";


            eventCard.innerHTML = `

                <div class="event-image-container">

                    <img
                        src="${event.image}"
                        alt="${event.eventName}"
                        class="event-image">

                </div>


                <div class="event-card-content">

                    <h2>${event.eventName}</h2>


                    <div class="event-info">

                        <p>
                            <strong>Category:</strong>
                            ${event.category}
                        </p>

                        <p>
                            <strong>Price:</strong>
                            ₹${event.price}
                        </p>

                    </div>


                    <p class="event-description">
                        ${event.description}
                    </p>


                    <button
                        class="delete-event-button"
                        onclick="deleteEvent('${eventDoc.id}')">

                        Delete Event

                    </button>

                </div>

            `;


            eventsContainer.appendChild(eventCard);

        });

    }

    catch (error) {

        console.error(error);

        eventsContainer.innerHTML =
            "<p>Error loading events.</p>";

    }

}


// ====================== DELETE EVENT ======================

window.deleteEvent = async function(eventId) {

    if (!confirm("Are you sure you want to delete this event?")) {

        return;

    }


    try {

        await deleteDoc(
            doc(db, "events", eventId)
        );

        alert("Event Deleted Successfully!");

        loadEvents();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


// ====================== START ======================

loadEvents();