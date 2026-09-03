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

    const user = auth.currentUser;

    if (!user) {
        window.location.href = "customer-login.html";
        return;
    }

    const emailElement =
        document.getElementById("customerEmail");

    if (emailElement) {
        emailElement.textContent =
            user.email || "Customer";
    }

    try {

        const q = query(
            collection(db, "bookings"),
            where("customerId", "==", user.uid)
        );

        const snapshot =
            await getDocs(q);

        container.innerHTML = "";

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


        // =====================================================
        // LOOP THROUGH BOOKINGS
        // =====================================================

        for (const bookingDoc of snapshot.docs) {

            const booking =
                bookingDoc.data();

            const status =
                booking.status || "Pending";

            const bookingId =
                "#BK-" +
                bookingDoc.id
                    .substring(0, 6)
                    .toUpperCase();


            // =================================================
            // PAYMENT CALCULATION
            // =================================================

            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            // Support old bookings where amountPaid
            // does not exist yet.

            const storedAmountPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus ===
                        "Paid"

                        ? totalAmount

                        : 0;


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        storedAmountPaid,
                        totalAmount
                    )
                );


            const amountDue =
                Math.max(
                    0,
                    Number(
                        (
                            totalAmount -
                            amountPaid
                        ).toFixed(2)
                    )
                );


            const actualPaymentStatus =
                amountDue <= 0

                    ? "Paid"

                    : amountPaid > 0

                        ? "Partially Paid"

                        : "Unpaid";


           // =================================================
// PAYMENT HISTORY
// =================================================

let paymentHistory = [];

try {

    const paymentSnapshot =
        await getDocs(
            collection(
                db,
                "bookings",
                bookingDoc.id,
                "payments"
            )
        );

    paymentHistory =
        paymentSnapshot.docs
            .map((paymentDoc) => ({
                id: paymentDoc.id,
                ...paymentDoc.data()
            }))
            .sort((a, b) => {

                const timeA =
                    a.paidAt?.toMillis
                        ? a.paidAt.toMillis()
                        : 0;

                const timeB =
                    b.paidAt?.toMillis
                        ? b.paidAt.toMillis()
                        : 0;

                return timeA - timeB;

            });

}
catch (historyError) {

    console.error(
        "Payment History Error:",
        historyError
    );

}


// =================================================
// FALLBACK FOR OLD PAYMENTS
// =================================================

if (
    paymentHistory.length === 0 &&
    amountPaid > 0
) {

    paymentHistory = [
        {
            id:
                booking.razorpayPaymentId ||
                "previous-payment",

            amount:
                amountPaid,

            paymentMethod:
                booking.paymentMethod ||
                "Razorpay",

            paymentVpa:
                booking.paymentVpa ||
                null,

            bankName:
                booking.bankName ||
                null,

            cardIssuer:
                booking.cardIssuer ||
                null,

            razorpayPaymentId:
                booking.razorpayPaymentId ||
                null,

            razorpayOrderId:
                booking.razorpayOrderId ||
                null,

            paidAt:
                booking.paidAt ||
                null
        }
    ];

}

            // =================================================
            // PAYMENT PROGRESS
            // =================================================

            const paymentProgress =
                totalAmount > 0
                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (amountPaid / totalAmount) * 100
                        )
                    )
                    : 0;
// your existing paymentHistory code above
// ...

// 👇 PASTE THE NEW CODE HERE

