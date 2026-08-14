import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    setDoc,
    increment,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const bookingsContainer =
    document.getElementById("bookingsContainer");

const searchInput =
    document.getElementById("bookingSearch");


let allBookings = [];

let currentFilter = "All";


// ================= LOAD BOOKINGS =================

async function loadBookings() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "bookings")
            );


        const now = new Date();

        allBookings = [];


        // ================= CHECK COMPLETED BOOKINGS =================

        for (const bookingDoc of snapshot.docs) {

            const booking =
                bookingDoc.data();


            if (booking.eventDate) {

                const endTime =
                    booking.eventEndTime || "20:00";


                const eventEndDate =
                    new Date(
                        `${booking.eventDate}T${endTime}:00`
                    );


                // ================= COMPLETED =================

                if (now >= eventEndDate) {

                    console.log(
                        "Completed booking:",
                        booking.eventName,
                        booking.eventDate,
                        endTime
                    );


                    const completedRef =
                        doc(
                            db,
                            "completedBookings",
                            bookingDoc.id
                        );


                    const statsRef =
                        doc(
                            db,
                            "statistics",
                            "main"
                        );


                    // Count only once

                    await runTransaction(
                        db,
                        async (transaction) => {

                            const completedSnap =
                                await transaction.get(
                                    completedRef
                                );


                            if (!completedSnap.exists()) {

                                transaction.set(
                                    completedRef,
                                    {

                                        bookingId:
                                            bookingDoc.id,

                                        eventName:
                                            booking.eventName,

                                        customerEmail:
                                            booking.customerEmail,

                                        eventDate:
                                            booking.eventDate,

                                        eventEndTime:
                                            endTime,

                                        completedAt:
                                            new Date()

                                    }
                                );


                                transaction.set(
                                    statsRef,
                                    {
                                        completedEvents:
                                            increment(1)
                                    },
                                    {
                                        merge: true
                                    }
                                );

                            }

                        }
                    );


                    // Delete completed booking

                    await deleteDoc(
                        doc(
                            db,
                            "bookings",
                            bookingDoc.id
                        )
                    );


                    continue;

                }

            }


            allBookings.push({

                id:
                    bookingDoc.id,

                ...booking

            });

        }


        // ================= NEWEST FIRST =================

        allBookings.sort((a, b) => {

            const timeA =
                a.createdAt?.toMillis
                    ? a.createdAt.toMillis()
                    : 0;


            const timeB =
                b.createdAt?.toMillis
                    ? b.createdAt.toMillis()
                    : 0;


            return timeB - timeA;

        });


        updateBookingCounts();

        displayBookings();

    }

    catch (error) {

        console.error(
            "Load Bookings Error:",
            error
        );


        bookingsContainer.innerHTML =
            "<p>Error loading bookings.</p>";

    }

}


// ================= UPDATE COUNTS =================

function updateBookingCounts() {

    const allCount =
        document.getElementById("allCount");

    const pendingCount =
        document.getElementById("pendingCount");

    const approvedCount =
        document.getElementById("approvedCount");

    const rejectedCount =
        document.getElementById("rejectedCount");


    if (allCount) {

        allCount.textContent =
            allBookings.length;

    }


    if (pendingCount) {

        pendingCount.textContent =
            allBookings.filter(
                booking =>
                    booking.status === "Pending"
            ).length;

    }


    if (approvedCount) {

        approvedCount.textContent =
            allBookings.filter(
                booking =>
                    booking.status === "Approved"
            ).length;

    }


    if (rejectedCount) {

        rejectedCount.textContent =
            allBookings.filter(
                booking =>
                    booking.status === "Rejected"
            ).length;

    }

}


// ================= DISPLAY BOOKINGS =================

