import { db, auth } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// ELEMENT
// =========================================================

const container =
    document.getElementById("myBookingsContainer");


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
        document.getElementById("customerEmail");


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
                        .substring(0, 6)
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

                                : status === "Cancelled"
                                ? "✕ Cancelled"

                                : "✕ Rejected"
                        }

                    </div>


                    <!-- ACTIONS -->

                    <div class="booking-bottom">


                        <!-- VIEW DETAILS -->

                        <button
                            type="button"
                            class="view-details-btn"
                            onclick="viewBookingDetails('${bookingDoc.id}')">

                            👁 View Details

                        </button>


                        <!-- CANCEL -->

                        ${
                            status === "Pending"
                                ? `

                                    <button
                                        type="button"
                                        class="customer-cancel-booking-btn"
                                        onclick="cancelCustomerBooking('${bookingDoc.id}')">

                                        <i class="fa-solid fa-xmark"></i>

                                        Cancel Booking

                                    </button>

                                  `
                                : ""
                        }


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
    async function (bookingId) {

        try {

            // ================= GET BOOKING =================

            const bookingSnapshot =
                await getDoc(
                    doc(
                        db,
                        "bookings",
                        bookingId
                    )
                );


            if (
                !bookingSnapshot.exists()
            ) {

                alert(
                    "Booking details not found."
                );

                return;

            }


            const booking =
                bookingSnapshot.data();


            // ================= DETAILS =================

            const eventName =
                booking.eventName ||
                "Event";


            const eventDate =
                booking.eventDate ||
                "Not specified";


            const endTime =
                booking.eventEndTime ||
                "Not specified";


            const guests =
                booking.guests ||
                "Not specified";


            const location =
                booking.location ||
                "Not specified";


            const price =
                booking.price ||
                "0";


            const requirements =
                booking.requirements ||
                "None";


            const status =
                booking.status ||
                "Pending";


            const cancellationReason =
                booking.cancellationReason ||
                "";


            const rejectionReason =
                booking.rejectionReason ||
                booking.reason ||
                "";


            const bookingIdText =
                "#BK-" +
                bookingId
                    .substring(0, 6)
                    .toUpperCase();


            // ================= STATUS CLASS =================

            let statusClass =
                "pending";


            if (
                status === "Approved"
            ) {

                statusClass =
                    "approved";

            }


            else if (
                status === "Cancelled"
            ) {

                statusClass =
                    "cancelled";

            }


            else if (
                status === "Rejected"
            ) {

                statusClass =
                    "rejected";

            }


            // ================= STATUS TEXT =================

            let statusText =
                "◷ Pending";


            if (
                status === "Approved"
            ) {

                statusText =
                    "✓ Approved";

            }


            else if (
                status === "Cancelled"
            ) {

                statusText =
                    "✕ Cancelled";

            }


            else if (
                status === "Rejected"
            ) {

                statusText =
                    "✕ Rejected";

            }


            // ================= POPUP =================

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

                        ${statusText}

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
                                ₹${price}
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


                        ${
                            status === "Cancelled"
                                ? `

                                    <div class="full-width">

                                        <span>
                                            Cancellation Reason
                                        </span>


                                        <strong>
                                            ${
                                                cancellationReason ||
                                                "No reason provided."
                                            }
                                        </strong>

                                    </div>

                                  `
                                : ""
                        }


                        ${
                            status === "Rejected"
                                ? `

                                    <div class="full-width">

                                        <span>
                                            Rejection Reason
                                        </span>


                                        <strong>
                                            ${
                                                rejectionReason ||
                                                "No reason provided."
                                            }
                                        </strong>

                                    </div>

                                  `
                                : ""
                        }


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
                        event.target === overlay
                    ) {

                        overlay.remove();

                    }

                }
            );

        }


        catch (error) {

            console.error(
                "View Booking Details Error:",
                error
            );


            alert(
                "Unable to load booking details."
            );

        }

    };


// =========================================================
// CUSTOMER CANCEL BOOKING
// =========================================================

