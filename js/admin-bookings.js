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


const bookingsContainer =
    document.getElementById("bookingsContainer");

const searchInput =
    document.getElementById("bookingSearch");


let allBookings = [];

let currentFilter = "All";
let currentPaymentFilter = "All";


// =========================================================
// LOAD BOOKINGS
// =========================================================

async function loadBookings() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "bookings")
            );

        const now = new Date();

        allBookings = [];


        // =====================================================
        // CHECK COMPLETED BOOKINGS
        // =====================================================

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


        // =====================================================
        // NEWEST FIRST
        // =====================================================

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


// =========================================================
// UPDATE BOOKING COUNTS
// =========================================================

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


// =========================================================
// DISPLAY BOOKINGS
// =========================================================

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


            // =================================================
            // STATUS FILTER
            // =================================================

            if (
                currentFilter !== "All" &&
                booking.status !== currentFilter
            ) {

                return false;

            }


            // =================================================
            // PAYMENT FILTER
            // =================================================

            const bookingTotal =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            const storedPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus === "Paid"

                        ? bookingTotal

                        : 0;


            const calculatedPaid =
                Math.max(
                    0,
                    Math.min(
                        storedPaid,
                        bookingTotal
                    )
                );


            const calculatedDue =
                Math.max(
                    0,
                    Number(
                        (
                            bookingTotal -
                            calculatedPaid
                        ).toFixed(2)
                    )
                );


            const actualPaymentStatus =
                calculatedDue <= 0

                    ? "Paid"

                    : calculatedPaid > 0

                        ? "Partially Paid"

                        : "Unpaid";


            if (
                currentPaymentFilter === "Paid" &&
                actualPaymentStatus !== "Paid"
            ) {

                return false;

            }


            if (
                currentPaymentFilter === "Unpaid" &&
                actualPaymentStatus !== "Unpaid"
            ) {

                return false;

            }


            // =================================================
            // SEARCH
            // =================================================

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


    // =========================================================
    // NO RESULTS
    // =========================================================

    if (filteredBookings.length === 0) {

        bookingsContainer.innerHTML =
            "<p>No bookings found.</p>";

        return;

    }


    // =========================================================
    // CREATE BOOKING CARDS
    // =========================================================

    filteredBookings.forEach((booking) => {

        const card =
            document.createElement("div");


        card.className =
            "booking-card";


        // =====================================================
        // BOOKING STATUS
        // =====================================================

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


        // =====================================================
        // ACTION BUTTONS
        // =====================================================

        let actionButtons = "";


        if (booking.status === "Pending") {

            actionButtons = `

                <div class="booking-actions">

                    <button
                        class="approve-btn"
                        onclick="approveBooking(
                            '${booking.id}',
                            '${booking.customerEmail || ""}',
                            '${booking.eventName || ""}'
                        )">

                        ✓ Approve

                    </button>


                    <button
                        class="reject-btn"
                        onclick="rejectBooking(
                            '${booking.id}',
                            '${booking.customerEmail || ""}',
                            '${booking.eventName || ""}'
                        )">

                        ✕ Reject

                    </button>

                </div>

            `;

        }


        // =====================================================
        // BOOKED DATE
        // =====================================================

        let bookedAt =
            "Not available";


        if (
            booking.createdAt &&
            typeof booking.createdAt.toDate === "function"
        ) {

            bookedAt =
                booking.createdAt
                    .toDate()
                    .toLocaleString();

        }


        // =====================================================
        // PAYMENT INFORMATION
        // =====================================================

        const bookingAmount =
            Number(
                booking.price ||
                booking.amount ||
                booking.totalAmount ||
                0
            );


        // =====================================================
        // SUPPORT OLD BOOKINGS
        // =====================================================

        const storedAmountPaid =
            booking.amountPaid !== undefined

                ? Number(
                    booking.amountPaid || 0
                )

                : booking.paymentStatus === "Paid"

                    ? bookingAmount

                    : 0;


        // =====================================================
        // SAFE AMOUNT PAID
        // =====================================================

        const amountPaid =
            Math.max(
                0,
                Math.min(
                    storedAmountPaid,
                    bookingAmount
                )
            );


        // =====================================================
        // AMOUNT DUE
        // =====================================================

        const amountDue =
            Math.max(
                0,
                Number(
                    (
                        bookingAmount -
                        amountPaid
                    ).toFixed(2)
                )
            );


        // =====================================================
        // ACTUAL PAYMENT STATUS
        // =====================================================

        const actualPaymentStatus =
            amountDue <= 0

                ? "Paid"

                : amountPaid > 0

                    ? "Partially Paid"

                    : "Unpaid";


        // =====================================================
        // PAYMENT STATUS CLASS
        // =====================================================

        const paymentStatusClass =
            actualPaymentStatus === "Paid" ||
            actualPaymentStatus === "Partially Paid"

                ? "payment-paid"

                : "payment-unpaid";


        // =====================================================
        // PAYMENT DATE
        // =====================================================

        let paymentDate =
            "Not paid";


        if (
            amountPaid > 0 &&
            booking.paidAt &&
            typeof booking.paidAt.toDate === "function"
        ) {

            paymentDate =
                booking.paidAt
                    .toDate()
                    .toLocaleString("en-IN");

        }


        // =====================================================
        // CARD HTML
        // =====================================================

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


            <!-- =================================================
                 PAYMENT DETAILS
                 ================================================= -->

            <div class="payment-details-box">

                <div class="payment-details-title">
                    Payment Details
                </div>


                <div class="payment-details-grid">


                    <!-- TOTAL AMOUNT -->

                    <div class="payment-info">

                        <strong>
                            Total Amount
                        </strong>

                        <span>
                            ₹${bookingAmount.toLocaleString("en-IN")}
                        </span>

                    </div>


                    <!-- PAYMENT STATUS -->

                    <div class="payment-info">

                        <strong>
                            Payment Status
                        </strong>

                        <span
                            class="payment-status ${paymentStatusClass}"
                        >

                            ${actualPaymentStatus}

                        </span>

                    </div>


                    <!-- AMOUNT PAID -->

                    <div class="payment-info">

                        <strong>
                            Amount Paid
                        </strong>

                        <span>

                            ₹${amountPaid.toLocaleString("en-IN")}

                        </span>

                    </div>


                    <!-- AMOUNT DUE -->

                    <div class="payment-info">

                        <strong>
                            Amount Due
                        </strong>

                        <span
                            style="
                                font-weight:800;
                                ${
                                    amountDue > 0
                                        ? "color:#dc2626;"
                                        : "color:#16a34a;"
                                }
                            "
                        >

                            ₹${amountDue.toLocaleString("en-IN")}

                        </span>

                    </div>


                    <!-- PAYMENT METHOD -->

                    <div class="payment-info">

                        <strong>
                            Payment Method
                        </strong>

                        <span>

                            ${
                                amountPaid > 0
                                    ? "Razorpay"
                                    : "Not paid"
                            }

                        </span>

                    </div>


                    <!-- PAYMENT DATE -->

                    <div class="payment-info">

                        <strong>
                            Payment Date & Time
                        </strong>

                        <span>

                            ${paymentDate}

                        </span>

                    </div>


                    <!-- PAYMENT ID -->

                    <div class="payment-info">

                        <strong>
                            Razorpay Payment ID
                        </strong>

                        <span>

                            ${
                                booking.razorpayPaymentId ||
                                "Not available"
                            }

                        </span>

                    </div>


                    <!-- ORDER ID -->

                    <div class="payment-info">

                        <strong>
                            Razorpay Order ID
                        </strong>

                        <span>

                            ${
                                booking.razorpayOrderId ||
                                "Not available"
                            }

                        </span>

                    </div>


                </div>


                ${
                    actualPaymentStatus === "Partially Paid"

                        ? `

                            <div style="
                                margin-top:12px;
                                padding:10px 12px;
                                border-radius:8px;
                                background:#fff7ed;
                                color:#c2410c;
                                font-size:13px;
                                font-weight:700;
                            ">

                                <i class="fa-solid fa-circle-info"></i>

                                Customer has paid
                                ₹${amountPaid.toLocaleString("en-IN")}
                                out of
                                ₹${bookingAmount.toLocaleString("en-IN")}.

                                Remaining:
                                ₹${amountDue.toLocaleString("en-IN")}

                            </div>

                        `

                        : ""

                }

            </div>


            ${actionButtons}

        `;


        bookingsContainer.appendChild(card);

    });


    updateActiveFilterButton();

    updatePaymentFilterButton();

}


// =========================================================
// STATUS FILTER
// =========================================================

window.filterBookings =
    function (filter) {

        currentFilter =
            filter;

        displayBookings();

    };


// =========================================================
// PAYMENT FILTER
// =========================================================

window.filterPaymentBookings =
    function (filter) {

        currentPaymentFilter =
            filter;

        displayBookings();

    };


// =========================================================
// PAYMENT FILTER BUTTON ACTIVE STATE
// =========================================================

function updatePaymentFilterButton() {

    const buttons =
        document.querySelectorAll(
            ".payment-filter-btn"
        );


    buttons.forEach((button) => {

        button.classList.remove(
            "active-payment-filter"
        );


        if (
            button.textContent.trim() ===
            currentPaymentFilter
        ) {

            button.classList.add(
                "active-payment-filter"
            );

        }

    });

}


// =========================================================
// STATUS FILTER BUTTON ACTIVE STATE
// =========================================================

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


        if (
            text === currentFilter
        ) {

            button.classList.add(
                "active-filter"
            );

        }

    });

}


// =========================================================
// SEARCH
// =========================================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            displayBookings();

        }
    );

}


// =========================================================
// APPROVE BOOKING
// =========================================================

window.approveBooking =
    async function (
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


            // =================================================
            // SEND APPROVAL EMAIL
            // =================================================

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

            console.error(
                "Approve Booking Error:",
                error
            );


            alert(
                error.message ||
                "Unable to approve booking."
            );

        }

    };


// =========================================================
// REJECT BOOKING
// =========================================================

window.rejectBooking =
    async function (
        bookingId,
        customerEmail,
        eventName
    ) {


        // =====================================================
        // CREATE OVERLAY
        // =====================================================

        const overlay =
            document.createElement("div");


        overlay.id =
            "adminRejectOverlay";


        overlay.style.cssText = `

            position:fixed;
            inset:0;
            background:rgba(15,23,42,0.55);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
            z-index:9999;
            backdrop-filter:blur(4px);

        `;


        overlay.innerHTML = `

            <div style="

                width:100%;
                max-width:440px;
                background:#ffffff;
                border-radius:18px;
                padding:28px;
                box-sizing:border-box;
                box-shadow:0 20px 50px rgba(15,23,42,0.22);

            ">


                <div style="

                    width:50px;
                    height:50px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:14px;
                    background:#fff1f2;
                    color:#dc2626;
                    font-size:21px;
                    margin-bottom:15px;

                ">

                    ✕

                </div>


                <h2 style="

                    margin:0 0 7px;
                    color:#172554;
                    font-size:23px;

                ">

                    Reject Booking

                </h2>


                <p style="

                    margin:0 0 20px;
                    color:#64748b;
                    font-size:14px;

                ">

                    Are you sure you want to reject
                    <strong>${eventName}</strong>?

                </p>


                <label style="

                    display:block;
                    margin-bottom:7px;
                    color:#334155;
                    font-size:14px;
                    font-weight:700;

                ">

                    Reason for rejection

                    <span style="color:#dc2626;">
                        *
                    </span>

                </label>


                <textarea
                    id="adminRejectReason"
                    placeholder="Please enter the reason for rejecting this booking..."
                    style="

                        width:100%;
                        min-height:100px;
                        padding:12px 13px;
                        box-sizing:border-box;
                        border:1px solid #d5dce8;
                        border-radius:10px;
                        resize:vertical;
                        outline:none;
                        font-family:inherit;
                        font-size:14px;
                        color:#172554;
                        background:#fbfcff;

                    "
                ></textarea>


                <div style="

                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    margin-top:20px;

                ">


                    <button
                        type="button"
                        id="closeAdminReject"
                        style="

                            height:40px;
                            padding:0 17px;
                            border:none;
                            border-radius:8px;
                            background:#f1f5f9;
                            color:#475569;
                            font-size:14px;
                            font-weight:700;
                            cursor:pointer;

                        "
                    >

                        Keep Booking

                    </button>


                    <button
                        type="button"
                        id="confirmAdminReject"
                        style="

                            height:40px;
                            padding:0 17px;
                            border:none;
                            border-radius:8px;
                            background:#dc2626;
                            color:#ffffff;
                            font-size:14px;
                            font-weight:700;
                            cursor:pointer;

                        "
                    >

                        ✕ Reject Booking

                    </button>


                </div>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        // =====================================================
        // GET ELEMENTS
        // =====================================================

        const reasonInput =
            document.getElementById(
                "adminRejectReason"
            );


        const closeButton =
            document.getElementById(
                "closeAdminReject"
            );


        const confirmButton =
            document.getElementById(
                "confirmAdminReject"
            );


        // =====================================================
        // CLOSE BUTTON
        // =====================================================

        closeButton.addEventListener(
            "click",
            () => {

                overlay.remove();

            }
        );


        // =====================================================
        // CLICK OUTSIDE
        // =====================================================

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
        // CONFIRM REJECTION
        // =====================================================

        confirmButton.addEventListener(
            "click",
            async () => {


                const reason =
                    reasonInput.value.trim();


                if (!reason) {

                    alert(
                        "Please enter a reason for rejection."
                    );

                    reasonInput.focus();

                    return;

                }


                try {

                    confirmButton.disabled =
                        true;


                    confirmButton.innerHTML =
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
                    // SEND REJECTION EMAIL
                    // =========================================

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

                    console.error(
                        "Reject Booking Error:",
                        error
                    );


                    confirmButton.disabled =
                        false;


                    confirmButton.innerHTML =
                        "✕ Reject Booking";


                    alert(
                        error.message ||
                        "Unable to reject booking."
                    );

                }

            }
        );

    };

    // =========================================================
// FIRST LOAD
// =========================================================

loadBookings();


// =========================================================
// AUTO REFRESH EVERY 30 SECONDS
// =========================================================

setInterval(
    () => {

        loadBookings();

    },
    30000
);