function displayBookings() {

    bookingsContainer.innerHTML = "";


    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const filteredBookings =
        allBookings.filter((booking) => {


            // ================= STATUS FILTER =================

            if (
                currentFilter !== "All" &&
                booking.status !== currentFilter
            ) {

                return false;

            }


            // ================= SEARCH =================

            if (!searchText) {

                return true;

            }


            const eventName =
                String(
                    booking.eventName || ""
                ).toLowerCase();


            const customerEmail =
                String(
                    booking.customerEmail || ""
                ).toLowerCase();


            const location =
                String(
                    booking.location || ""
                ).toLowerCase();


            const customerName =
                String(
                    booking.customerName || ""
                ).toLowerCase();


            return (

                eventName.includes(searchText) ||

                customerEmail.includes(searchText) ||

                location.includes(searchText) ||

                customerName.includes(searchText)

            );

        });


    // ================= NO RESULTS =================

    if (filteredBookings.length === 0) {

        bookingsContainer.innerHTML =
            "<p>No bookings found.</p>";

        return;

    }


    // ================= CREATE CARDS =================

    filteredBookings.forEach((booking) => {

        const card =
            document.createElement("div");


        // IMPORTANT:
        // Uses the new CSS design

        card.className =
            "booking-card";


        // ================= STATUS CLASS =================

        let statusClass =
            "status-pending";


        if (booking.status === "Approved") {

            statusClass =
                "status-approved";

        }

        else if (booking.status === "Rejected") {

            statusClass =
                "status-rejected";

        }


        // ================= ACTION BUTTONS =================

        let actionButtons = "";


        if (booking.status === "Pending") {

            actionButtons = `

                <div class="booking-actions">

                    <button
                        class="approve-btn"
                        onclick="approveBooking(
                            '${booking.id}',
                            '${booking.customerEmail}',
                            '${booking.eventName}'
                        )">

                        ✓ Approve

                    </button>


                    <button
                        class="reject-btn"
                        onclick="rejectBooking(
                            '${booking.id}',
                            '${booking.customerEmail}',
                            '${booking.eventName}'
                        )">

                        ✕ Reject

                    </button>

                </div>

            `;

        }


        // ================= BOOKED AT =================

        let bookedAt =
            "Not available";


        if (
            booking.createdAt &&
            booking.createdAt.toDate
        ) {

            bookedAt =
                booking.createdAt
                    .toDate()
                    .toLocaleString();

        }


        // ================= CARD =================

        card.innerHTML = `

            <div class="booking-status ${statusClass}">

                ${booking.status || "Pending"}

            </div>


            <h2>

                ${booking.eventName || "Event"}

            </h2>


            <div class="booking-details">


                <!-- COLUMN 1 -->

                <div class="booking-column">


                    <div class="booking-info">

                        👤

                        <strong>
                            Customer:
                        </strong>

                        <span>
                            ${booking.customerEmail || "No Email"}
                        </span>

                    </div>


                    <div class="booking-info">

                        📅

                        <strong>
                            Event Date:
                        </strong>

                        <span>
                            ${booking.eventDate || "Not specified"}
                        </span>

                    </div>


                    <div class="booking-info">

                        👥

                        <strong>
                            Guests:
                        </strong>

                        <span>
                            ${booking.guests || 0}
                        </span>

                    </div>


                </div>


                <!-- COLUMN 2 -->

                <div class="booking-column">


                    <div class="booking-info">

                        🕐

                        <strong>
                            Event End Time:
                        </strong>

                        <span>
                            ${booking.eventEndTime || "20:00"}
                        </span>

                    </div>


                    <div class="booking-info">

                        📍

                        <strong>
                            Location:
                        </strong>

                        <span>
                            ${booking.location || "Not specified"}
                        </span>

                    </div>


                    <div class="booking-info">

                        📝

                        <strong>
                            Requirements:
                        </strong>

                        <span>
                            ${booking.requirements || "None"}
                        </span>

                    </div>


                </div>


                <!-- COLUMN 3 -->

                <div class="booking-column">


                    <div class="booking-info">

                        🕒

                        <strong>
                            Booked At:
                        </strong>


                        <br><br>


                        <span>

                            ${bookedAt}

                        </span>

                    </div>


                </div>


            </div>


            ${actionButtons}

        `;


        bookingsContainer.appendChild(card);

    });


    // Update active filter button

    updateActiveFilterButton();

}


// ================= FILTER BOOKINGS =================

window.filterBookings =
    function (filter) {

        currentFilter =
            filter;


        displayBookings();

    };


// ================= ACTIVE FILTER BUTTON =================

function updateActiveFilterButton() {

    const buttons =
        document.querySelectorAll(
            ".filter-btn"
        );


    buttons.forEach((button) => {

        button.classList.remove(
            "active-filter"
        );

    });


    buttons.forEach((button) => {

        const text =
            button
                .querySelector("span")
                ?.textContent
                .trim();


        if (text === currentFilter) {

            button.classList.add(
                "active-filter"
            );

        }

    });

}


// ================= SEARCH =================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            displayBookings();

        }
    );

}


// ================= APPROVE =================

window.approveBooking = async function (
    bookingId,
    customerEmail,
    eventName
) {

    try {

        await updateDoc(
            doc(
                db,
                "bookings",
                bookingId
            ),
            {
                status:
                    "Approved"
            }
        );


        // ================= SEND EMAIL =================

        const response =
            await fetch(
                "https://eventsphere-dndh.onrender.com/booking-status",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        email:
                            customerEmail,

                        eventName:
                            eventName,

                        status:
                            "Approved"

                    })

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                "Booking approved, but email could not be sent."
            );

            loadBookings();

            return;

        }


        alert(
            "Booking Approved! Email sent to customer."
        );


        loadBookings();

    }

    catch (error) {

        console.error(error);

        alert(
            error.message
        );

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
            doc(
                db,
                "bookings",
                bookingId
            ),
            {
                status:
                    "Rejected"
            }
        );


        // ================= SEND EMAIL =================

        const response =
            await fetch(
                "https://eventsphere-dndh.onrender.com/booking-status",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        email:
                            customerEmail,

                        eventName:
                            eventName,

                        status:
                            "Rejected"

                    })

                }
            );


        const data =
            await response.json();


        if (!data.success) {

            alert(
                "Booking rejected, but email could not be sent."
            );

            loadBookings();

            return;

        }


        alert(
            "Booking Rejected! Email sent to customer."
        );


        loadBookings();

    }

    catch (error) {

        console.error(error);

        alert(
            error.message
        );

    }

};


// ================= FIRST LOAD =================

loadBookings();


// ================= CHECK EVERY 30 SECONDS =================

setInterval(() => {

    loadBookings();

}, 30000);