for (const payment of paymentHistory) {
    const paymentId =
        payment.razorpayPaymentId || payment.id;

    const hasPaymentDetails =
        payment.bankName ||
        payment.cardIssuer ||
        payment.paymentVpa ||
        payment.paymentWallet ||
        payment.cardNetwork;

    if (
        paymentId &&
        !hasPaymentDetails &&
        paymentId.startsWith("pay_")
    ) {
        try {
            const user = auth.currentUser;

            if (user) {
                const idToken = await user.getIdToken();

                const response = await fetch(
                    `https://eventsphere-dndh.onrender.com/payment-details/${encodeURIComponent(bookingDoc.id)}/${encodeURIComponent(paymentId)}`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${idToken}`
                        }
                    }
                );

                const details = await response.json();

                if (response.ok && details.success) {

                    payment.paymentMethod =
                        payment.paymentMethod ||
                        details.paymentMethod ||
                        null;

                    payment.bankName =
                        payment.bankName ||
                        details.bankName ||
                        null;

                    payment.paymentVpa =
                        payment.paymentVpa ||
                        details.paymentVpa ||
                        null;

                    payment.paymentWallet =
                        payment.paymentWallet ||
                        details.paymentWallet ||
                        null;

                    payment.cardNetwork =
                        payment.cardNetwork ||
                        details.cardNetwork ||
                        null;

                    payment.cardLast4 =
                        payment.cardLast4 ||
                        details.cardLast4 ||
                        null;

                    payment.cardIssuer =
                        payment.cardIssuer ||
                        details.cardIssuer ||
                        null;
                }
            }

        } catch (paymentDetailsError) {
            console.error(
                "Unable to load old payment details:",
                paymentDetailsError
            );
        }
    }
}






            // =================================================
            // PAYMENT HISTORY HTML
            // =================================================

            const paymentHistoryHtml =
                paymentHistory.length > 0

                    ? paymentHistory
                        .map((payment, index) => {

                            const historyDate =
                                payment.paidAt?.toDate
                                    ? payment.paidAt
                                        .toDate()
                                        .toLocaleString("en-IN")
                                    : "Date not available";


                            const method =
                                payment.paymentMethod
                                    ? String(
                                        payment.paymentMethod
                                    ).toUpperCase()
                                    : "RAZORPAY";


                            const bank =
                                payment.bankName ||
                                payment.cardIssuer ||
                                "Not provided";


                            const bankLabel =
                                payment.paymentMethod ===
                                "upi"

                                    ? (
                                        payment.paymentVpa ||
                                        bank
                                    )

                                    : bank;


                            return `
                                <div style="
                                    padding:12px 0;
                                    border-bottom:${
                                        index <
                                        paymentHistory.length - 1
                                            ? "1px solid #e5e7eb"
                                            : "none"
                                    };
                                ">

                                    <div style="
                                        display:flex;
                                        justify-content:space-between;
                                        align-items:center;
                                        gap:12px;
                                        margin-bottom:6px;
                                    ">

                                        <strong style="
                                            color:#172554;
                                        ">
                                            Payment ${index + 1}
                                        </strong>

                                        <strong style="
                                            color:#15803d;
                                        ">
                                            ₹${Number(
                                                payment.amount || 0
                                            ).toLocaleString("en-IN")}
                                        </strong>

                                    </div>


                                    <div style="
                                        display:grid;
                                        grid-template-columns:
                                            repeat(
                                                2,
                                                minmax(0,1fr)
                                            );
                                        gap:5px 15px;
                                        color:#64748b;
                                        font-size:12px;
                                    ">

                                        <span>
                                            📅 ${historyDate}
                                        </span>

                                        <span>
                                            💳 ${method}
                                        </span>

                                        <span>
                                            🏦 Bank / Issuer:
                                            ${bankLabel}
                                        </span>

                                        <span style="
                                            word-break:break-all;
                                        ">
                                            🆔 ${
                                                payment.razorpayPaymentId ||
                                                payment.id
                                            }
                                        </span>

                                    </div>

                                </div>
                            `;

                        })
                        .join("")

                    : `
                        <div style="
                            color:#94a3b8;
                            font-size:13px;
                        ">
                            No payment history available yet.
                        </div>
                    `;


            // =================================================
            // PAYMENT BUTTON
            // =================================================

            let paymentButton = "";

            if (
                status === "Approved" &&
                amountDue > 0
            ) {

                const buttonText =
                    amountPaid > 0
                        ? "Pay Remaining"
                        : "Pay Now";


                paymentButton = `
                    <button
                        type="button"
                        class="pay-now-btn"
                        onclick="
                            payForBooking(
                                '${bookingDoc.id}'
                            )
                        ">

                        <i class="fa-solid fa-credit-card"></i>

                        ${buttonText}

                    </button>
                `;
            }


            // =================================================
            // PAYMENT LABEL
            // =================================================

            let paidLabel = "";


            if (
                actualPaymentStatus ===
                "Paid"
            ) {

                paidLabel = `
                    <span class="booking-paid-label">

                        <i class="fa-solid fa-circle-check"></i>

                        Paid

                    </span>
                `;

            }

            else if (
                actualPaymentStatus ===
                "Partially Paid"
            ) {

                paidLabel = `
                    <span
                        class="booking-paid-label"
                        style="
                            display:inline-flex;
                            align-items:center;
                            gap:7px;
                            padding:7px 12px;
                            border-radius:20px;
                            background:#fff7ed;
                            border:1px solid #fed7aa;
                            color:#c2410c;
                            font-size:13px;
                            font-weight:700;
                            white-space:nowrap;
                            line-height:1;
                        ">

                        <i
                            class="fa-solid fa-circle-half-stroke"
                            style="font-size:12px;">
                        </i>

                        <span>
                            Partially Paid
                        </span>

                        <span
                            style="
                                color:#9a3412;
                                font-weight:600;
                            ">
                            • Due ₹${amountDue.toLocaleString("en-IN")}
                        </span>

                    </span>
                `;

            }


            // =================================================
            // STATUS
            // =================================================

            let statusText =
                "◷ Pending";


            if (
                status ===
                "Approved"
            ) {

                statusText =
                    "✓ Approved";
            }

            else if (
                status ===
                "Cancelled"
            ) {

                statusText =
                    "✕ Cancelled";
            }

            else if (
                status ===
                "Rejected"
            ) {

                statusText =
                    "✕ Rejected";
            }


            // =================================================
            // BOOKING CARD
            // =================================================

            const card =
                document.createElement("div");

            card.className =
                "modern-booking-card";


            card.innerHTML = `

                <img
                    src="${
                        booking.eventImage ||
                        "images/hero.jpg"
                    }"
                    class="booking-event-image"
                    alt="Event"
                    onerror="
                        this.src='images/hero.jpg'
                    "
                >


                <div class="booking-main">

                    <div class="booking-id-label">
                        BOOKING ID
                    </div>

                    <div class="booking-id-value">
                        ${bookingId}
                    </div>


                    <h2>
                        ${
                            booking.eventName ||
                            "Event"
                        }
                        🎉
                    </h2>


                    <div class="booking-details">


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                📅
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Event Date
                                </small>

                                <strong>
                                    ${
                                        booking.eventDate ||
                                        "Not specified"
                                    }
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                👥
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Guests
                                </small>

                                <strong>
                                    ${
                                        booking.guests ||
                                        0
                                    }
                                    People
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                📍
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Location
                                </small>

                                <strong>
                                    ${
                                        booking.location ||
                                        "Not specified"
                                    }
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                ₹
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Total Price
                                </small>

                                <strong>
                                    ₹${totalAmount.toLocaleString("en-IN")}
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                💰
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Amount Paid
                                </small>

                                <strong>
                                    ₹${amountPaid.toLocaleString("en-IN")}
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                💳
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Amount Due
                                </small>

                                <strong>
                                    ₹${amountDue.toLocaleString("en-IN")}
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                📝
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Requirements
                                </small>

                                <strong>
                                    ${
                                        booking.requirements ||
                                        "None"
                                    }
                                </strong>

                            </div>

                        </div>


                        <div class="booking-detail">

                            <div class="booking-detail-icon">
                                🕐
                            </div>

                            <div class="booking-detail-content">

                                <small>
                                    Event End Time
                                </small>

                                <strong>
                                    ${
                                        booking.eventEndTime ||
                                        "Not specified"
                                    }
                                </strong>

                            </div>

                        </div>


                    </div>

                </div>


                <div class="
                    booking-status
                    ${status.toLowerCase()}
                ">
                    ${statusText}
                </div>


                <!-- PAYMENT PROGRESS -->

                <div style="
                    margin:0 20px 18px;
                    padding:15px;
                    border:1px solid #e2e8f0;
                    border-radius:10px;
                    background:#f8fafc;
                ">

                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:10px;
                        margin-bottom:8px;
                    ">

                        <strong style="
                            color:#172554;
                        ">
                            Payment Progress
                        </strong>

                        <strong style="
                            color:#18366f;
                        ">
                            ${paymentProgress.toFixed(0)}%
                        </strong>

                    </div>


                    <div style="
                        height:9px;
                        background:#e2e8f0;
                        border-radius:20px;
                        overflow:hidden;
                    ">

                        <div style="
                            height:100%;
                            width:${paymentProgress}%;
                            background:#2563eb;
                            border-radius:20px;
                            transition:width .3s ease;
                        "></div>

                    </div>


                    <div style="
                        display:flex;
                        justify-content:space-between;
                        gap:10px;
                        margin-top:8px;
                        font-size:12px;
                        color:#64748b;
                    ">

                        <span>
                            Paid:
                            <strong style="
                                color:#15803d;
                            ">
                                ₹${amountPaid.toLocaleString("en-IN")}
                            </strong>
                        </span>

                        <span>
                            Due:
                            <strong style="
                                color:${
                                    amountDue > 0
                                        ? "#dc2626"
                                        : "#15803d"
                                };
                            ">
                                ₹${amountDue.toLocaleString("en-IN")}
                            </strong>
                        </span>

                    </div>

                </div>


                <!-- PAYMENT HISTORY -->

                <div style="
                    margin:0 20px 18px;
                    padding:15px;
                    border:1px solid #e2e8f0;
                    border-radius:10px;
                    background:#ffffff;
                ">

                    <div style="
                        font-weight:800;
                        color:#172554;
                        margin-bottom:2px;
                    ">

                        <i class="
                            fa-solid
                            fa-clock-rotate-left
                        "></i>

                        Payment History

                    </div>


                    <div style="
                        font-size:11px;
                        color:#94a3b8;
                        margin-bottom:6px;
                    ">
                        Each installment is shown separately.
                    </div>


                    ${paymentHistoryHtml}

                </div>


                <div class="booking-bottom">


                    <button
                        type="button"
                        class="view-details-btn"
                        onclick="
                            viewBookingDetails(
                                '${bookingDoc.id}'
                            )
                        ">

                        👁 View Details

                    </button>


                    ${
                        status === "Pending"
                            ? `

                                <button
                                    type="button"
                                    class="
                                        customer-cancel-booking-btn
                                    "
                                    onclick="
                                        cancelCustomerBooking(
                                            '${bookingDoc.id}'
                                        )
                                    ">

                                    <i class="
                                        fa-solid
                                        fa-xmark
                                    "></i>

                                    Cancel Booking

                                </button>

                            `
                            : ""
                    }


                    ${paymentButton}


                    ${paidLabel}


                    ${
                        actualPaymentStatus === "Paid"
                            ? `

                                <button
                                    type="button"
                                    class="
                                        download-receipt-btn
                                    "
                                    onclick="
                                        previewPaymentReceipt(
                                            '${bookingDoc.id}'
                                        )
                                    ">

                                    <i class="
                                        fa-solid
                                        fa-file-pdf
                                    "></i>

                                    Preview Receipt

                                </button>

                            `
                            : ""
                    }


                </div>

            `;


            container.appendChild(card);

        }

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
// PAY FOR BOOKING
// =========================================================

window.payForBooking =
    async function (bookingId) {

        try {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );

                window.location.href =
                    "customer-login.html";

                return;
            }


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
                    "Booking not found."
                );

                return;
            }


            const booking =
                bookingSnapshot.data();


            if (
                booking.customerId !==
                user.uid
            ) {

                alert(
                    "You cannot pay for this booking."
                );

                return;
            }


            if (
                booking.status !==
                "Approved"
            ) {

                alert(
                    "Payment is available only after admin approval."
                );

                return;
            }


            // =================================================
            // CALCULATE CURRENT DUE
            // =================================================

            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            const storedAmountPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus ===
                        "Paid"

                        ? totalAmount

                        : 0;


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        storedAmountPaid,
                        totalAmount
                    )
                );


            const amountDue =
                Math.max(
                    0,
                    Number(
                        (
                            totalAmount -
                            amountPaid
                        ).toFixed(2)
                    )
                );


            if (
                amountDue <= 0 ||
                booking.paymentStatus ===
                    "Paid"
            ) {

                alert(
                    "This booking has already been fully paid."
                );

                return;
            }


            // =================================================
            // OPEN PAYMENT PAGE
            // =================================================

            window.location.href =
                `payment.html?bookingId=${encodeURIComponent(
                    bookingId
                )}`;

        }

        catch (error) {

            console.error(
                "Payment Error:",
                error
            );

            alert(
                "Unable to open payment page."
            );

        }

    };


// =========================================================
// LOAD JSPDF
// =========================================================

function loadJsPDF() {

    return new Promise(
        (resolve, reject) => {

            if (
                window.jspdf &&
                window.jspdf.jsPDF
            ) {

                resolve(
                    window.jspdf.jsPDF
                );

                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";


            script.onload = () => {

                if (
                    window.jspdf &&
                    window.jspdf.jsPDF
                ) {

                    resolve(
                        window.jspdf.jsPDF
                    );

                }

                else {

                    reject(
                        new Error(
                            "Unable to load PDF generator."
                        )
                    );

                }

            };


            script.onerror = () => {

                reject(
                    new Error(
                        "Unable to load PDF generator."
                    )
                );

            };


            document.head.appendChild(
                script
            );

        }
    );

}


// =========================================================
// DOWNLOAD PAYMENT RECEIPT
// =========================================================

window.downloadPaymentReceipt =
    async function (bookingId) {

        try {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );

                return;
            }


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
                    "Booking not found."
                );

                return;
            }


            const booking =
                bookingSnapshot.data();


            if (
                booking.customerId !==
                user.uid
            ) {

                alert(
                    "You cannot access this booking."
                );

                return;
            }


            const jsPDF =
                await loadJsPDF();


            const pdf =
                new jsPDF();


            const eventName =
                booking.eventName ||
                "Event";


            const eventDate =
                booking.eventDate ||
                "Not specified";


            const guests =
                booking.guests ||
                "Not specified";


            const location =
                booking.location ||
                "Not specified";


            const totalPrice =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            const storedAmountPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus ===
                        "Paid"

                        ? totalPrice

                        : 0;


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        storedAmountPaid,
                        totalPrice
                    )
                );


            const amountDue =
                Math.max(
                    0,
                    Number(
                        (
                            totalPrice -
                            amountPaid
                        ).toFixed(2)
                    )
                );


            const paymentStatus =
                amountDue <= 0
                    ? "Paid"
                    : amountPaid > 0
                        ? "Partially Paid"
                        : "Unpaid";


            const customerDoc =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    )
                );


            const customerName =
                (
                    customerDoc.exists() &&
                    customerDoc.data().fullName
                ) ||
                booking.customerName ||
                user.displayName ||
                "Customer";


            const customerEmail =
                booking.customerEmail ||
                user.email ||
                "Not available";


            const paymentId =
                booking.razorpayPaymentId ||
                booking.paymentId ||
                "Not available";


            const orderId =
                booking.razorpayOrderId ||
                "Not available";


            const receiptDate =
                new Date().toLocaleString(
                    "en-IN"
                );


            const bookingDisplayId =
                "#BK-" +
                bookingId
                    .substring(0, 6)
                    .toUpperCase();


            // =================================================
            // HEADER
            // =================================================

            pdf.setFillColor(
                24,
                54,
                111
            );


            pdf.rect(
                0,
                0,
                210,
                38,
                "F"
            );


            pdf.setTextColor(
                255,
                255,
                255
            );


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(23);


            pdf.text(
                "EventSphere",
                20,
                17
            );


            pdf.setFontSize(14);


            pdf.text(
                "PAYMENT RECEIPT",
                20,
                28
            );


            pdf.setFontSize(9);


            pdf.text(
                bookingDisplayId,
                190,
                17,
                {
                    align: "right"
                }
            );


            pdf.setTextColor(
                23,
                37,
                84
            );


            // =================================================
            // PAYMENT STATUS
            // =================================================

            pdf.setFontSize(12);

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.text(
                `PAYMENT STATUS: ${paymentStatus.toUpperCase()}`,
                105,
                52,
                {
                    align: "center"
                }
            );


            // =================================================
            // CUSTOMER
            // =================================================

            pdf.setFontSize(13);


            pdf.text(
                "Customer Information",
                20,
                70
            );


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(10);


            pdf.text(
                `Name: ${customerName}`,
                20,
                81
            );


            pdf.text(
                `Email: ${customerEmail}`,
                20,
                90
            );


            // =================================================
            // EVENT
            // =================================================

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(13);


            pdf.text(
                "Event Information",
                20,
                110
            );


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(10);


            pdf.text(
                `Event: ${eventName}`,
                20,
                121
            );


            pdf.text(
                `Event Date: ${eventDate}`,
                20,
                131
            );


            pdf.text(
                `Guests: ${guests}`,
                20,
                141
            );


            pdf.text(
                `Location: ${location}`,
                20,
                151
            );


            // =================================================
            // PAYMENT
            // =================================================

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(13);


            pdf.text(
                "Payment Information",
                20,
                172
            );


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(9);


            pdf.text(
                `Razorpay Order ID: ${orderId}`,
                20,
                183
            );


            pdf.text(
                `Razorpay Payment ID: ${paymentId}`,
                20,
                193
            );


            pdf.text(
                `Receipt Date: ${receiptDate}`,
                20,
                203
            );


            // =================================================
            // PAYMENT SUMMARY
            // =================================================

            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(10);


            pdf.text(
                `Total Booking Amount: Rs. ${totalPrice.toLocaleString("en-IN")}`,
                20,
                213
            );


            pdf.text(
                `Total Amount Paid: Rs. ${amountPaid.toLocaleString("en-IN")}`,
                20,
                222
            );


            pdf.text(
                `Amount Due: Rs. ${amountDue.toLocaleString("en-IN")}`,
                20,
                231
            );


            pdf.setFillColor(
                24,
                54,
                111
            );


            pdf.roundedRect(
                20,
                238,
                170,
                25,
                4,
                4,
                "F"
            );


            pdf.setTextColor(
                255,
                255,
                255
            );


            pdf.setFont(
                "helvetica",
                "bold"
            );


            pdf.setFontSize(12);


            pdf.text(
                "TOTAL PAID",
                30,
                254
            );


            pdf.setFontSize(17);


            pdf.text(
                `Rs. ${amountPaid.toLocaleString("en-IN")}`,
                180,
                254,
                {
                    align: "right"
                }
            );


            // =================================================
            // FOOTER
            // =================================================

            pdf.setTextColor(
                100,
                116,
                139
            );


            pdf.setFont(
                "helvetica",
                "normal"
            );


            pdf.setFontSize(9);


            pdf.text(
                "Thank you for choosing EventSphere.",
                105,
                275,
                {
                    align: "center"
                }
            );


            pdf.text(
                "This is a computer-generated payment receipt.",
                105,
                283,
                {
                    align: "center"
                }
            );


            const safeEventName =
                eventName
                    .replace(
                        /[^a-z0-9]/gi,
                        "_"
                    )
                    .substring(
                        0,
                        40
                    );


            pdf.save(
                `EventSphere_Payment_Receipt_${safeEventName}.pdf`
            );


            console.log(
                "Payment receipt downloaded successfully."
            );

        }

        catch (error) {

            console.error(
                "Receipt Download Error:",
                error
            );


            alert(
                "Unable to download receipt. Please try again."
            );

        }

    };


// =========================================================
// PREVIEW PAYMENT RECEIPT
// =========================================================

window.previewPaymentReceipt =
    async function (bookingId) {

        try {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );

                window.location.href =
                    "customer-login.html";

                return;
            }


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
                    "Booking not found."
                );

                return;
            }


            const booking =
                bookingSnapshot.data();


            if (
                booking.customerId &&
                booking.customerId !==
                    user.uid
            ) {

                alert(
                    "You cannot access this receipt."
                );

                return;
            }


            if (
                booking.paymentStatus !==
                "Paid"
            ) {

                alert(
                    "Receipt is available only after successful payment."
                );

                return;
            }


            const eventName =
                booking.eventName ||
                "Event";


            const eventDate =
                booking.eventDate ||
                "Not specified";


            const guests =
                booking.guests ||
                "Not specified";


            const location =
                booking.location ||
                "Not specified";


            const totalPrice =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            const storedAmountPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus ===
                        "Paid"

                        ? totalPrice

                        : 0;


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        storedAmountPaid,
                        totalPrice
                    )
                );


            const customerDoc =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    )
                );


            const customerName =
                (
                    customerDoc.exists() &&
                    customerDoc.data().fullName
                ) ||
                booking.customerName ||
                user.displayName ||
                "Customer";


            const customerEmail =
                booking.customerEmail ||
                user.email ||
                "Not available";


            const paymentId =
                booking.razorpayPaymentId ||
                booking.paymentId ||
                "Not available";


            const orderId =
                booking.razorpayOrderId ||
                "Not available";


            const receiptDate =
                new Date().toLocaleString(
                    "en-IN"
                );


            const bookingDisplayId =
                "#BK-" +
                bookingId
                    .substring(0, 6)
                    .toUpperCase();


            // =================================================
            // CREATE OVERLAY
            // =================================================

            const overlay =
                document.createElement(
                    "div"
                );


            overlay.style.cssText = `
                position:fixed;
                inset:0;
                background:rgba(15,23,42,0.72);
                z-index:99999;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                box-sizing:border-box;
                overflow:auto;
            `;


            const modal =
                document.createElement(
                    "div"
                );


            modal.style.cssText = `
                width:100%;
                max-width:760px;
                max-height:94vh;
                overflow:auto;
                background:#eef2f7;
                border-radius:16px;
                box-shadow:0 25px 70px rgba(0,0,0,0.30);
            `;


            modal.innerHTML = `

                <div style="
                    background:#18366f;
                    color:white;
                    padding:15px 20px;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    position:sticky;
                    top:0;
                    z-index:5;
                ">

                    <strong style="
                        font-size:16px;
                    ">

                        <i class="
                            fa-solid
                            fa-file-invoice
                        "></i>

                        &nbsp; Payment Receipt Preview

                    </strong>


                    <button
                        type="button"
                        id="closeReceiptPreview"
                        style="
                            border:none;
                            background:rgba(255,255,255,0.15);
                            color:white;
                            width:34px;
                            height:34px;
                            border-radius:7px;
                            font-size:22px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <div style="
                    padding:25px;
                ">


                    <div style="
                        max-width:650px;
                        margin:auto;
                        background:white;
                        box-shadow:0 5px 25px rgba(15,23,42,0.10);
                    ">


                        <div style="
                            background:#18366f;
                            color:white;
                            padding:28px;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:15px;
                        ">

                            <div>

                                <div style="
                                    font-size:24px;
                                    font-weight:800;
                                ">
                                    EventSphere
                                </div>

                                <div style="
                                    font-size:9px;
                                    margin-top:4px;
                                    letter-spacing:1px;
                                    opacity:0.8;
                                ">
                                    EVENT BOOKING PLATFORM
                                </div>

                            </div>


                            <div style="
                                text-align:right;
                            ">

                                <div style="
                                    font-size:18px;
                                    font-weight:800;
                                ">
                                    PAYMENT RECEIPT
                                </div>

                                <div style="
                                    font-size:9px;
                                    margin-top:5px;
                                ">
                                    ${bookingDisplayId}
                                </div>

                            </div>

                        </div>


                        <div style="
                            padding:30px;
                        ">


                            <div style="
                                text-align:center;
                                margin-bottom:25px;
                            ">

                                <span style="
                                    display:inline-block;
                                    padding:8px 18px;
                                    background:#dcfce7;
                                    color:#15803d;
                                    border-radius:30px;
                                    font-size:12px;
                                    font-weight:800;
                                ">
                                    ✓ PAYMENT PAID
                                </span>

                            </div>


                            <div style="
                                display:grid;
                                grid-template-columns:1fr 1fr;
                                gap:20px;
                                padding-bottom:20px;
                                border-bottom:1px solid #e5e7eb;
                            ">

                                <div>

                                    <small style="
                                        color:#94a3b8;
                                        font-weight:700;
                                    ">
                                        RECEIPT DATE
                                    </small>

                                    <div style="
                                        margin-top:5px;
                                        font-weight:700;
                                        color:#172554;
                                    ">
                                        ${receiptDate}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#94a3b8;
                                        font-weight:700;
                                    ">
                                        BOOKING ID
                                    </small>

                                    <div style="
                                        margin-top:5px;
                                        font-weight:700;
                                        color:#172554;
                                    ">
                                        ${bookingDisplayId}
                                    </div>

                                </div>

                            </div>


                            <h3 style="
                                background:#eff6ff;
                                color:#18366f;
                                padding:10px;
                                border-radius:7px;
                                font-size:12px;
                                margin-top:25px;
                            ">
                                CUSTOMER INFORMATION
                            </h3>


                            <div style="
                                display:grid;
                                grid-template-columns:1fr 1fr;
                                gap:20px;
                            ">

                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        NAME
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                    ">
                                        ${customerName}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        EMAIL
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                        word-break:break-word;
                                    ">
                                        ${customerEmail}
                                    </div>

                                </div>

                            </div>


                            <h3 style="
                                background:#eff6ff;
                                color:#18366f;
                                padding:10px;
                                border-radius:7px;
                                font-size:12px;
                                margin-top:25px;
                            ">
                                EVENT INFORMATION
                            </h3>


                            <div style="
                                display:grid;
                                grid-template-columns:1fr 1fr;
                                gap:20px;
                            ">

                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        EVENT
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                    ">
                                        ${eventName}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        EVENT DATE
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                    ">
                                        ${eventDate}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        GUESTS
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                    ">
                                        ${guests}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#94a3b8;
                                    ">
                                        LOCATION
                                    </small>

                                    <div style="
                                        font-weight:700;
                                        margin-top:4px;
                                    ">
                                        ${location}
                                    </div>

                                </div>

                            </div>


                            <h3 style="
                                background:#eff6ff;
                                color:#18366f;
                                padding:10px;
                                border-radius:7px;
                                font-size:12px;
                                margin-top:25px;
                            ">
                                PAYMENT INFORMATION
                            </h3>


                            <div style="
                                background:#f8fbff;
                                border:1px solid #dbeafe;
                                border-radius:9px;
                                padding:15px;
                            ">

                                <div style="
                                    margin-bottom:12px;
                                ">

                                    <small style="
                                        color:#64748b;
                                    ">
                                        Razorpay Order ID
                                    </small>

                                    <div style="
                                        font-size:11px;
                                        font-weight:700;
                                        word-break:break-all;
                                    ">
                                        ${orderId}
                                    </div>

                                </div>


                                <div>

                                    <small style="
                                        color:#64748b;
                                    ">
                                        Razorpay Payment ID
                                    </small>

                                    <div style="
                                        font-size:11px;
                                        font-weight:700;
                                        word-break:break-all;
                                    ">
                                        ${paymentId}
                                    </div>

                                </div>

                            </div>


                            <div style="
                                margin-top:20px;
                                padding:15px;
                                border:1px solid #e2e8f0;
                                border-radius:9px;
                                background:#f8fafc;
                            ">

                                <div style="
                                    display:flex;
                                    justify-content:space-between;
                                    margin-bottom:12px;
                                ">

                                    <span>
                                        Total Booking Amount
                                    </span>

                                    <strong>
                                        ₹${totalPrice.toLocaleString("en-IN")}
                                    </strong>

                                </div>


                                <div style="
                                    display:flex;
                                    justify-content:space-between;
                                ">

                                    <span>
                                        Total Amount Paid
                                    </span>

                                    <strong>
                                        ₹${amountPaid.toLocaleString("en-IN")}
                                    </strong>

                                </div>

                            </div>


                            <div style="
                                margin-top:25px;
                                background:#18366f;
                                color:white;
                                padding:17px 20px;
                                border-radius:9px;
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                            ">

                                <strong>
                                    TOTAL PAID
                                </strong>

                                <strong style="
                                    font-size:21px;
                                ">
                                    ₹${amountPaid.toLocaleString("en-IN")}
                                </strong>

                            </div>


                            <div style="
                                text-align:center;
                                color:#94a3b8;
                                font-size:9px;
                                margin-top:25px;
                                line-height:1.6;
                            ">

                                <strong>
                                    Thank you for choosing EventSphere.
                                </strong>

                                <br>

                                This is a computer-generated payment receipt.

                            </div>


                        </div>

                    </div>

                </div>


                <div style="
                    background:white;
                    border-top:1px solid #e2e8f0;
                    padding:15px 20px;
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    position:sticky;
                    bottom:0;
                    z-index:5;
                ">

                    <button
                        type="button"
                        id="closeReceiptPreviewBottom"
                        style="
                            padding:10px 18px;
                            border:none;
                            border-radius:8px;
                            background:#f1f5f9;
                            color:#475569;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >
                        Close
                    </button>


                    <button
                        type="button"
                        id="downloadReceiptFromPreview"
                        style="
                            padding:10px 18px;
                            border:none;
                            border-radius:8px;
                            background:#2563eb;
                            color:white;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >

                        <i class="fa-solid fa-file-pdf"></i>

                        Download PDF

                    </button>

                </div>

            `;


            overlay.appendChild(
                modal
            );


            document.body.appendChild(
                overlay
            );


            function closePreview() {
                overlay.remove();
            }


            document
                .getElementById(
                    "closeReceiptPreview"
                )
                .addEventListener(
                    "click",
                    closePreview
                );


            document
                .getElementById(
                    "closeReceiptPreviewBottom"
                )
                .addEventListener(
                    "click",
                    closePreview
                );


            overlay.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        closePreview();

                    }

                }
            );


            document
                .getElementById(
                    "downloadReceiptFromPreview"
                )
                .addEventListener(
                    "click",
                    async function () {

                        const button =
                            this;


                        button.disabled =
                            true;


                        button.innerHTML = `
                            <i class="fa-solid fa-spinner fa-spin"></i>
                            Preparing PDF...
                        `;


                        try {

                            await downloadPaymentReceipt(
                                bookingId
                            );

                        }

                        catch (error) {

                            console.error(
                                "PDF Download Error:",
                                error
                            );


                            alert(
                                "Unable to download receipt. Please try again."
                            );

                        }

                        finally {

                            button.disabled =
                                false;


                            button.innerHTML = `
                                <i class="fa-solid fa-file-pdf"></i>
                                Download PDF
                            `;

                        }

                    }
                );

        }

        catch (error) {

            console.error(
                "Receipt Preview Error:",
                error
            );


            alert(
                error.message ||
                "Unable to preview receipt."
            );

        }

    };

     
// =========================================================
// CANCEL CUSTOMER BOOKING
// =========================================================

window.cancelCustomerBooking =
    async function (bookingId) {

        try {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );

                window.location.href =
                    "customer-login.html";

                return;
            }


            const bookingRef =
                doc(
                    db,
                    "bookings",
                    bookingId
                );


            const bookingSnapshot =
                await getDoc(
                    bookingRef
                );


            if (
                !bookingSnapshot.exists()
            ) {

                alert(
                    "Booking not found."
                );

                return;
            }


            const booking =
                bookingSnapshot.data();


            if (
                booking.customerId !==
                user.uid
            ) {

                alert(
                    "You cannot cancel this booking."
                );

                return;
            }


            if (
                booking.status !==
                "Pending"
            ) {

                alert(
                    "Only pending bookings can be cancelled."
                );

                return;
            }


            const confirmed =
                confirm(
                    "Are you sure you want to cancel this booking?"
                );


            if (!confirmed) {
                return;
            }


            await updateDoc(
                bookingRef,
                {
                    status: "Cancelled",
                    cancelledBy: "customer",
                    cancelledAt:
                        new Date()
                }
            );


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


            alert(
                "Unable to cancel booking. Please try again."
            );

        }

    };


// =========================================================
// VIEW BOOKING DETAILS
// =========================================================

window.viewBookingDetails =
    async function (bookingId) {

        try {

            const user =
                auth.currentUser;


            if (!user) {

                alert(
                    "Please login first."
                );

                return;
            }


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
                    "Booking not found."
                );

                return;
            }


            const booking =
                bookingSnapshot.data();


            if (
                booking.customerId &&
                booking.customerId !==
                    user.uid
            ) {

                alert(
                    "You cannot view this booking."
                );

                return;
            }


            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            const storedAmountPaid =
                booking.amountPaid !== undefined

                    ? Number(
                        booking.amountPaid || 0
                    )

                    : booking.paymentStatus ===
                        "Paid"

                        ? totalAmount

                        : 0;


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        storedAmountPaid,
                        totalAmount
                    )
                );


            const amountDue =
                Math.max(
                    0,
                    Number(
                        (
                            totalAmount -
                            amountPaid
                        ).toFixed(2)
                    )
                );


            const paymentStatus =
                amountDue <= 0
                    ? "Paid"
                    : amountPaid > 0
                        ? "Partially Paid"
                        : "Unpaid";


            // =============================================
            // GET PAYMENT HISTORY
            // =============================================

            let paymentHistory = [];

            try {

                const historySnapshot =
                    await getDocs(
                        collection(
                            db,
                            "bookings",
                            bookingId,
                            "payments"
                        )
                    );


                paymentHistory =
                    historySnapshot.docs
                        .map((paymentDoc) => ({
                            id: paymentDoc.id,
                            ...paymentDoc.data()
                        }))
                        .sort((a, b) => {

                            const aTime =
                                a.paidAt?.toMillis
                                    ? a.paidAt.toMillis()
                                    : 0;

                            const bTime =
                                b.paidAt?.toMillis
                                    ? b.paidAt.toMillis()
                                    : 0;

                            return aTime - bTime;

                        });

            }

            catch (historyError) {

                console.error(
                    "Payment History Error:",
                    historyError
                );

            }


            const historyHtml =
                paymentHistory.length

                    ? paymentHistory
                        .map((payment, index) => {

                            const date =
                                payment.paidAt?.toDate
                                    ? payment.paidAt
                                        .toDate()
                                        .toLocaleString(
                                            "en-IN"
                                        )
                                    : "Date not available";


                            const method =
                                payment.paymentMethod
                                    ? String(
                                        payment.paymentMethod
                                    ).toUpperCase()
                                    : "RAZORPAY";


                            const bank =
                                payment.paymentMethod ===
                                "upi"

                                    ? (
                                        payment.paymentVpa ||
                                        payment.bankName ||
                                        "Not provided"
                                    )

                                    : (
                                        payment.bankName ||
                                        payment.cardIssuer ||
                                        "Not provided"
                                    );


                            return `
                                <div style="
                                    padding:12px 0;
                                    border-bottom:
                                        1px solid #e5e7eb;
                                ">

                                    <div style="
                                        display:flex;
                                        justify-content:
                                            space-between;
                                        gap:10px;
                                    ">

                                        <strong>
                                            Payment ${index + 1}
                                        </strong>

                                        <strong style="
                                            color:#15803d;
                                        ">
                                            ₹${Number(
                                                payment.amount || 0
                                            ).toLocaleString("en-IN")}
                                        </strong>

                                    </div>


                                    <div style="
                                        margin-top:6px;
                                        font-size:12px;
                                        color:#64748b;
                                        line-height:1.7;
                                    ">

                                        <div>
                                            📅 ${date}
                                        </div>

                                        <div>
                                            💳 ${method}
                                        </div>

                                        <div>
                                            🏦 ${bank}
                                        </div>

                                        <div style="
                                            word-break:break-all;
                                        ">
                                            🆔 ${
                                                payment.razorpayPaymentId ||
                                                payment.id
                                            }
                                        </div>

                                    </div>

                                </div>
                            `;

                        })
                        .join("")

                    : `
                        <div style="
                            color:#94a3b8;
                            font-size:13px;
                        ">
                            No payment history available.
                        </div>
                    `;


            // =============================================
            // DETAILS MODAL
            // =============================================

            const overlay =
                document.createElement(
                    "div"
                );


            overlay.style.cssText = `
                position:fixed;
                inset:0;
                z-index:99998;
                background:rgba(15,23,42,.72);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                overflow:auto;
                box-sizing:border-box;
            `;


            const modal =
                document.createElement(
                    "div"
                );


            modal.style.cssText = `
                width:100%;
                max-width:720px;
                max-height:92vh;
                overflow:auto;
                background:white;
                border-radius:16px;
                box-shadow:
                    0 25px 70px rgba(0,0,0,.30);
            `;


            modal.innerHTML = `

                <div style="
                    background:#18366f;
                    color:white;
                    padding:18px 22px;
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    position:sticky;
                    top:0;
                    z-index:5;
                ">

                    <strong style="
                        font-size:17px;
                    ">
                        Booking Details
                    </strong>


                    <button
                        id="closeBookingDetails"
                        type="button"
                        style="
                            width:34px;
                            height:34px;
                            border:0;
                            border-radius:7px;
                            background:
                                rgba(255,255,255,.15);
                            color:white;
                            font-size:22px;
                            cursor:pointer;
                        "
                    >
                        ×
                    </button>

                </div>


                <div style="
                    padding:24px;
                ">


                    <div style="
                        text-align:center;
                        margin-bottom:20px;
                    ">

                        <h2 style="
                            margin:0;
                            color:#172554;
                        ">
                            ${
                                booking.eventName ||
                                "Event"
                            }
                        </h2>


                        <div style="
                            margin-top:6px;
                            color:#64748b;
                            font-size:13px;
                        ">
                            Booking ID:
                            #BK-${bookingId
                                .substring(0,6)
                                .toUpperCase()}
                        </div>

                    </div>


                    <div style="
                        display:grid;
                        grid-template-columns:
                            repeat(
                                2,
                                minmax(0,1fr)
                            );
                        gap:12px;
                    ">


                        <div style="
                            padding:13px;
                            background:#f8fafc;
                            border-radius:9px;
                        ">

                            <small>
                                Event Date
                            </small>

                            <strong style="
                                display:block;
                                margin-top:5px;
                            ">
                                ${
                                    booking.eventDate ||
                                    "Not specified"
                                }
                            </strong>

                        </div>


                        <div style="
                            padding:13px;
                            background:#f8fafc;
                            border-radius:9px;
                        ">

                            <small>
                                Guests
                            </small>

                            <strong style="
                                display:block;
                                margin-top:5px;
                            ">
                                ${
                                    booking.guests ||
                                    0
                                }
                            </strong>

                        </div>


                        <div style="
                            padding:13px;
                            background:#f8fafc;
                            border-radius:9px;
                        ">

                            <small>
                                Location
                            </small>

                            <strong style="
                                display:block;
                                margin-top:5px;
                            ">
                                ${
                                    booking.location ||
                                    "Not specified"
                                }
                            </strong>

                        </div>


                        <div style="
                            padding:13px;
                            background:#f8fafc;
                            border-radius:9px;
                        ">

                            <small>
                                Booking Status
                            </small>

                            <strong style="
                                display:block;
                                margin-top:5px;
                            ">
                                ${
                                    booking.status ||
                                    "Pending"
                                }
                            </strong>

                        </div>

                    </div>


                    <!-- PAYMENT SUMMARY -->

                    <div style="
                        margin-top:20px;
                        padding:18px;
                        border-radius:10px;
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                    ">

                        <h3 style="
                            margin:0 0 15px;
                            color:#172554;
                        ">
                            Payment Summary
                        </h3>


                        <div style="
                            display:flex;
                            justify-content:
                                space-between;
                            margin-bottom:10px;
                        ">

                            <span>
                                Total Amount
                            </span>

                            <strong>
                                ₹${totalAmount.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div style="
                            display:flex;
                            justify-content:
                                space-between;
                            margin-bottom:10px;
                        ">

                            <span>
                                Amount Paid
                            </span>

                            <strong style="
                                color:#15803d;
                            ">
                                ₹${amountPaid.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div style="
                            display:flex;
                            justify-content:
                                space-between;
                        ">

                            <span>
                                Amount Due
                            </span>

                            <strong style="
                                color:${
                                    amountDue > 0
                                        ? "#dc2626"
                                        : "#15803d"
                                };
                            ">
                                ₹${amountDue.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div style="
                            margin-top:15px;
                            padding-top:15px;
                            border-top:
                                1px solid #e2e8f0;
                            display:flex;
                            justify-content:
                                space-between;
                        ">

                            <span>
                                Payment Status
                            </span>

                            <strong>
                                ${paymentStatus}
                            </strong>

                        </div>

                    </div>


                    <!-- PAYMENT HISTORY -->

                    <div style="
                        margin-top:20px;
                        padding:18px;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                    ">

                        <h3 style="
                            margin:0;
                            color:#172554;
                        ">

                            <i class="
                                fa-solid
                                fa-clock-rotate-left
                            "></i>

                            Payment History

                        </h3>


                        <p style="
                            margin:5px 0 10px;
                            color:#94a3b8;
                            font-size:12px;
                        ">
                            All successful installments
                            are listed below.
                        </p>


                        ${historyHtml}

                    </div>


                    ${
                        booking.requirements
                            ? `

                                <div style="
                                    margin-top:20px;
                                    padding:18px;
                                    background:#f8fafc;
                                    border-radius:10px;
                                ">

                                    <h3 style="
                                        margin-top:0;
                                        color:#172554;
                                    ">
                                        Requirements
                                    </h3>

                                    <p style="
                                        margin-bottom:0;
                                        color:#475569;
                                        line-height:1.6;
                                    ">
                                        ${
                                            booking.requirements
                                        }
                                    </p>

                                </div>

                            `
                            : ""
                    }


                </div>


                <div style="
                    padding:15px 22px;
                    border-top:1px solid #e2e8f0;
                    text-align:right;
                ">

                    <button
                        id="closeBookingDetailsBottom"
                        type="button"
                        style="
                            padding:10px 18px;
                            border:0;
                            border-radius:8px;
                            background:#18366f;
                            color:white;
                            font-weight:700;
                            cursor:pointer;
                        "
                    >
                        Close
                    </button>

                </div>

            `;


            overlay.appendChild(
                modal
            );


            document.body.appendChild(
                overlay
            );


            const closeModal =
                () => overlay.remove();


            document
                .getElementById(
                    "closeBookingDetails"
                )
                .addEventListener(
                    "click",
                    closeModal
                );


            document
                .getElementById(
                    "closeBookingDetailsBottom"
                )
                .addEventListener(
                    "click",
                    closeModal
                );


            overlay.addEventListener(
                "click",
                (event) => {

                    if (
                        event.target ===
                        overlay
                    ) {

                        closeModal();

                    }

                }
            );

        }

        catch (error) {

            console.error(
                "View Details Error:",
                error
            );


            alert(
                "Unable to load booking details."
            );

        }

    };


// =========================================================
// AUTH STATE
// =========================================================

auth.onAuthStateChanged(
    async (user) => {

        if (!user) {

            window.location.href =
                "customer-login.html";

            return;
        }


        await loadMyBookings();

    }
);


// =========================================================
// LOGOUT
// =========================================================

window.logoutCustomer =
    async function () {

        try {

            // Firebase Auth signOut is imported
            // dynamically so this file keeps its
            // existing Firebase configuration.

            const {
                signOut
            } = await import(
                "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"
            );


            await signOut(
                auth
            );


            window.location.href =
                "customer-login.html";

        }

        catch (error) {

            console.error(
                "Logout Error:",
                error
            );


            alert(
                "Unable to logout."
            );

        }

    };


// =========================================================
// AUTO REFRESH
// =========================================================

// Refresh the booking list when the page
// becomes visible again.

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible" &&
            auth.currentUser
        ) {

            await loadMyBookings();

        }

    }
);


// =========================================================
// ESC KEY FOR MODALS
// =========================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key !==
            "Escape"
        ) {

            return;
        }


        const overlays =
            document.querySelectorAll(
                'body > div[style*="position:fixed"]'
            );


        const lastOverlay =
            overlays[
                overlays.length - 1
            ];


        if (lastOverlay) {
            lastOverlay.remove();
        }

    }
);


// =========================================================
// FINAL INITIALIZATION
// =========================================================

console.log(
    "EventSphere My Bookings loaded successfully."
);