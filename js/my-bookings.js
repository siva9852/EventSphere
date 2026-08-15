import { db, auth } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// ELEMENT
// =========================================================

const container =
    document.getElementById(
        "myBookingsContainer"
    );


// =========================================================
// LOAD MY BOOKINGS
// =========================================================

async function loadMyBookings() {


    const user =
        auth.currentUser;


    if (!user) {

        window.location.href =
            "customer-login.html";

        return;

    }


    // ================= CUSTOMER EMAIL =================

    const emailElement =
        document.getElementById(
            "customerEmail"
        );


    if (emailElement) {

        emailElement.textContent =
            user.email || "Customer";

    }


    try {


        // ================= GET BOOKINGS =================

        const q =
            query(
                collection(
                    db,
                    "bookings"
                ),

                where(
                    "customerId",
                    "==",
                    user.uid
                )
            );


        const snapshot =
            await getDocs(q);


        container.innerHTML = "";


        // ================= NO BOOKINGS =================

        if (snapshot.empty) {


            container.innerHTML = `

                <div class="no-bookings">

                    <div style="font-size:45px;">
                        📅
                    </div>


                    <h2>
                        No Bookings Yet
                    </h2>


                    <p>
                        Book an event and it will appear here.
                    </p>

                </div>

            `;


            return;

        }


        // ================= DISPLAY BOOKINGS =================

        snapshot.forEach(
            (bookingDoc) => {


                const booking =
                    bookingDoc.data();


                const status =
                    booking.status ||
                    "Pending";


                const bookingId =
                    "#BK-" +
                    bookingDoc.id
                        .substring(
                            0,
                            6
                        )
                        .toUpperCase();


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "modern-booking-card";


                card.innerHTML = `

                    <img
                        src="images/hero.jpg"
                        class="booking-event-image"
                        alt="Event"
                    >


                    <div class="booking-main">


                        <!-- BOOKING ID -->

                        <div class="booking-id-label">
                            BOOKING ID
                        </div>


                        <div class="booking-id-value">
                            ${bookingId}
                        </div>


                        <!-- EVENT NAME -->

                        <h2>
                            ${booking.eventName || "Event"}
                            🎉
                        </h2>


                        <!-- DETAILS -->

                        <div class="booking-details">


                            <!-- DATE -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    📅
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Event Date
                                    </small>


                                    <strong>
                                        ${booking.eventDate || "Not specified"}
                                    </strong>

                                </div>

                            </div>


                            <!-- GUESTS -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    👥
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Guests
                                    </small>


                                    <strong>
                                        ${booking.guests || 0}
                                        People
                                    </strong>

                                </div>

                            </div>


                            <!-- LOCATION -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    📍
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Location
                                    </small>


                                    <strong>
                                        ${booking.location || "Not specified"}
                                    </strong>

                                </div>

                            </div>


                            <!-- PRICE -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    ₹
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Total Price
                                    </small>


                                    <strong>
                                        ₹${booking.price || "0"}
                                    </strong>

                                </div>

                            </div>


                            <!-- REQUIREMENTS -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    📝
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Requirements
                                    </small>


                                    <strong>
                                        ${booking.requirements || "None"}
                                    </strong>

                                </div>

                            </div>


                            <!-- END TIME -->

                            <div class="booking-detail">

                                <div class="booking-detail-icon">
                                    🕐
                                </div>


                                <div class="booking-detail-content">

                                    <small>
                                        Event End Time
                                    </small>


                                    <strong>
                                        ${booking.eventEndTime || "Not specified"}
                                    </strong>

                                </div>

                            </div>


                        </div>

                    </div>


                    <!-- STATUS -->

                    <div class="
                        booking-status
                        ${status.toLowerCase()}
                    ">

                        ${
                            status === "Pending"
                                ? "◷ Pending"
                                : status === "Approved"
                                ? "✓ Approved"
                                : "✕ Rejected"
                        }

                    </div>


                    <!-- VIEW DETAILS -->

                    <div class="booking-bottom">

                        <button
                            type="button"
                            class="view-details-btn"
                            onclick="viewBookingDetails('${bookingDoc.id}')">

                            👁 View Details

                        </button>

                    </div>

                `;


                container.appendChild(
                    card
                );

            }
        );

    }


    catch (error) {


        console.error(
            "Error loading bookings:",
            error
        );


        container.innerHTML = `

            <div class="no-bookings">

                <div style="font-size:40px;">
                    ⚠️
                </div>


                <h2>
                    Error Loading Bookings
                </h2>


                <p>
                    ${error.message}
                </p>

            </div>

        `;

    }

}


// =========================================================
// VIEW BOOKING DETAILS
// =========================================================

