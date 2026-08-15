import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventsContainer =
    document.getElementById("eventsContainer");

eventsContainer.className = "events-grid";


// ====================== IMAGE PATH ======================

function getImagePath(image) {

    if (!image) {

        return "";

    }


    image = image.trim();


    // Full online URL

    if (
        image.startsWith("http://") ||
        image.startsWith("https://")
    ) {

        return image;

    }


    // Local project image

    if (
        image.startsWith("images/")
    ) {

        return image;

    }


    // If admin enters only the filename

    return "images/" + image;

}


// ====================== LOAD EVENTS ======================

async function loadEvents() {

    try {

        const querySnapshot =
            await getDocs(
                collection(
                    db,
                    "events"
                )
            );


        eventsContainer.innerHTML = "";


        if (querySnapshot.empty) {

            eventsContainer.innerHTML =
                `
                <div class="no-events">

                    <p>
                        No events found.
                    </p>

                </div>
                `;

            return;

        }


        querySnapshot.forEach(
            (eventDoc) => {

                const event =
                    eventDoc.data();


                const eventCard =
                    document.createElement(
                        "div"
                    );


                eventCard.className =
                    "event-card";


                const imagePath =
                    getImagePath(
                        event.image
                    );


                eventCard.innerHTML = `

                    <div class="event-image-container">

                        <img
                            src="${imagePath}"
                            alt="${event.eventName || "Event"}"
                            class="event-image"
                            onerror="this.onerror=null; this.src='images/family.jpg';">

                    </div>


                    <div class="event-card-content">

                        <h2>
                            ${event.eventName || "Event"}
                        </h2>


                        <div class="event-info">

                            <p>

                                <strong>
                                    Category:
                                </strong>

                                ${event.category || "Not specified"}

                            </p>


                            <p>

                                <strong>
                                    Price:
                                </strong>

                                ₹${event.price || 0}

                            </p>

                        </div>


                        <p class="event-description">

                            ${event.description || ""}

                        </p>


                        <button
                            class="delete-event-button"
                            onclick="deleteEvent('${eventDoc.id}')">

                            Delete Event

                        </button>

                    </div>

                `;


                eventsContainer.appendChild(
                    eventCard
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Error loading events:",
            error
        );


        eventsContainer.innerHTML =
            "<p>Error loading events.</p>";

    }

}


// ====================== DELETE EVENT ======================

window.deleteEvent =
    async function(eventId) {

        if (
            !confirm(
                "Are you sure you want to delete this event?"
            )
        ) {

            return;

        }


        try {

            await deleteDoc(
                doc(
                    db,
                    "events",
                    eventId
                )
            );


            alert(
                "Event Deleted Successfully!"
            );


            loadEvents();

        }

        catch (error) {

            console.error(
                "Delete Event Error:",
                error
            );


            alert(
                error.message
            );

        }

    };


// ====================== START ======================

loadEvents();