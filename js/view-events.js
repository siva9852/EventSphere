import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventsContainer = document.getElementById("eventsContainer");


async function loadEvents() {

    try {

        const querySnapshot = await getDocs(collection(db, "events"));

        eventsContainer.innerHTML = "";

        if (querySnapshot.empty) {

            eventsContainer.innerHTML = "<p>No events found.</p>";

            return;

        }


        querySnapshot.forEach((eventDoc) => {

            const event = eventDoc.data();

            const eventCard = document.createElement("div");

            eventCard.className = "card";

            eventCard.innerHTML = `

                <img 
                    src="${event.image}" 
                    alt="${event.eventName}"
                    style="width:250px; height:150px; object-fit:cover;"
                >

                <h2>${event.eventName}</h2>

                <p><strong>Category:</strong> ${event.category}</p>

                <p><strong>Price:</strong> ₹${event.price}</p>

                <p>${event.description}</p>

                <button onclick="deleteEvent('${eventDoc.id}')">
                    Delete Event
                </button>

                <hr>

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


window.deleteEvent = async function(eventId) {

    if (!confirm("Are you sure you want to delete this event?")) {

        return;

    }


    try {

        await deleteDoc(doc(db, "events", eventId));

        alert("Event Deleted Successfully!");

        loadEvents();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};


loadEvents();