window.viewBookingDetails =
    function (bookingId) {


        const bookingCard =
            document.querySelector(
                `[onclick="viewBookingDetails('${bookingId}')"]`
            );


        if (!bookingCard) {

            return;

        }


        const card =
            bookingCard.closest(
                ".modern-booking-card"
            );


        if (!card) {

            return;

        }


        // ================= GET VALUES FROM CARD =================

        const bookingIdText =
            card.querySelector(
                ".booking-id-value"
            )?.textContent ||
            "Not available";


        const eventName =
            card.querySelector(
                ".booking-main h2"
            )?.textContent ||
            "Event";


        const details =
            card.querySelectorAll(
                ".booking-detail"
            );


        let eventDate =
            "Not specified";


        let guests =
            "Not specified";


        let location =
            "Not specified";


        let price =
            "0";


        let requirements =
            "None";


        let endTime =
            "Not specified";


        details.forEach(
            (detail) => {


                const label =
                    detail.querySelector(
                        "small"
                    )?.textContent.trim();


                const value =
                    detail.querySelector(
                        "strong"
                    )?.textContent.trim();


                if (
                    label ===
                    "Event Date"
                ) {

                    eventDate =
                        value;

                }


                if (
                    label ===
                    "Guests"
                ) {

                    guests =
                        value;

                }


                if (
                    label ===
                    "Location"
                ) {

                    location =
                        value;

                }


                if (
                    label ===
                    "Total Price"
                ) {

                    price =
                        value;

                }


                if (
                    label ===
                    "Requirements"
                ) {

                    requirements =
                        value;

                }


                if (
                    label ===
                    "Event End Time"
                ) {

                    endTime =
                        value;

                }

            }
        );


        // ================= GET STATUS =================

        const statusElement =
            card.querySelector(
                ".booking-status"
            );


        const status =
            statusElement
                ? statusElement.textContent.trim()
                : "Pending";


        let statusClass =
            "pending";


        if (
            status.includes(
                "Approved"
            )
        ) {

            statusClass =
                "approved";

        }


        else if (
            status.includes(
                "Rejected"
            )
        ) {

            statusClass =
                "rejected";

        }


        // ================= CREATE POPUP =================

        const overlay =
            document.createElement(
                "div"
            );


        overlay.className =
            "booking-details-overlay";


        overlay.innerHTML = `

            <div class="booking-details-modal">


                <!-- CLOSE -->

                <button
                    type="button"
                    class="close-booking-details"
                    id="closeBookingDetails">

                    ×

                </button>


                <!-- ICON -->

                <div class="booking-modal-icon">

                    🎉

                </div>


                <h2>
                    Booking Details
                </h2>


                <p class="booking-modal-event">
                    ${eventName}
                </p>


                <!-- STATUS -->

                <div class="
                    booking-modal-status
                    ${statusClass}
                ">

                    ${
                        statusClass === "approved"
                            ? "✓ Approved"
                            : statusClass === "rejected"
                            ? "✕ Rejected"
                            : "◷ Pending"
                    }

                </div>


                <!-- DETAILS -->

                <div class="booking-modal-grid">


                    <div>

                        <span>
                            Booking ID
                        </span>

                        <strong>
                            ${bookingIdText}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Event Date
                        </span>

                        <strong>
                            ${eventDate}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Event End Time
                        </span>

                        <strong>
                            ${endTime}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Guests
                        </span>

                        <strong>
                            ${guests}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Location
                        </span>

                        <strong>
                            ${location}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Total Price
                        </span>

                        <strong>
                            ${price}
                        </strong>

                    </div>


                    <div class="full-width">

                        <span>
                            Requirements
                        </span>

                        <strong>
                            ${requirements}
                        </strong>

                    </div>


                </div>


                <!-- CLOSE BUTTON -->

                <button
                    type="button"
                    class="close-details-btn"
                    id="closeDetailsButton">

                    Close

                </button>


            </div>

        `;


        document.body.appendChild(
            overlay
        );


        // ================= CLOSE X =================

        document
            .getElementById(
                "closeBookingDetails"
            )
            .addEventListener(
                "click",
                () => {

                    overlay.remove();

                }
            );


        // ================= CLOSE BUTTON =================

        document
            .getElementById(
                "closeDetailsButton"
            )
            .addEventListener(
                "click",
                () => {

                    overlay.remove();

                }
            );


        // ================= CLICK OUTSIDE =================

        overlay.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    overlay
                ) {

                    overlay.remove();

                }

            }
        );

    };


// =========================================================
// AUTH STATE
// =========================================================

auth.onAuthStateChanged(
    (user) => {

        if (user) {

            loadMyBookings();

        }

        else {

            window.location.href =
                "customer-login.html";

        }

    }
);