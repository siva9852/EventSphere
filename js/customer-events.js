import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventsContainer = document.getElementById("eventsContainer");

const eventSearch = document.getElementById("eventSearch");

const filterButtons =
    document.querySelectorAll(".filter-btn");


let allEvents = [];


// ====================== LOAD EVENTS ======================

async function loadEvents() {

    try {

        const querySnapshot =
            await getDocs(
                collection(db, "events")
            );


        allEvents = [];


        querySnapshot.forEach((eventDoc) => {

            const event = eventDoc.data();


            allEvents.push({

                id: eventDoc.id,

                ...event

            });

        });


        if (allEvents.length === 0) {

            showNoEvents();

            return;

        }


        displayEvents(allEvents);

    }

    catch (error) {

        console.error("Error loading events:", error);


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


// ====================== DISPLAY EVENTS ======================

function displayEvents(events) {

    eventsContainer.innerHTML = "";


    if (events.length === 0) {

        eventsContainer.innerHTML = `

            <div class="no-events">

                <i class="fa-solid fa-calendar-xmark"></i>

                <h2>No Events Found</h2>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;

    }


    events.forEach((event) => {

        const eventCard =
            document.createElement("div");


        eventCard.className =
            "event-card";


        eventCard.innerHTML = `

            <div class="event-image-container">

                <img
                    src="${event.image || "https://via.placeholder.com/600x350?text=EventSphere"}"
                    alt="${event.eventName || "Event"}"
                    class="event-image"
                >

            </div>


            <div class="event-card-content">

                <div class="event-category">

                    <i class="fa-solid fa-tag"></i>

                    ${event.category || "Event"}

                </div>


                <h2>
                    ${event.eventName || "Unnamed Event"}
                </h2>


                <div class="event-info">

                    <p>

                        <i class="fa-solid fa-indian-rupee-sign"></i>

                        <strong>Price:</strong>

                        ₹${event.price || 0}

                    </p>

                </div>


                <p class="event-description">

                    ${event.description || "Join us for an amazing experience."}

                </p>


                <button
                    class="book-event-button"
                    onclick="bookEvent('${event.id}')">

                    <i class="fa-solid fa-calendar-check"></i>

                    Book Now

                    <i class="fa-solid fa-arrow-right"></i>

                </button>

            </div>

        `;


        eventsContainer.appendChild(eventCard);

    });

}


// ====================== NO EVENTS ======================

function showNoEvents() {

    eventsContainer.innerHTML = `

        <div class="no-events">

            <i class="fa-solid fa-calendar-xmark"></i>

            <h2>No Events Available</h2>

            <p>
                There are currently no events available.
            </p>

        </div>

    `;

}


// ====================== SEARCH EVENTS ======================

if (eventSearch) {

    eventSearch.addEventListener("input", function () {

        const searchText =
            this.value.toLowerCase().trim();


        const activeFilter =
            document.querySelector(".filter-btn.active");


        const selectedCategory =
            activeFilter
                ? activeFilter.dataset.category
                : "all";


        filterEvents(
            searchText,
            selectedCategory
        );

    });

}


// ====================== CATEGORY FILTER ======================

filterButtons.forEach((button) => {

    button.addEventListener("click", function () {

        filterButtons.forEach((btn) => {

            btn.classList.remove("active");

        });


        this.classList.add("active");


        const category =
            this.dataset.category;


        const searchText =
            eventSearch
                ? eventSearch.value.toLowerCase().trim()
                : "";


        filterEvents(
            searchText,
            category
        );

    });

});


// ====================== FILTER EVENTS ======================

function filterEvents(searchText, category) {

    const filteredEvents =
        allEvents.filter((event) => {

            const eventName =
                String(event.eventName || "").toLowerCase();

            const eventCategory =
                String(event.category || "").toLowerCase();

            const eventDescription =
                String(event.description || "").toLowerCase();


            const matchesSearch =
                eventName.includes(searchText) ||
                eventCategory.includes(searchText) ||
                eventDescription.includes(searchText);


            const matchesCategory =
                category === "all" ||
                eventCategory === category.toLowerCase();


            return matchesSearch && matchesCategory;

        });


    displayEvents(filteredEvents);

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