window.cancelCustomerBooking =
    async function (bookingId) {


        // ================= CREATE POPUP =================

        const overlay =
            document.createElement(
                "div"
            );


        overlay.className =
            "cancel-booking-overlay";


        overlay.innerHTML = `

            <div class="cancel-booking-modal">


                <div class="cancel-modal-icon">

                    <i class="fa-solid fa-calendar-xmark"></i>

                </div>


                <h2>
                    Cancel Booking
                </h2>


                <p class="cancel-modal-event">

                    Are you sure you want to cancel
                    this booking?

                </p>


                <label
                    class="cancel-reason-label"
                    for="customerCancelReason">

                    Reason for cancellation

                    <span class="cancel-reason-required">
                        *
                    </span>

                </label>


                <textarea
                    id="customerCancelReason"
                    class="cancel-reason-input"
                    placeholder="Please enter your reason for cancelling this booking..."
                    required></textarea>


                <div class="cancel-modal-actions">


                    <button
                        type="button"
                        class="
                            cancel-modal-btn
                            cancel-close-btn
                        "
                        id="closeCancelBooking">

                        Keep Booking

                    </button>


                    <button
                        type="button"
                        class="
                            cancel-modal-btn
                            cancel-confirm-btn
                        "
                        id="confirmCancelBooking">

                        <i class="fa-solid fa-xmark"></i>

                        Cancel Booking

                    </button>


                </div>


            </div>

        `;


        document.body.appendChild(
            overlay
        );


        const reasonInput =
            document.getElementById(
                "customerCancelReason"
            );


        const closeButton =
            document.getElementById(
                "closeCancelBooking"
            );


        const confirmButton =
            document.getElementById(
                "confirmCancelBooking"
            );


        // ================= CLOSE =================

        closeButton.addEventListener(
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
                    event.target === overlay
                ) {

                    overlay.remove();

                }

            }
        );


        // ================= CONFIRM =================

        confirmButton.addEventListener(
            "click",
            async () => {


                const reason =
                    reasonInput.value.trim();


                if (!reason) {

                    alert(
                        "Please enter a reason for cancellation."
                    );

                    reasonInput.focus();

                    return;

                }


                const confirmed =
                    confirm(
                        "Are you sure you want to cancel this booking?"
                    );


                if (!confirmed) {

                    return;

                }


                try {

                    confirmButton.disabled =
                        true;


                    confirmButton.innerHTML = `

                        <i class="fa-solid fa-spinner fa-spin"></i>

                        Cancelling...

                    `;


                    // ================= GET BOOKING =================

                    const bookingSnapshot =
                        await getDoc(
                            doc(
                                db,
                                "bookings",
                                bookingId
                            )
                        );


                    if (
                        !bookingSnapshot.exists()
                    ) {

                        throw new Error(
                            "Booking not found."
                        );

                    }


                    const booking =
                        bookingSnapshot.data();


                    const eventName =
                        booking.eventName ||
                        "Event";


                    const customerEmail =
                        auth.currentUser?.email ||
                        booking.customerEmail ||
                        "";


                    // ================= FIRESTORE =================

                    await updateDoc(

                        doc(
                            db,
                            "bookings",
                            bookingId
                        ),

                        {

                            status:
                                "Cancelled",

                            cancelledBy:
                                "Customer",

                            cancellationReason:
                                reason,

                            cancelledAt:
                                new Date()

                        }

                    );


                    // ================= ADMIN EMAIL =================

                    try {

                        const response =
                            await fetch(

                                "https://eventsphere-dndh.onrender.com/customer-cancelled",

                                {

                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json"

                                    },

                                    body:
                                        JSON.stringify({

                                            customerEmail:
                                                customerEmail,

                                            eventName:
                                                eventName,

                                            reason:
                                                reason

                                        })

                                }

                            );


                        const data =
                            await response.json();


                        if (
                            !response.ok ||
                            !data.success
                        ) {

                            console.error(
                                "Cancellation email failed:",
                                data.message
                            );

                        }

                    }


                    catch (emailError) {

                        console.error(
                            "Cancellation email error:",
                            emailError
                        );

                    }


                    // ================= SUCCESS =================

                    overlay.remove();


                    alert(
                        "Booking cancelled successfully."
                    );


                    await loadMyBookings();

                }


                catch (error) {

                    console.error(
                        "Cancel Booking Error:",
                        error
                    );


                    confirmButton.disabled =
                        false;


                    confirmButton.innerHTML = `

                        <i class="fa-solid fa-xmark"></i>

                        Cancel Booking

                    `;


                    alert(
                        error.message ||
                        "Unable to cancel booking."
                    );

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