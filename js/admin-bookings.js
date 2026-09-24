import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    increment,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// ELEMENTS
// =========================================================

const bookingsContainer =
    document.getElementById("bookingsContainer");

const searchInput =
    document.getElementById("bookingSearch");

let allBookings = [];

let currentFilter = "All";

let currentPaymentFilter = "All";


// =========================================================
// SMALL HELPERS
// =========================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getDateValue(value) {

    if (!value) {
        return null;
    }

    if (
        typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    if (
        typeof value.toMillis === "function"
    ) {
        return new Date(value.toMillis());
    }

    if (value instanceof Date) {
        return value;
    }

    const date = new Date(value);

    if (!isNaN(date.getTime())) {
        return date;
    }

    return null;
}


function formatDate(value) {

    const date =
        getDateValue(value);

    if (!date) {
        return "Not specified";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatDateTime(value) {

    const date =
        getDateValue(value);

    if (!date) {
        return "Not available";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatMoney(value) {

    const amount =
        Number(value || 0);

    return "₹" +
        amount.toLocaleString("en-IN");
}


function getBookingAmount(booking) {

    return Number(
        booking.price ??
        booking.amount ??
        booking.totalAmount ??
        0
    );
}


function getAmountPaid(booking) {

    const total =
        getBookingAmount(booking);

    let paid = 0;

    if (
        booking.amountPaid !== undefined &&
        booking.amountPaid !== null
    ) {
        paid =
            Number(
                booking.amountPaid || 0
            );
    }
    else if (
        booking.paymentStatus === "Paid"
    ) {
        paid = total;
    }

    return Math.max(
        0,
        Math.min(
            paid,
            total
        )
    );
}


function getPaymentStatus(booking) {

    const total =
        getBookingAmount(booking);

    const paid =
        getAmountPaid(booking);

    const due =
        Math.max(
            0,
            total - paid
        );

    if (due <= 0) {
        return "Paid";
    }

    if (paid > 0) {
        return "Partially Paid";
    }

    return "Unpaid";
}


// =========================================================
// LOAD BOOKINGS
// =========================================================

async function loadBookings() {

    if (!bookingsContainer) {
        console.error(
            "bookingsContainer not found."
        );

        return;
    }


    try {

        bookingsContainer.innerHTML = `
            <div class="booking-loading">
                Loading bookings...
            </div>
        `;


        const snapshot =
            await getDocs(
                collection(
                    db,
                    "bookings"
                )
            );


        const now =
            new Date();

        allBookings = [];


        // =====================================================
        // CHECK COMPLETED BOOKINGS
        // =====================================================

        for (
            const bookingDoc of snapshot.docs
        ) {

            const booking =
                bookingDoc.data();


            if (booking.eventDate) {

                const endTime =
                    booking.eventEndTime ||
                    "20:00";


                const eventEndDate =
                    new Date(
                        `${booking.eventDate}T${endTime}:00`
                    );


                if (
                    !isNaN(
                        eventEndDate.getTime()
                    ) &&
                    now >= eventEndDate
                ) {

                    console.log(
                        "Completed booking:",
                        booking.eventName
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


                    try {

                        await runTransaction(
                            db,
                            async (
                                transaction
                            ) => {

                                const completedSnap =
                                    await transaction.get(
                                        completedRef
                                    );


                                if (
                                    !completedSnap.exists()
                                ) {

                                    transaction.set(
                                        completedRef,
                                        {
                                            bookingId:
                                                bookingDoc.id,

                                            eventName:
                                                booking.eventName ||
                                                "Event",

                                            customerEmail:
                                                booking.customerEmail ||
                                                "",

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


                        await deleteDoc(
                            doc(
                                db,
                                "bookings",
                                bookingDoc.id
                            )
                        );


                        continue;

                    }
                    catch (completionError) {

                        console.error(
                            "Completed booking processing error:",
                            completionError
                        );

                    }

                }

            }


            allBookings.push({

                id:
                    bookingDoc.id,

                ...booking

            });

        }


        // =====================================================
        // NEWEST BOOKINGS FIRST
        // =====================================================

        allBookings.sort(
            (a, b) => {

                const timeA =
                    a.createdAt &&
                    typeof a.createdAt.toMillis ===
                    "function"
                        ? a.createdAt.toMillis()
                        : 0;


                const timeB =
                    b.createdAt &&
                    typeof b.createdAt.toMillis ===
                    "function"
                        ? b.createdAt.toMillis()
                        : 0;


                return timeB - timeA;

            }
        );


        updateBookingCounts();

        displayBookings();

    }
    catch (error) {

        console.error(
            "Load Bookings Error:",
            error
        );


        bookingsContainer.innerHTML = `
            <div class="booking-error">
                <i class="fa-solid fa-circle-exclamation"></i>
                Unable to load bookings.
            </div>
        `;

    }

}


// =========================================================
// UPDATE COUNTS
// =========================================================

function updateBookingCounts() {

    const allCount =
        document.getElementById(
            "allCount"
        );

    const pendingCount =
        document.getElementById(
            "pendingCount"
        );

    const approvedCount =
        document.getElementById(
            "approvedCount"
        );

    const rejectedCount =
        document.getElementById(
            "rejectedCount"
        );


    const pending =
        allBookings.filter(
            booking =>
                booking.status === "Pending"
        ).length;


    const approved =
        allBookings.filter(
            booking =>
                booking.status === "Approved"
        ).length;


    const rejected =
        allBookings.filter(
            booking =>
                booking.status === "Rejected"
        ).length;


    if (allCount) {

        allCount.textContent =
            allBookings.length;

    }


    if (pendingCount) {

        pendingCount.textContent =
            pending;

    }


    if (approvedCount) {

        approvedCount.textContent =
            approved;

    }


    if (rejectedCount) {

        rejectedCount.textContent =
            rejected;

    }

}


// =========================================================
// DISPLAY BOOKINGS
// =========================================================

function displayBookings() {

    if (!bookingsContainer) {
        return;
    }


    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const filteredBookings =
        allBookings.filter(
            booking => {

                // =============================================
                // STATUS FILTER
                // =============================================

                if (
                    currentFilter !== "All" &&
                    booking.status !==
                    currentFilter
                ) {

                    return false;

                }


                // =============================================
                // PAYMENT FILTER
                // =============================================

                const paymentStatus =
                    getPaymentStatus(
                        booking
                    );


                if (
                    currentPaymentFilter ===
                    "Paid" &&
                    paymentStatus !==
                    "Paid"
                ) {

                    return false;

                }


                if (
                    currentPaymentFilter ===
                    "Unpaid" &&
                    paymentStatus ===
                    "Paid"
                ) {

                    return false;

                }


                // =============================================
                // SEARCH
                // =============================================

                if (!searchText) {
                    return true;
                }


                const eventName =
                    String(
                        booking.eventName ||
                        ""
                    ).toLowerCase();


                const customerName =
                    String(
                        booking.customerName ||
                        ""
                    ).toLowerCase();


                const customerEmail =
                    String(
                        booking.customerEmail ||
                        ""
                    ).toLowerCase();


                const location =
                    String(
                        booking.location ||
                        ""
                    ).toLowerCase();


                return (

                    eventName.includes(
                        searchText
                    ) ||

                    customerName.includes(
                        searchText
                    ) ||

                    customerEmail.includes(
                        searchText
                    ) ||

                    location.includes(
                        searchText
                    )

                );

            }
        );


    // =========================================================
    // NO BOOKINGS
    // =========================================================

    if (
        filteredBookings.length === 0
    ) {

        bookingsContainer.innerHTML = `
            <div class="booking-empty">
                <div class="empty-icon">
                    <i class="fa-solid fa-calendar-xmark"></i>
                </div>

                <h3>No bookings found</h3>

                <p>
                    There are no bookings matching your filters.
                </p>
            </div>
        `;

        updateFilterButtons();

        return;

    }


    // =========================================================
    // CREATE TABLE
    // =========================================================

    const rows =
        filteredBookings
            .map(
                (
                    booking,
                    index
                ) => {

                    const totalAmount =
                        getBookingAmount(
                            booking
                        );


                    const amountPaid =
                        getAmountPaid(
                            booking
                        );


                    const paymentStatus =
                        getPaymentStatus(
                            booking
                        );


                    const bookingStatus =
                        booking.status ||
                        "Pending";


                    const eventName =
                        escapeHtml(
                            booking.eventName ||
                            "Event"
                        );


                    const customerName =
                        escapeHtml(
                            booking.customerName ||
                            "Customer"
                        );


                    const customerEmail =
                        escapeHtml(
                            booking.customerEmail ||
                            "No email"
                        );


                    const eventDate =
                        formatDate(
                            booking.eventDate
                        );


                    const eventEndTime =
                        escapeHtml(
                            booking.eventEndTime ||
                            "18:00"
                        );


                    const guests =
                        Number(
                            booking.guests || 0
                        );


                    const location =
                        escapeHtml(
                            booking.location ||
                            "Not specified"
                        );


                    let bookingStatusClass =
                        "status-pending";


                    if (
                        bookingStatus ===
                        "Approved"
                    ) {

                        bookingStatusClass =
                            "status-approved";

                    }
                    else if (
                        bookingStatus ===
                        "Rejected"
                    ) {

                        bookingStatusClass =
                            "status-rejected";

                    }


                    let paymentClass =
                        "payment-unpaid";


                    if (
                        paymentStatus ===
                        "Paid"
                    ) {

                        paymentClass =
                            "payment-paid";

                    }
                    else if (
                        paymentStatus ===
                        "Partially Paid"
                    ) {

                        paymentClass =
                            "payment-partial";

                    }


                    const eventImage =
                        booking.eventImage ||
                        booking.image ||
                        "";


                    let imageHTML = "";

                    if (eventImage) {

                        imageHTML = `
                            <img
                                src="${escapeHtml(eventImage)}"
                                alt="${eventName}"
                                onerror="
                                    this.style.display='none';
                                    this.nextElementSibling.style.display='flex';
                                "
                            >
                            <div
                                class="event-image-fallback"
                                style="display:none;"
                            >
                                <i class="fa-solid fa-calendar-days"></i>
                            </div>
                        `;

                    }
                    else {

                        imageHTML = `
                            <div class="event-image-fallback">
                                <i class="fa-solid fa-calendar-days"></i>
                            </div>
                        `;

                    }


                    let actions = `
                        <button
                            type="button"
                            class="table-action view-action"
                            data-view-id="${escapeHtml(booking.id)}"
                            title="View Details"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    `;


                    if (
                        bookingStatus ===
                        "Pending"
                    ) {

                        actions += `

                            <button
                                type="button"
                                class="table-action approve-action"
                                data-approve-id="${escapeHtml(booking.id)}"
                                title="Approve"
                            >
                                <i class="fa-solid fa-check"></i>
                            </button>

                            <button
                                type="button"
                                class="table-action reject-action"
                                data-reject-id="${escapeHtml(booking.id)}"
                                title="Reject"
                            >
                                <i class="fa-solid fa-xmark"></i>
                            </button>

                        `;

                    }


                    return `

                        <tr>

                            <td class="number-cell">
                                ${index + 1}
                            </td>


                            <td>

                                <div class="event-cell">

                                    <div class="event-image">
                                        ${imageHTML}
                                    </div>

                                    <div class="event-text">

                                        <strong>
                                            ${eventName}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                                                booking.category ||
                                                "Event"
                                            )}
                                        </span>

                                    </div>

                                </div>

                            </td>


                            <td>

                                <div class="customer-cell">

                                    <strong>
                                        ${customerName}
                                    </strong>

                                    <span>
                                        ${customerEmail}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <div class="date-cell">

                                    <strong>
                                        <i class="fa-regular fa-calendar"></i>
                                        ${eventDate}
                                    </strong>

                                    <span>
                                        ${eventEndTime}
                                    </span>

                                </div>

                            </td>


                            <td class="center-cell">

                                <strong>
                                    ${guests}
                                </strong>

                            </td>


                            <td>

                                <strong class="amount-cell">
                                    ${formatMoney(
                                        totalAmount
                                    )}
                                </strong>

                            </td>


                            <td>

                                <span
                                    class="payment-badge ${paymentClass}"
                                >
                                    ${paymentStatus}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="booking-badge ${bookingStatusClass}"
                                >
                                    ${bookingStatus}
                                </span>

                            </td>


                            <td>

                                <div class="table-actions">

                                    ${actions}

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    // =========================================================
    // IF CONTAINER IS TBODY
    // =========================================================

    if (
        bookingsContainer.tagName ===
        "TBODY"
    ) {

        bookingsContainer.innerHTML =
            rows;

    }


    // =========================================================
    // IF CONTAINER IS NORMAL DIV
    // =========================================================

    else {

        bookingsContainer.innerHTML = `

            <div class="booking-table-wrapper">

                <table class="booking-table">

                    <thead>

                        <tr>

                            <th>#</th>

                            <th>Event</th>

                            <th>Customer</th>

                            <th>Date & Time</th>

                            <th>Seats</th>

                            <th>Amount</th>

                            <th>Payment Status</th>

                            <th>Booking Status</th>

                            <th>Actions</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows}

                    </tbody>

                </table>

            </div>

        `;

    }


    addTableEvents();

    updateFilterButtons();

}


// =========================================================
// TABLE BUTTON EVENTS
// =========================================================

function addTableEvents() {

    document
        .querySelectorAll(
            "[data-view-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.viewId;

                        viewBookingDetails(
                            id
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-approve-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.approveId;

                        const booking =
                            allBookings.find(
                                item =>
                                    item.id === id
                            );


                        if (!booking) {
                            return;
                        }


                        approveBooking(
                            id,
                            booking.customerEmail ||
                            "",
                            booking.eventName ||
                            "Event"
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-reject-id]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.dataset.rejectId;

                        const booking =
                            allBookings.find(
                                item =>
                                    item.id === id
                            );


                        if (!booking) {
                            return;
                        }


                        rejectBooking(
                            id,
                            booking.customerEmail ||
                            "",
                            booking.eventName ||
                            "Event"
                        );

                    }
                );

            }
        );

}


// =========================================================
// STATUS FILTER
// =========================================================

window.filterBookings =
    function(filter) {

        currentFilter =
            filter;

        displayBookings();

    };


// =========================================================
// PAYMENT FILTER
// =========================================================

window.filterPaymentBookings =
    function(filter) {

        currentPaymentFilter =
            filter;

        displayBookings();

    };


// =========================================================
// FILTER BUTTON STYLE
// =========================================================

function updateFilterButtons() {

    document
        .querySelectorAll(
            ".filter-btn"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active-filter"
                );


                const value =
                    button.dataset.filter ||
                    button.querySelector(
                        "span"
                    )?.textContent.trim();


                if (
                    value ===
                    currentFilter
                ) {

                    button.classList.add(
                        "active-filter"
                    );

                }

            }
        );


    document
        .querySelectorAll(
            ".payment-filter-btn"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active-payment-filter"
                );


                const value =
                    button.dataset.filter ||
                    button.textContent.trim();


                if (
                    value ===
                    currentPaymentFilter
                ) {

                    button.classList.add(
                        "active-payment-filter"
                    );

                }

            }
        );

}


// =========================================================
// SEARCH
// =========================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            displayBookings();

        }
    );

}


// =========================================================
// VIEW BOOKING DETAILS
// =========================================================

function viewBookingDetails(
    bookingId
) {

    const booking =
        allBookings.find(
            item =>
                item.id ===
                bookingId
        );


    if (!booking) {

       window.showEventSphereMessage(
    "error",
    "Booking Not Found",
    "The booking details could not be found."
);
        return;

    }


    const totalAmount =
        getBookingAmount(
            booking
        );


    const amountPaid =
        getAmountPaid(
            booking
        );


    const amountDue =
        Math.max(
            0,
            totalAmount -
            amountPaid
        );


    const paymentStatus =
        getPaymentStatus(
            booking
        );


    const overlay =
        document.createElement(
            "div"
        );


    overlay.className =
        "booking-details-overlay";


    overlay.innerHTML = `

        <div class="booking-details-modal">

            <div class="details-header">

                <div>

                    <span class="details-label">
                        BOOKING DETAILS
                    </span>

                    <h2>
                        ${escapeHtml(
                            booking.eventName ||
                            "Event"
                        )}
                    </h2>

                </div>


                <button
                    type="button"
                    class="details-close"
                    id="detailsCloseButton"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>


            <div class="details-status-row">

                <span class="booking-badge ${

                    booking.status ===
                    "Approved"

                        ? "status-approved"

                        : booking.status ===
                          "Rejected"

                            ? "status-rejected"

                            : "status-pending"

                }">

                    ${escapeHtml(
                        booking.status ||
                        "Pending"
                    )}

                </span>


                <span class="payment-badge ${

                    paymentStatus ===
                    "Paid"

                        ? "payment-paid"

                        : paymentStatus ===
                          "Partially Paid"

                            ? "payment-partial"

                            : "payment-unpaid"

                }">

                    ${paymentStatus}

                </span>

            </div>


            <div class="details-grid">

                <div class="detail-item">

                    <span>
                        Customer
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.customerName ||
                            "Customer"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Email
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.customerEmail ||
                            "No email"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Event Date
                    </span>

                    <strong>
                        ${formatDate(
                            booking.eventDate
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Event End Time
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.eventEndTime ||
                            "18:00"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Guests
                    </span>

                    <strong>
                        ${Number(
                            booking.guests ||
                            0
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Location
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.location ||
                            "Not specified"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Requirements
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.requirements ||
                            "None"
                        )}
                    </strong>

                </div>


                <div class="detail-item">

                    <span>
                        Booked At
                    </span>

                    <strong>
                        ${formatDateTime(
                            booking.createdAt
                        )}
                    </strong>

                </div>

            </div>


            <div class="details-payment">

                <h3>
                    Payment Details
                </h3>


                <div class="payment-detail-grid">

                    <div>

                        <span>
                            Total Amount
                        </span>

                        <strong>
                            ${formatMoney(
                                totalAmount
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Amount Paid
                        </span>

                        <strong>
                            ${formatMoney(
                                amountPaid
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Amount Due
                        </span>

                        <strong
                            class="${
                                amountDue > 0
                                    ? "due-red"
                                    : "due-green"
                            }"
                        >
                            ${formatMoney(
                                amountDue
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Payment Method
                        </span>

                        <strong>
                            ${
                                amountPaid > 0
                                    ? "Razorpay"
                                    : "Not paid"
                            }
                        </strong>

                    </div>

                </div>


                ${
                    booking.razorpayPaymentId
                        ? `

                            <div class="payment-id">

                                <span>
                                    Razorpay Payment ID
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        booking.razorpayPaymentId
                                    )}
                                </strong>

                            </div>

                        `
                        : ""
                }

            </div>


            <div class="details-footer">

                <button
                    type="button"
                    id="detailsCloseBottom"
                    class="details-close-bottom"
                >
                    Close
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    const closeDetails =
        () => {

            overlay.remove();

        };


    document
        .getElementById(
            "detailsCloseButton"
        )
        ?.addEventListener(
            "click",
            closeDetails
        );


    document
        .getElementById(
            "detailsCloseBottom"
        )
        ?.addEventListener(
            "click",
            closeDetails
        );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                overlay
            ) {

                closeDetails();

            }

        }
    );


    const escapeHandler =
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeDetails();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

            }

        };


    document.addEventListener(
        "keydown",
        escapeHandler
    );

}


// =========================================================
// APPROVE BOOKING
// =========================================================

window.approveBooking =
    async function(
        bookingId,
        customerEmail,
        eventName
    ) {

        const confirmed =
            confirm(
                `Approve booking for "${eventName}"?`
            );


        if (!confirmed) {
            return;
        }


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


            // ================================================
            // SEND EMAIL
            // ================================================

            try {

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

                            body:
                                JSON.stringify({

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


                if (
                    !data.success
                ) {

                    window.showEventSphereMessage(
    "warning",
    "Email Not Sent",
    "Booking was approved, but the confirmation email could not be sent."
);

                    await loadBookings();

                    return;

                }

            }
            catch (emailError) {

                console.error(
                    "Approval email error:",
                    emailError
                );


                alert(
                    "Booking approved, but email could not be sent."
                );

                await loadBookings();

                return;

            }

           window.showEventSphereMessage(
    "success",
    "Booking Approved",
    "The booking has been approved successfully."
);

            await loadBookings();

        }
        catch (error) {

            console.error(
                "Approve Booking Error:",
                error
            );


            window.showEventSphereMessage(
    "error",
    "Approval Failed",
    error.message || "Unable to approve the booking."
);
        }

    };


// =========================================================
// REJECT BOOKING
// =========================================================

window.rejectBooking =
    async function(
        bookingId,
        customerEmail,
        eventName
    ) {


        const overlay =
            document.createElement(
                "div"
            );


        overlay.className =
            "reject-overlay";


        overlay.innerHTML = `

            <div class="reject-modal">

                <div class="reject-icon">

                    <i class="fa-solid fa-xmark"></i>

                </div>


                <h2>
                    Reject Booking
                </h2>


                <p>
                    Are you sure you want to reject
                    <strong>
                        ${escapeHtml(
                            eventName
                        )}
                    </strong>?
                </p>


                <label>
                    Reason for rejection
                    <span>*</span>
                </label>


                <textarea
                    id="rejectReasonInput"
                    placeholder="Enter the reason for rejection..."
                ></textarea>


                <div class="reject-actions">

                    <button
                        type="button"
                        id="cancelRejectButton"
                        class="keep-button"
                    >
                        Keep Booking
                    </button>


                    <button
                        type="button"
                        id="confirmRejectButton"
                        class="reject-confirm-button"
                    >
                        Reject Booking
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        const reasonInput =
            document.getElementById(
                "rejectReasonInput"
            );


        const cancelButton =
            document.getElementById(
                "cancelRejectButton"
            );


        const confirmButton =
            document.getElementById(
                "confirmRejectButton"
            );


        cancelButton.addEventListener(
            "click",
            () => {

                overlay.remove();

            }
        );


        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    overlay
                ) {

                    overlay.remove();

                }

            }
        );


        confirmButton.addEventListener(
            "click",
            async () => {

                const reason =
                    reasonInput.value.trim();


                if (!reason) {

                    window.showEventSphereMessage(
    "warning",
    "Reason Required",
    "Please enter a reason before rejecting the booking."
);
                    reasonInput.focus();

                    return;

                }


                try {

                    confirmButton.disabled =
                        true;

                    confirmButton.textContent =
                        "Rejecting...";


                    // =========================================
                    // UPDATE FIRESTORE
                    // =========================================

                    await updateDoc(
                        doc(
                            db,
                            "bookings",
                            bookingId
                        ),
                        {

                            status:
                                "Rejected",

                            cancelledBy:
                                "Admin",

                            cancellationReason:
                                reason,

                            cancelledAt:
                                new Date()

                        }
                    );


                    // =========================================
                    // SEND EMAIL
                    // =========================================

                    try {

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

                                    body:
                                        JSON.stringify({

                                            email:
                                                customerEmail,

                                            eventName:
                                                eventName,

                                            status:
                                                "Rejected",

                                            reason:
                                                reason

                                        })
                                }
                            );


                        const data =
                            await response.json();


                        overlay.remove();


                        if (
                            !data.success
                        ) {
                           
                            window.showEventSphereMessage(
    "warning",
    "Email Not Sent",
    "Booking was rejected, but the rejection email could not be sent."
);

                            await loadBookings();

                            return;

                        }

                    }
                    catch (emailError) {

                        console.error(
                            "Rejection email error:",
                            emailError
                        );


                        overlay.remove();


                     window.showEventSphereMessage(
    "warning",
    "Email Not Sent",
    "Booking was rejected, but the rejection email could not be sent."
);

                        await loadBookings();

                        return;

                    }


                    window.showEventSphereMessage(
    "success",
    "Booking Rejected",
    "The booking has been rejected successfully."
);

                    await loadBookings();

                }
                catch (error) {

                    console.error(
                        "Reject Booking Error:",
                        error
                    );


                    confirmButton.disabled =
                        false;

                    confirmButton.textContent =
                        "Reject Booking";


                     window.showEventSphereMessage(
        "error",
    "Rejection Failed",
    error.message || "Unable to reject the booking."
);

                }

            }
        );

    };


// =========================================================
// ADD REQUIRED STYLES
// =========================================================

const style =
    document.createElement(
        "style"
    );


style.textContent = `

/* =====================================================
   BOOKING TABLE
===================================================== */

.booking-table-wrapper {

    width: 100%;

    overflow-x: auto;

}


.booking-table {

    width: 100%;

    border-collapse: separate;

    border-spacing: 0;

    background: #ffffff;

    font-size: 13px;

}


.booking-table th {

    background: #f8fafc;

    color: #17336f;

    font-weight: 700;

    padding: 14px 12px;

    text-align: left;

    white-space: nowrap;

    border-bottom: 1px solid #e5eaf2;

}


.booking-table td {

    padding: 13px 12px;

    border-bottom: 1px solid #edf1f6;

    color: #334155;

    vertical-align: middle;

}


.booking-table tbody tr {

    transition: background 0.15s ease;

}


.booking-table tbody tr:hover {

    background: #f8fbff;

}


.number-cell {

    color: #64748b;

    font-weight: 700;

    width: 35px;

}


.center-cell {

    text-align: center;

}


.event-cell {

    display: flex;

    align-items: center;

    gap: 10px;

    min-width: 180px;

}


.event-image {

    width: 48px;

    height: 48px;

    min-width: 48px;

    border-radius: 9px;

    overflow: hidden;

    background: #eef4ff;

    display: flex;

    align-items: center;

    justify-content: center;

}


.event-image img {

    width: 100%;

    height: 100%;

    object-fit: cover;

}


.event-image-fallback {

    width: 100%;

    height: 100%;

    display: flex;

    align-items: center;

    justify-content: center;

    color: #2563eb;

    font-size: 18px;

}


.event-text {

    display: flex;

    flex-direction: column;

    gap: 3px;

}


.event-text strong {

    color: #17336f;

    font-size: 13px;

}


.event-text span {

    color: #71809a;

    font-size: 11px;

}


.customer-cell {

    display: flex;

    flex-direction: column;

    gap: 3px;

    min-width: 170px;

}


.customer-cell strong {

    color: #17336f;

    font-size: 13px;

}


.customer-cell span {

    color: #71809a;

    font-size: 11px;

}


.date-cell {

    display: flex;

    flex-direction: column;

    gap: 4px;

    white-space: nowrap;

}


.date-cell strong {

    color: #17336f;

    font-size: 12px;

}


.date-cell span {

    color: #71809a;

    font-size: 11px;

}


.date-cell i {

    margin-right: 4px;

    color: #2563eb;

}


.amount-cell {

    color: #17336f;

    white-space: nowrap;

}


.payment-badge,

.booking-badge {

    display: inline-flex;

    align-items: center;

    justify-content: center;

    padding: 6px 10px;

    border-radius: 20px;

    font-size: 11px;

    font-weight: 700;

    white-space: nowrap;

}


.payment-paid {

    background: #dcfce7;

    color: #15803d;

}


.payment-partial {

    background: #fef3c7;

    color: #b45309;

}


.payment-unpaid {

    background: #fee2e2;

    color: #dc2626;

}


.status-approved {

    background: #dcfce7;

    color: #15803d;

}


.status-pending {

    background: #fef3c7;

    color: #b45309;

}


.status-rejected {

    background: #fee2e2;

    color: #dc2626;

}


.table-actions {

    display: flex;

    align-items: center;

    gap: 6px;

}


.table-action {

    width: 32px;

    height: 32px;

    border: 1px solid #dbe5f3;

    border-radius: 7px;

    background: #ffffff;

    color: #2563eb;

    cursor: pointer;

    display: inline-flex;

    align-items: center;

    justify-content: center;

    transition: 0.15s ease;

}


.table-action:hover {

    background: #eff6ff;

    border-color: #2563eb;

}


.approve-action {

    color: #16a34a;

}


.approve-action:hover {

    background: #f0fdf4;

    border-color: #16a34a;

}


.reject-action {

    color: #dc2626;

}


.reject-action:hover {

    background: #fef2f2;

    border-color: #dc2626;

}


/* =====================================================
   LOADING / EMPTY
===================================================== */

.booking-loading,

.booking-error,

.booking-empty {

    padding: 45px 20px;

    text-align: center;

    color: #64748b;

}


.booking-error {

    color: #dc2626;

}


.booking-empty .empty-icon {

    width: 50px;

    height: 50px;

    margin: 0 auto 12px;

    border-radius: 12px;

    background: #eff6ff;

    color: #2563eb;

    display: flex;

    align-items: center;

    justify-content: center;

    font-size: 20px;

}


.booking-empty h3 {

    margin: 0 0 5px;

    color: #17336f;

}


.booking-empty p {

    margin: 0;

    font-size: 13px;

}


/* =====================================================
   VIEW DETAILS
===================================================== */

.booking-details-overlay {

    position: fixed;

    inset: 0;

    z-index: 99999;

    background: rgba(15, 23, 42, 0.55);

    display: flex;

    align-items: center;

    justify-content: center;

    padding: 20px;

}


.booking-details-modal {

    width: 100%;

    max-width: 720px;

    max-height: 90vh;

    overflow-y: auto;

    background: #ffffff;

    border-radius: 16px;

    box-shadow: 0 25px 70px rgba(15,23,42,0.25);

}


.details-header {

    display: flex;

    justify-content: space-between;

    align-items: flex-start;

    padding: 22px 24px;

    border-bottom: 1px solid #edf1f6;

}


.details-label {

    font-size: 10px;

    font-weight: 800;

    letter-spacing: 1px;

    color: #2563eb;

}


.details-header h2 {

    margin: 5px 0 0;

    color: #17336f;

    font-size: 21px;

}


.details-close {

    width: 34px;

    height: 34px;

    border: 1px solid #dbe5f3;

    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

}


.details-status-row {

    display: flex;

    gap: 8px;

    padding: 15px 24px;

    background: #f8fafc;

}


.details-grid {

    display: grid;

    grid-template-columns: repeat(2, 1fr);

    gap: 1px;

    background: #e9eef5;

    margin: 20px 24px;

    border: 1px solid #e9eef5;

}


.detail-item {

    background: #ffffff;

    padding: 13px;

    display: flex;

    flex-direction: column;

    gap: 5px;

}


.detail-item span {

    color: #71809a;

    font-size: 11px;

}


.detail-item strong {

    color: #17336f;

    font-size: 13px;

    word-break: break-word;

}


.details-payment {

    margin: 0 24px 20px;

    border: 1px solid #dce7f5;

    border-radius: 10px;

    padding: 16px;

    background: #f8fbff;

}


.details-payment h3 {

    margin: 0 0 13px;

    color: #17336f;

    font-size: 14px;

}


.payment-detail-grid {

    display: grid;

    grid-template-columns: repeat(4, 1fr);

    gap: 10px;

}


.payment-detail-grid > div {

    background: #ffffff;

    border: 1px solid #e3eaf4;

    border-radius: 8px;

    padding: 11px;

}


.payment-detail-grid span {

    display: block;

    color: #71809a;

    font-size: 10px;

    margin-bottom: 5px;

}


.payment-detail-grid strong {

    color: #17336f;

    font-size: 13px;

}


.due-red {

    color: #dc2626 !important;

}


.due-green {

    color: #16a34a !important;

}


.payment-id {

    margin-top: 10px;

    padding: 10px;

    border-radius: 8px;

    background: #ffffff;

    border: 1px solid #e3eaf4;

}


.payment-id span {

    display: block;

    color: #71809a;

    font-size: 10px;

    margin-bottom: 4px;

}


.payment-id strong {

    color: #17336f;

    font-size: 11px;

    word-break: break-all;

}


.details-footer {

    display: flex;

    justify-content: flex-end;

    padding: 15px 24px;

    border-top: 1px solid #edf1f6;

}


.details-close-bottom {

    border: none;

    border-radius: 8px;

    padding: 9px 18px;

    background: #17336f;

    color: #ffffff;

    cursor: pointer;

    font-weight: 700;

}


/* =====================================================
   REJECT MODAL
===================================================== */

.reject-overlay {

    position: fixed;

    inset: 0;

    z-index: 99999;

    background: rgba(15,23,42,0.55);

    display: flex;

    align-items: center;

    justify-content: center;

    padding: 20px;

}


.reject-modal {

    width: 100%;

    max-width: 430px;

    background: #ffffff;

    border-radius: 15px;

    padding: 24px;

    box-shadow: 0 25px 70px rgba(15,23,42,0.25);

}


.reject-icon {

    width: 45px;

    height: 45px;

    border-radius: 11px;

    background: #fff1f2;

    color: #dc2626;

    display: flex;

    align-items: center;

    justify-content: center;

    margin-bottom: 13px;

}


.reject-modal h2 {

    margin: 0 0 7px;

    color: #17336f;

    font-size: 20px;

}


.reject-modal p {

    margin: 0 0 17px;

    color: #64748b;

    font-size: 13px;

    line-height: 1.5;

}


.reject-modal label {

    display: block;

    margin-bottom: 7px;

    color: #334155;

    font-size: 12px;

    font-weight: 700;

}


.reject-modal label span {

    color: #dc2626;

}


.reject-modal textarea {

    width: 100%;

    min-height: 100px;

    box-sizing: border-box;

    resize: vertical;

    border: 1px solid #d8e1ed;

    border-radius: 9px;

    padding: 11px;

    outline: none;

    font-family: inherit;

    font-size: 13px;

}


.reject-modal textarea:focus {

    border-color: #2563eb;

}


.reject-actions {

    display: flex;

    justify-content: flex-end;

    gap: 8px;

    margin-top: 17px;

}


.keep-button,

.reject-confirm-button {

    border: none;

    border-radius: 8px;

    padding: 9px 14px;

    cursor: pointer;

    font-weight: 700;

    font-size: 12px;

}


.keep-button {

    background: #f1f5f9;

    color: #475569;

}


.reject-confirm-button {

    background: #dc2626;

    color: #ffffff;

}


@media (max-width: 800px) {

    .payment-detail-grid {

        grid-template-columns: repeat(2, 1fr);

    }

}


@media (max-width: 600px) {

    .details-grid {

        grid-template-columns: 1fr;

    }

    .payment-detail-grid {

        grid-template-columns: 1fr;

    }

    .booking-details-modal {

        max-height: 95vh;

    }

}

`;

document.head.appendChild(
    style
);


// =========================================================
// FIRST LOAD
// =========================================================

loadBookings();


// =========================================================
// AUTO REFRESH
// =========================================================

setInterval(
    () => {

        loadBookings();

    },
    30000
);


// =========================================================
// DATE RANGE + EXPORT
// =========================================================

let selectedStartDate = "";
let selectedEndDate = "";


// =========================================================
// FIND DATE BUTTON
// =========================================================

function getDateRangeButton() {

    const possibleButtons = [
        document.getElementById("dateRangeBtn"),
        document.getElementById("dateFilterBtn"),
        document.querySelector(".date-range-btn"),
        document.querySelector(".date-filter-btn")
    ];

    for (const button of possibleButtons) {

        if (button) {
            return button;
        }
    }


    // Find button containing date text
    const buttons =
        document.querySelectorAll("button");

    for (const button of buttons) {

        const text =
            button.textContent
                .trim()
                .toLowerCase();

        if (
            text.includes("sep") ||
            text.includes("2026") ||
            text.includes("date")
        ) {

            if (
                !text.includes("export") &&
                !text.includes("dashboard")
            ) {

                return button;
            }
        }
    }

    return null;
}


// =========================================================
// FIND EXPORT BUTTON
// =========================================================

function getExportButton() {

    const possibleButtons = [
        document.getElementById("exportBtn"),
        document.getElementById("exportBookingsBtn"),
        document.querySelector(".export-btn")
    ];

    for (const button of possibleButtons) {

        if (button) {
            return button;
        }
    }


    const buttons =
        document.querySelectorAll("button");

    for (const button of buttons) {

        if (
            button.textContent
                .trim()
                .toLowerCase()
                .includes("export")
        ) {

            return button;
        }
    }

    return null;
}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDateForDisplay(dateString) {

    if (!dateString) {
        return "";
    }

    const parts =
        dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    const year =
        parts[0];

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);

    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    return (
        String(day).padStart(2, "0") +
        " " +
        monthNames[month - 1] +
        " " +
        year
    );
}


// =========================================================
// CREATE DATE PICKER
// =========================================================

function openDatePicker() {

    if (
        document.getElementById(
            "adminDatePickerOverlay"
        )
    ) {
        return;
    }


    const overlay =
        document.createElement("div");

    overlay.id =
        "adminDatePickerOverlay";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 99999;
    `;


    overlay.innerHTML = `

        <div style="
            width:100%;
            max-width:420px;
            background:#ffffff;
            border-radius:16px;
            padding:24px;
            box-shadow:0 20px 60px rgba(15,23,42,0.20);
            box-sizing:border-box;
        ">

            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:20px;
            ">

                <h2 style="
                    margin:0;
                    font-size:20px;
                    color:#172554;
                ">
                    Select Date Range
                </h2>

                <button
                    type="button"
                    id="closeDatePicker"
                    style="
                        width:34px;
                        height:34px;
                        border:none;
                        border-radius:8px;
                        background:#f1f5f9;
                        color:#475569;
                        font-size:18px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>


            <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:14px;
            ">

                <div>

                    <label style="
                        display:block;
                        margin-bottom:7px;
                        font-size:13px;
                        font-weight:700;
                        color:#334155;
                    ">
                        Start Date
                    </label>

                    <input
                        type="date"
                        id="adminStartDate"
                        value="${selectedStartDate}"
                        style="
                            width:100%;
                            height:42px;
                            padding:0 10px;
                            border:1px solid #d8e0ec;
                            border-radius:9px;
                            box-sizing:border-box;
                            outline:none;
                            color:#172554;
                        "
                    >

                </div>


                <div>

                    <label style="
                        display:block;
                        margin-bottom:7px;
                        font-size:13px;
                        font-weight:700;
                        color:#334155;
                    ">
                        End Date
                    </label>

                    <input
                        type="date"
                        id="adminEndDate"
                        value="${selectedEndDate}"
                        style="
                            width:100%;
                            height:42px;
                            padding:0 10px;
                            border:1px solid #d8e0ec;
                            border-radius:9px;
                            box-sizing:border-box;
                            outline:none;
                            color:#172554;
                        "
                    >

                </div>

            </div>


            <div style="
                display:flex;
                justify-content:flex-end;
                gap:10px;
                margin-top:22px;
            ">

                <button
                    type="button"
                    id="clearDateRange"
                    style="
                        height:40px;
                        padding:0 16px;
                        border:1px solid #d8e0ec;
                        border-radius:8px;
                        background:#ffffff;
                        color:#475569;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Clear
                </button>


                <button
                    type="button"
                    id="applyDateRange"
                    style="
                        height:40px;
                        padding:0 18px;
                        border:none;
                        border-radius:8px;
                        background:#2563eb;
                        color:#ffffff;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Apply
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    // =====================================================
    // CLOSE
    // =====================================================

    document
        .getElementById("closeDatePicker")
        .addEventListener(
            "click",
            () => {
                overlay.remove();
            }
        );


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


    // =====================================================
    // CLEAR
    // =====================================================

    document
        .getElementById("clearDateRange")
        .addEventListener(
            "click",
            () => {

                selectedStartDate = "";
                selectedEndDate = "";

                updateDateButton();

                overlay.remove();

                displayBookings();
            }
        );


    // =====================================================
    // APPLY
    // =====================================================

    document
        .getElementById("applyDateRange")
        .addEventListener(
            "click",
            () => {

                const start =
                    document.getElementById(
                        "adminStartDate"
                    ).value;

                const end =
                    document.getElementById(
                        "adminEndDate"
                    ).value;


                if (
                    start &&
                    end &&
                    start > end
                ) {

                    alert(
                        "Start date cannot be after end date."
                    );

                    return;
                }


                selectedStartDate =
                    start;

                selectedEndDate =
                    end;


                updateDateButton();

                overlay.remove();

                displayBookings();
            }
        );
}


// =========================================================
// UPDATE DATE BUTTON TEXT
// =========================================================

function updateDateButton() {

    const button =
        getDateRangeButton();

    if (!button) {
        return;
    }


    if (
        selectedStartDate &&
        selectedEndDate
    ) {

        button.innerHTML = `
            <i class="fa-regular fa-calendar"></i>
            ${formatDateForDisplay(selectedStartDate)}
            -
            ${formatDateForDisplay(selectedEndDate)}
            <i class="fa-solid fa-chevron-down"></i>
        `;

        return;
    }


    if (selectedStartDate) {

        button.innerHTML = `
            <i class="fa-regular fa-calendar"></i>
            From ${formatDateForDisplay(selectedStartDate)}
            <i class="fa-solid fa-chevron-down"></i>
        `;

        return;
    }


    button.innerHTML = `
        <i class="fa-regular fa-calendar"></i>
        All Dates
        <i class="fa-solid fa-chevron-down"></i>
    `;
}


// =========================================================
// DATE FILTER
// =========================================================
//
// IMPORTANT:
// Add this condition inside the existing
// allBookings.filter((booking) => { ... })
// in displayBookings().
//
// Put it AFTER the payment filter.
//

function bookingMatchesDateRange(
    booking
) {

    const bookingDate =
        String(
            booking.eventDate || ""
        ).trim();


    if (!bookingDate) {

        return (
            !selectedStartDate &&
            !selectedEndDate
        );
    }


    if (
        selectedStartDate &&
        bookingDate < selectedStartDate
    ) {

        return false;
    }


    if (
        selectedEndDate &&
        bookingDate > selectedEndDate
    ) {

        return false;
    }


    return true;
}


// =========================================================
// EXPORT BOOKINGS
// =========================================================

function exportBookings() {

    const searchText =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    const filteredBookings =
        allBookings.filter(
            (booking) => {

                // STATUS
                if (
                    currentFilter !== "All" &&
                    booking.status !==
                        currentFilter
                ) {

                    return false;
                }


                // PAYMENT
                const isPaid =
                    booking.paymentStatus ===
                    "Paid";


                if (
                    currentPaymentFilter ===
                        "Paid" &&
                    !isPaid
                ) {

                    return false;
                }


                if (
                    currentPaymentFilter ===
                        "Unpaid" &&
                    isPaid
                ) {

                    return false;
                }


                // DATE
                if (
                    !bookingMatchesDateRange(
                        booking
                    )
                ) {

                    return false;
                }


                // SEARCH
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
                    eventName.includes(
                        searchText
                    ) ||
                    customerEmail.includes(
                        searchText
                    ) ||
                    location.includes(
                        searchText
                    ) ||
                    customerName.includes(
                        searchText
                    )
                );
            }
        );


    if (
        filteredBookings.length === 0
    ) {

        alert(
            "There are no bookings to export."
        );

        return;
    }


    // =====================================================
    // CSV HEADER
    // =====================================================

    const headers = [
        "Booking ID",
        "Event",
        "Customer",
        "Email",
        "Event Date",
        "Event End Time",
        "Guests",
        "Location",
        "Amount",
        "Payment Status",
        "Booking Status",
        "Booked At"
    ];


    const rows =
        filteredBookings.map(
            (booking) => {

                let bookedAt =
                    "Not available";


                if (
                    booking.createdAt &&
                    typeof booking.createdAt.toDate ===
                        "function"
                ) {

                    bookedAt =
                        booking.createdAt
                            .toDate()
                            .toLocaleString(
                                "en-IN"
                            );
                }


                return [
                    booking.id || "",
                    booking.eventName || "",
                    booking.customerName || "",
                    booking.customerEmail || "",
                    booking.eventDate || "",
                    booking.eventEndTime || "",
                    booking.guests || 0,
                    booking.location || "",
                    booking.price || 0,
                    booking.paymentStatus || "Unpaid",
                    booking.status || "Pending",
                    bookedAt
                ];
            }
        );


    // =====================================================
    // CREATE CSV
    // =====================================================

    const csvData = [
        headers,
        ...rows
    ]
        .map(
            row =>
                row
                    .map(
                        value =>
                            `"${String(value)
                                .replace(
                                    /"/g,
                                    '""'
                                )}"`
                    )
                    .join(",")
        )
        .join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csvData
            ],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );

    link.href = url;


    const today =
        new Date()
            .toISOString()
            .slice(0, 10);


    link.download =
        `EventSphere_Bookings_${today}.csv`;


    document.body.appendChild(
        link
    );

    link.click();

    document.body.removeChild(
        link
    );

    URL.revokeObjectURL(
        url
    );
}


// =========================================================
// CONNECT DATE BUTTON
// =========================================================

function setupDateButton() {

    const button =
        getDateRangeButton();

    if (!button) {
        return;
    }


    button.style.cursor =
        "pointer";


    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            openDatePicker();
        }
    );
}


// =========================================================
// CONNECT EXPORT BUTTON
// =========================================================

function setupExportButton() {

    const button =
        getExportButton();

    if (!button) {
        return;
    }


    button.style.cursor =
        "pointer";


    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            exportBookings();
        }
    );
}


// =========================================================
// START BUTTONS
// =========================================================

setTimeout(
    () => {

        setupDateButton();

        setupExportButton();

    },
    500
);