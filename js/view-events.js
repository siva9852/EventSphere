import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ====================== ELEMENTS ======================

const eventsContainer =
    document.getElementById("eventsContainer");

const eventSearch =
    document.getElementById("eventSearch");

eventsContainer.className = "events-grid";


// Store all events for search
let allEvents = [];


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


    // If admin enters only filename

    return "images/" + image;
}


// ====================== ESCAPE HTML ======================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ====================== DISPLAY EVENTS ======================

function displayEvents(events) {

    eventsContainer.innerHTML = "";


    if (events.length === 0) {

        eventsContainer.innerHTML = `
            <div class="no-events">

                <div style="
                    font-size:48px;
                    margin-bottom:15px;
                ">
                    🎉
                </div>

                <h3>
                    No events found
                </h3>

                <p>
                    Try searching with a different event name or category.
                </p>

            </div>
        `;

        return;
    }


    events.forEach(
        (event) => {

            const eventCard =
                document.createElement("div");

            eventCard.className =
                "event-card";


            const imagePath =
                getImagePath(event.image);


            const eventName =
                escapeHtml(
                    event.eventName || "Event"
                );


            const category =
                escapeHtml(
                    event.category || "Not specified"
                );


            const description =
                escapeHtml(
                    event.description || ""
                );


            const price =
                Number(event.price || 0);


            eventCard.innerHTML = `

                <div class="event-image-container">

                    <img
                        src="${imagePath}"
                        alt="${eventName}"
                        class="event-image"
                        onerror="
                            this.onerror=null;
                            this.src='images/family.jpg';
                        "
                    >

                </div>


                <div class="event-card-content">

                    <div class="event-category">

                        ${category}

                    </div>


                    <h2>
                        ${eventName}
                    </h2>


                    <div class="event-info">

                        <p>

                            <strong>
                                Category
                            </strong>

                            <span>
                                ${category}
                            </span>

                        </p>


                        <p>

                            <strong>
                                Price
                            </strong>

                            <span>
                                ₹${price}
                            </span>

                        </p>

                    </div>


                    <p class="event-description">

                        ${description}

                    </p>


                    <button
                        class="delete-event-button"
                        onclick="deleteEvent('${event.id}')"
                    >

                        <i class="fa-solid fa-trash"></i>

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


// ====================== LOAD EVENTS ======================

async function loadEvents() {

    try {

        eventsContainer.innerHTML = `

            <div class="loading-events">

                <div class="loading-spinner"></div>

                <p>
                    Loading events...
                </p>

            </div>

        `;


        const querySnapshot =
            await getDocs(
                collection(
                    db,
                    "events"
                )
            );


        allEvents = [];


        querySnapshot.forEach(
            (eventDoc) => {

                const event =
                    eventDoc.data();


                allEvents.push({

                    id: eventDoc.id,

                    ...event

                });

            }
        );


        displayEvents(
            allEvents
        );

    }

    catch (error) {

        console.error(
            "Error loading events:",
            error
        );


        eventsContainer.innerHTML = `

            <div class="no-events">

                <div style="
                    font-size:48px;
                    margin-bottom:15px;
                ">
                    ⚠️
                </div>

                <h3>
                    Unable to Load Events
                </h3>

                <p>
                    Please refresh the page and try again.
                </p>

            </div>

        `;

    }

}


// ====================== SEARCH EVENTS ======================

if (eventSearch) {

    eventSearch.addEventListener(
        "input",
        function () {

            const searchText =
                this.value
                    .trim()
                    .toLowerCase();


            if (!searchText) {

                displayEvents(
                    allEvents
                );

                return;

            }


            const filteredEvents =
                allEvents.filter(
                    (event) => {

                        const eventName =
                            String(
                                event.eventName || ""
                            ).toLowerCase();


                        const category =
                            String(
                                event.category || ""
                            ).toLowerCase();


                        const description =
                            String(
                                event.description || ""
                            ).toLowerCase();


                        return (
                            eventName.includes(searchText) ||
                            category.includes(searchText) ||
                            description.includes(searchText)
                        );

                    }
                );


            displayEvents(
                filteredEvents
            );

        }
    );

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


            // Remove deleted event
            allEvents =
                allEvents.filter(
                    (event) =>
                        event.id !== eventId
                );


            // Refresh displayed events
            if (eventSearch) {

                const searchText =
                    eventSearch.value
                        .trim()
                        .toLowerCase();


                if (searchText) {

                    const filteredEvents =
                        allEvents.filter(
                            (event) => {

                                const eventName =
                                    String(
                                        event.eventName || ""
                                    ).toLowerCase();


                                const category =
                                    String(
                                        event.category || ""
                                    ).toLowerCase();


                                const description =
                                    String(
                                        event.description || ""
                                    ).toLowerCase();


                                return (
                                    eventName.includes(searchText) ||
                                    category.includes(searchText) ||
                                    description.includes(searchText)
                                );

                            }
                        );


                    displayEvents(
                        filteredEvents
                    );

                } else {

                    displayEvents(
                        allEvents
                    );

                }

            } else {

                displayEvents(
                    allEvents
                );

            }

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