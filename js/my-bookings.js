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


            // =================================================
            // PAYMENT HISTORY
            // =================================================

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
                        .map(
                            (paymentDoc) => ({
                                id:
                                    paymentDoc.id,

                                ...paymentDoc.data()
                            })
                        )
                        .sort(
                            (a, b) => {

                                const aTime =
                                    a.paidAt?.toMillis
                                        ? a.paidAt.toMillis()
                                        : 0;


                                const bTime =
                                    b.paidAt?.toMillis
                                        ? b.paidAt.toMillis()
                                        : 0;


                                return bTime - aTime;

                            }
                        );

            }

            catch (historyError) {

                console.error(
                    "Payment History Error:",
                    historyError
                );

            }


            // =================================================
            // OLD PAYMENT FALLBACK
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
            // EXTRA PAYMENT DETAILS
            // =================================================

            for (
                const payment of paymentHistory
            ) {

                const paymentId =
                    payment.razorpayPaymentId ||
                    payment.id;


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

                        const currentUser =
                            auth.currentUser;


                        if (currentUser) {

                            const idToken =
                                await currentUser.getIdToken();


                            const response =
                                await fetch(
                                    `https://eventsphere-dndh.onrender.com/payment-details/${encodeURIComponent(bookingId)}/${encodeURIComponent(paymentId)}`,
                                    {
                                        method: "GET",

                                        headers: {
                                            "Authorization":
                                                `Bearer ${idToken}`
                                        }
                                    }
                                );


                            const details =
                                await response.json();


                            if (
                                response.ok &&
                                details.success
                            ) {

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

                    }

                    catch (
                        paymentDetailsError
                    ) {

                        console.error(
                            "Unable to load payment details:",
                            paymentDetailsError
                        );

                    }

                }

            }


            // =================================================
            // HELPERS
            // =================================================

            const formatMoney =
                (value) =>
                    `₹${Number(
                        value || 0
                    ).toLocaleString("en-IN")}`;


            const formatDate =
                (timestamp) => {

                    if (
                        timestamp?.toDate
                    ) {

                        return timestamp
                            .toDate()
                            .toLocaleString(
                                "en-IN"
                            );

                    }

                    return "Date not available";

                };


            const escapeHtml =
                (value) =>
                    String(
                        value ?? ""
                    )
                        .replace(
                            /&/g,
                            "&amp;"
                        )
                        .replace(
                            /</g,
                            "&lt;"
                        )
                        .replace(
                            />/g,
                            "&gt;"
                        )
                        .replace(
                            /"/g,
                            "&quot;"
                        )
                        .replace(
                            /'/g,
                            "&#039;"
                        );


            // =================================================
            // BOOKING DATA
            // =================================================

            const eventName =
                booking.eventName ||
                "Event";


            const eventImage =
                booking.eventImage ||
                booking.image ||
                "images/hero.jpg";


            const eventDate =
                booking.eventDate ||
                "Not specified";


            const guests =
                booking.guests ||
                "Not specified";


            const location =
                booking.location ||
                "Not specified";


            const category =
                booking.category ||
                "Event";


            const requirements =
                booking.requirements ||
                "No special requirements";


            const bookingStatus =
                booking.status ||
                "Pending";


            const bookingDisplayId =
                "#BK-" +
                bookingId
                    .substring(0, 6)
                    .toUpperCase();


            const paymentProgress =
                totalAmount > 0

                    ? Math.min(
                        100,
                        Math.max(
                            0,
                            (
                                amountPaid /
                                totalAmount
                            ) * 100
                        )
                    )

                    : 0;


            const statusClass =
                bookingStatus
                    .toLowerCase()
                    .replace(
                        /\s+/g,
                        "-"
                    );


            const statusIcon =
                bookingStatus ===
                    "Approved"

                    ? "fa-circle-check"

                    : bookingStatus ===
                        "Cancelled"

                        ? "fa-circle-xmark"

                        : bookingStatus ===
                            "Rejected"

                            ? "fa-circle-xmark"

                            : "fa-clock";


            // =================================================
            // PAYMENT HISTORY HTML
            // =================================================

            const historyHtml =
                paymentHistory.length > 0

                    ? paymentHistory
                        .map(
                            (
                                payment,
                                index
                            ) => {

                                const method =
                                    payment.paymentMethod
                                        ? String(
                                            payment.paymentMethod
                                        ).toUpperCase()

                                        : "RAZORPAY";


                                let methodDetails =
                                    "Not provided";


                                if (
                                    payment.paymentMethod ===
                                    "upi"
                                ) {

                                    methodDetails =
                                        payment.paymentVpa ||
                                        payment.bankName ||
                                        "UPI";

                                }

                                else if (
                                    payment.cardLast4
                                ) {

                                    methodDetails =
                                        `${
                                            payment.cardNetwork ||
                                            "Card"
                                        } •••• ${
                                            payment.cardLast4
                                        }`;

                                }

                                else {

                                    methodDetails =
                                        payment.bankName ||
                                        payment.cardIssuer ||
                                        payment.paymentWallet ||
                                        "Not provided";

                                }


                                const paymentId =
                                    payment.razorpayPaymentId ||
                                    payment.id ||
                                    "Not available";


                                return `

                                    <div class="
                                        details-payment-item
                                    ">

                                        <div class="
                                            details-payment-top
                                        ">

                                            <div class="
                                                details-payment-number
                                            ">

                                                <span class="
                                                    details-payment-icon
                                                ">

                                                    <i class="
                                                        fa-solid
                                                        fa-check
                                                    "></i>

                                                </span>


                                                <div>

                                                    <strong>
                                                        Payment ${
                                                            index + 1
                                                        }
                                                    </strong>

                                                    <small>
                                                        ${
                                                            formatDate(
                                                                payment.paidAt
                                                            )
                                                        }
                                                    </small>

                                                </div>

                                            </div>


                                            <strong class="
                                                details-payment-amount
                                            ">

                                                ${
                                                    formatMoney(
                                                        payment.amount
                                                    )
                                                }

                                            </strong>

                                        </div>


                                        <div class="
                                            details-payment-meta
                                        ">

                                            <span>

                                                <i class="
                                                    fa-solid
                                                    fa-credit-card
                                                "></i>

                                                ${
                                                    escapeHtml(
                                                        method
                                                    )
                                                }

                                            </span>


                                            <span>

                                                <i class="
                                                    fa-solid
                                                    fa-building-columns
                                                "></i>

                                                ${
                                                    escapeHtml(
                                                        methodDetails
                                                    )
                                                }

                                            </span>


                                            <span class="
                                                details-payment-id
                                            ">

                                                <i class="
                                                    fa-solid
                                                    fa-fingerprint
                                                "></i>

                                                ${
                                                    escapeHtml(
                                                        paymentId
                                                    )
                                                }

                                            </span>

                                        </div>

                                    </div>

                                `;

                            }
                        )
                        .join("")

                    : `

                        <div class="
                            details-empty-history
                        ">

                            <i class="
                                fa-regular
                                fa-folder-open
                            "></i>

                            <strong>
                                No payment history yet
                            </strong>

                            <span>
                                Successful payments will appear here.
                            </span>

                        </div>

                    `;


            // =================================================
            // CREATE OVERLAY
            // =================================================

            const overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "booking-details-overlay";


            const modal =
                document.createElement(
                    "div"
                );


            modal.className =
                "booking-details-modal";


            // =================================================
            // MODAL HTML
            // =================================================

            modal.innerHTML = `

                <style>

                    .booking-details-overlay {

                        position:fixed;

                        inset:0;

                        z-index:99998;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        padding:20px;

                        box-sizing:border-box;

                        background:
                            rgba(
                                15,
                                23,
                                42,
                                0.72
                            );

                        backdrop-filter:
                            blur(7px);

                        -webkit-backdrop-filter:
                            blur(7px);

                    }


                    .booking-details-modal {

                        width:100%;

                        max-width:820px;

                        max-height:94vh;

                        overflow:hidden;

                        position:relative;

                        border-radius:24px;

                        background:#f8fafc;

                        box-shadow:
                            0 30px 90px
                            rgba(
                                15,
                                23,
                                42,
                                .35
                            );

                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;

                        color:#172554;

                    }


                    .booking-details-scroll {

                        max-height:94vh;

                        overflow-y:auto;

                        scrollbar-width:thin;

                    }


                    .booking-details-header {

                        position:relative;

                        padding:
                            28px
                            30px
                            25px;

                        overflow:hidden;

                        color:white;

                        background:
                            linear-gradient(
                                135deg,
                                #18366f 0%,
                                #2563eb 100%
                            );

                    }


                    .booking-details-header::before,
                    .booking-details-header::after {

                        content:"";

                        position:absolute;

                        border-radius:50%;

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .10
                            );

                        pointer-events:none;

                    }


                    .booking-details-header::before {

                        width:190px;

                        height:190px;

                        right:-70px;

                        top:-100px;

                    }


                    .booking-details-header::after {

                        width:110px;

                        height:110px;

                        right:100px;

                        bottom:-75px;

                    }


                    .booking-details-header-content {

                        position:relative;

                        z-index:2;

                        display:flex;

                        align-items:flex-start;

                        justify-content:
                            space-between;

                        gap:20px;

                    }


                    .booking-details-title-wrap {

                        display:flex;

                        gap:16px;

                        align-items:center;

                        min-width:0;

                    }


                    .booking-details-title-icon {

                        width:54px;

                        height:54px;

                        flex:0 0 54px;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        border-radius:16px;

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .16
                            );

                        border:
                            1px solid
                            rgba(
                                255,
                                255,
                                255,
                                .20
                            );

                        font-size:22px;

                    }


                    .booking-details-kicker {

                        margin:
                            0
                            0
                            5px;

                        font-size:11px;

                        font-weight:800;

                        letter-spacing:
                            1.4px;

                        opacity:.78;

                    }


                    .booking-details-title {

                        margin:0;

                        font-size:24px;

                        line-height:1.2;

                        font-weight:800;

                        color:#fff;

                        word-break:break-word;

                    }


                    .booking-details-id {

                        margin-top:6px;

                        font-size:12px;

                        opacity:.82;

                    }


                    .booking-details-close {

                        width:40px;

                        height:40px;

                        flex:0 0 40px;

                        border:0;

                        border-radius:12px;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        cursor:pointer;

                        color:white;

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .15
                            );

                        font-size:18px;

                        transition:.2s ease;

                    }


                    .booking-details-close:hover {

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .25
                            );

                        transform:
                            rotate(4deg);

                    }


                    .booking-details-event-banner {

                        position:relative;

                        z-index:3;

                        display:grid;

                        grid-template-columns:
                            112px
                            1fr
                            auto;

                        align-items:center;

                        gap:17px;

                        margin:
                            -5px
                            24px
                            0;

                        padding:14px;

                        border:
                            1px solid
                            #e2e8f0;

                        border-radius:18px;

                        background:white;

                        box-shadow:
                            0 12px 30px
                            rgba(
                                15,
                                23,
                                42,
                                .10
                            );

                    }


                    .booking-details-event-image {

                        width:112px;

                        height:82px;

                        object-fit:cover;

                        border-radius:13px;

                        background:#e2e8f0;

                    }


                    .booking-details-event-name {

                        margin:
                            0
                            0
                            7px;

                        font-size:18px;

                        line-height:1.25;

                        color:#172554;

                        word-break:break-word;

                    }


                    .booking-details-event-category {

                        display:inline-flex;

                        align-items:center;

                        gap:6px;

                        padding:
                            6px
                            10px;

                        border-radius:999px;

                        color:#1d4ed8;

                        background:#eff6ff;

                        font-size:11px;

                        font-weight:800;

                    }


                    .booking-details-status {

                        display:inline-flex;

                        align-items:center;

                        gap:7px;

                        padding:
                            9px
                            12px;

                        border-radius:999px;

                        white-space:nowrap;

                        font-size:11px;

                        font-weight:800;

                    }


                    .booking-details-status.approved {

                        color:#166534;

                        background:#dcfce7;

                    }


                    .booking-details-status.pending {

                        color:#9a3412;

                        background:#ffedd5;

                    }


                    .booking-details-status.cancelled,
                    .booking-details-status.rejected {

                        color:#991b1b;

                        background:#fee2e2;

                    }


                    .booking-details-body {

                        padding:25px;

                    }


                    .booking-details-section {

                        margin-bottom:20px;

                        padding:20px;

                        border:
                            1px solid
                            #e2e8f0;

                        border-radius:18px;

                        background:white;

                    }


                    .booking-details-section:last-child {

                        margin-bottom:0;

                    }


                    .booking-details-section-title {

                        display:flex;

                        align-items:center;

                        gap:9px;

                        margin:
                            0
                            0
                            15px;

                        font-size:15px;

                        color:#172554;

                    }


                    .booking-details-section-title i {

                        color:#2563eb;

                    }


                    .booking-details-grid {

                        display:grid;

                        grid-template-columns:
                            repeat(
                                2,
                                minmax(
                                    0,
                                    1fr
                                )
                            );

                        gap:12px;

                    }


                    .booking-details-info-box {

                        min-width:0;

                        padding:14px;

                        border:
                            1px solid
                            #edf2f7;

                        border-radius:13px;

                        background:#f8fafc;

                    }


                    .booking-details-info-label {

                        display:block;

                        margin-bottom:6px;

                        color:#94a3b8;

                        font-size:10px;

                        font-weight:800;

                        letter-spacing:.6px;

                        text-transform:uppercase;

                    }


                    .booking-details-info-value {

                        display:block;

                        color:#334155;

                        font-size:13px;

                        font-weight:700;

                        line-height:1.45;

                        word-break:break-word;

                    }


                    .booking-details-money-grid {

                        display:grid;

                        grid-template-columns:
                            repeat(
                                3,
                                minmax(
                                    0,
                                    1fr
                                )
                            );

                        gap:12px;

                    }


                    .booking-details-money-box {

                        padding:16px;

                        border-radius:14px;

                        background:#f8fafc;

                        border:
                            1px solid
                            #e2e8f0;

                    }


                    .booking-details-money-box.paid {

                        background:#f0fdf4;

                        border-color:#bbf7d0;

                    }


                    .booking-details-money-box.due {

                        background:#fff7ed;

                        border-color:#fed7aa;

                    }


                    .booking-details-money-label {

                        display:block;

                        margin-bottom:6px;

                        color:#64748b;

                        font-size:11px;

                        font-weight:700;

                    }


                    .booking-details-money-value {

                        display:block;

                        font-size:18px;

                        font-weight:800;

                        color:#172554;

                    }


                    .booking-details-money-box.paid
                    .booking-details-money-value {

                        color:#15803d;

                    }


                    .booking-details-money-box.due
                    .booking-details-money-value {

                        color:#c2410c;

                    }


                    .booking-details-progress-wrap {

                        margin-top:16px;

                        padding:16px;

                        border-radius:14px;

                        background:#f8fafc;

                        border:
                            1px solid
                            #e2e8f0;

                    }


                    .booking-details-progress-top,
                    .booking-details-progress-bottom {

                        display:flex;

                        align-items:center;

                        justify-content:
                            space-between;

                        gap:10px;

                    }


                    .booking-details-progress-top {

                        margin-bottom:9px;

                        color:#334155;

                        font-size:12px;

                        font-weight:800;

                    }


                    .booking-details-progress-percent {

                        color:#2563eb;

                    }


                    .booking-details-progress-track {

                        height:9px;

                        overflow:hidden;

                        border-radius:99px;

                        background:#e2e8f0;

                    }


                    .booking-details-progress-fill {

                        height:100%;

                        width:
                            ${paymentProgress}%;

                        border-radius:inherit;

                        background:
                            linear-gradient(
                                90deg,
                                #2563eb,
                                #60a5fa
                            );

                    }


                    .booking-details-progress-bottom {

                        margin-top:8px;

                        color:#64748b;

                        font-size:11px;

                    }


                    .booking-details-progress-bottom strong {

                        color:#334155;

                    }


                    .details-payment-item {

                        padding:14px 0;

                        border-bottom:
                            1px solid
                            #eef2f7;

                    }


                    .details-payment-item:last-child {

                        border-bottom:0;

                        padding-bottom:0;

                    }


                    .details-payment-top {

                        display:flex;

                        align-items:center;

                        justify-content:
                            space-between;

                        gap:15px;

                    }


                    .details-payment-number {

                        display:flex;

                        align-items:center;

                        gap:10px;

                        min-width:0;

                    }


                    .details-payment-icon {

                        width:34px;

                        height:34px;

                        flex:0 0 34px;

                        display:flex;

                        align-items:center;

                        justify-content:center;

                        border-radius:10px;

                        color:#15803d;

                        background:#dcfce7;

                    }


                    .details-payment-number strong,
                    .details-payment-number small {

                        display:block;

                    }


                    .details-payment-number strong {

                        color:#172554;

                        font-size:13px;

                    }


                    .details-payment-number small {

                        margin-top:3px;

                        color:#94a3b8;

                        font-size:10px;

                    }


                    .details-payment-amount {

                        color:#15803d;

                        font-size:14px;

                        white-space:nowrap;

                    }


                    .details-payment-meta {

                        display:grid;

                        grid-template-columns:
                            repeat(
                                2,
                                minmax(
                                    0,
                                    1fr
                                )
                            );

                        gap:7px 15px;

                        margin:
                            10px
                            0
                            0
                            44px;

                        color:#64748b;

                        font-size:10px;

                    }


                    .details-payment-meta span {

                        min-width:0;

                        display:flex;

                        align-items:flex-start;

                        gap:6px;

                        word-break:break-word;

                    }


                    .details-payment-meta i {

                        width:12px;

                        margin-top:1px;

                        color:#94a3b8;

                    }


                    .details-payment-id {

                        grid-column:
                            1 / -1;

                    }


                    .details-empty-history {

                        display:flex;

                        align-items:center;

                        flex-direction:column;

                        gap:5px;

                        padding:
                            20px
                            10px;

                        color:#94a3b8;

                        text-align:center;

                    }


                    .details-empty-history i {

                        margin-bottom:3px;

                        font-size:25px;

                    }


                    .details-empty-history strong {

                        color:#64748b;

                        font-size:13px;

                    }


                    .details-empty-history span {

                        font-size:11px;

                    }


                    .booking-details-requirements {

                        padding:14px;

                        border-radius:13px;

                        color:#475569;

                        background:#f8fafc;

                        border:
                            1px solid
                            #e2e8f0;

                        font-size:12px;

                        line-height:1.6;

                        white-space:pre-wrap;

                    }


                    .booking-details-footer {

                        position:sticky;

                        bottom:0;

                        z-index:4;

                        display:flex;

                        justify-content:flex-end;

                        padding:
                            15px
                            25px;

                        border-top:
                            1px solid
                            #e2e8f0;

                        background:
                            rgba(
                                255,
                                255,
                                255,
                                .96
                            );

                        backdrop-filter:
                            blur(8px);

                    }


                    .booking-details-footer button {

                        display:inline-flex;

                        align-items:center;

                        justify-content:center;

                        gap:8px;

                        padding:
                            11px
                            20px;

                        border:0;

                        border-radius:11px;

                        color:white;

                        background:#18366f;

                        font-size:12px;

                        font-weight:800;

                        cursor:pointer;

                        transition:.2s ease;

                    }


                    .booking-details-footer button:hover {

                        background:#2563eb;

                        transform:
                            translateY(-1px);

                    }


                    @media (
                        max-width:680px
                    ) {

                        .booking-details-overlay {

                            padding:10px;

                            align-items:
                                flex-start;

                        }


                        .booking-details-modal {

                            max-height:96vh;

                            border-radius:18px;

                        }


                        .booking-details-header {

                            padding:
                                20px
                                18px
                                22px;

                        }


                        .booking-details-title-icon {

                            width:46px;

                            height:46px;

                            flex-basis:46px;

                        }


                        .booking-details-title {

                            font-size:19px;

                        }


                        .booking-details-event-banner {

                            grid-template-columns:
                                78px
                                1fr;

                            margin:
                                -4px
                                12px
                                0;

                            padding:10px;

                        }


                        .booking-details-event-image {

                            width:78px;

                            height:68px;

                        }


                        .booking-details-status {

                            grid-column:
                                1 / -1;

                            justify-self:
                                start;

                        }


                        .booking-details-body {

                            padding:14px;

                        }


                        .booking-details-section {

                            padding:15px;

                            border-radius:15px;

                        }


                        .booking-details-grid,
                        .booking-details-money-grid,
                        .details-payment-meta {

                            grid-template-columns:
                                1fr;

                        }


                        .details-payment-id {

                            grid-column:auto;

                        }


                        .details-payment-meta {

                            margin-left:44px;

                        }


                        .booking-details-footer {

                            padding:
                                12px
                                14px;

                        }


                        .booking-details-footer button {

                            width:100%;

                        }

                    }

                </style>


                <div class="
                    booking-details-scroll
                ">


                    <!-- HEADER -->

                    <div class="
                        booking-details-header
                    ">

                        <div class="
                            booking-details-header-content
                        ">

                            <div class="
                                booking-details-title-wrap
                            ">

                                <div class="
                                    booking-details-title-icon
                                ">

                                    <i class="
                                        fa-solid
                                        fa-calendar-check
                                    "></i>

                                </div>


                                <div>

                                    <p class="
                                        booking-details-kicker
                                    ">
                                        BOOKING DETAILS
                                    </p>


                                    <h2 class="
                                        booking-details-title
                                    ">
                                        ${
                                            escapeHtml(
                                                eventName
                                            )
                                        }
                                    </h2>


                                    <div class="
                                        booking-details-id
                                    ">
                                        ${
                                            bookingDisplayId
                                        }
                                    </div>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="
                                    booking-details-close
                                "
                                id="
                                    closeBookingDetails
                                "
                                aria-label="Close"
                            >

                                <i class="
                                    fa-solid
                                    fa-xmark
                                "></i>

                            </button>

                        </div>

                    </div>


                    <!-- EVENT -->

                    <div class="
                        booking-details-event-banner
                    ">

                        <img
                            src="${
                                escapeHtml(
                                    eventImage
                                )
                            }"
                            class="
                                booking-details-event-image
                            "
                            alt="${
                                escapeHtml(
                                    eventName
                                )
                            }"
                            onerror="
                                this.src='images/hero.jpg'
                            "
                        >


                        <div>

                            <h3 class="
                                booking-details-event-name
                            ">
                                ${
                                    escapeHtml(
                                        eventName
                                    )
                                }
                            </h3>


                            <span class="
                                booking-details-event-category
                            ">

                                <i class="
                                    fa-solid
                                    fa-tag
                                "></i>

                                ${
                                    escapeHtml(
                                        category
                                    )
                                }

                            </span>

                        </div>


                        <span class="
                            booking-details-status
                            ${statusClass}
                        ">

                            <i class="
                                fa-solid
                                ${statusIcon}
                            "></i>

                            ${
                                escapeHtml(
                                    bookingStatus
                                )
                            }

                        </span>

                    </div>


                    <!-- BODY -->

                    <div class="
                        booking-details-body
                    ">


                        <!-- EVENT INFORMATION -->

                        <section class="
                            booking-details-section
                        ">

                            <h3 class="
                                booking-details-section-title
                            ">

                                <i class="
                                    fa-solid
                                    fa-circle-info
                                "></i>

                                Event Information

                            </h3>


                            <div class="
                                booking-details-grid
                            ">


                                <div class="
                                    booking-details-info-box
                                ">

                                    <span class="
                                        booking-details-info-label
                                    ">
                                        Event Date
                                    </span>

                                    <span class="
                                        booking-details-info-value
                                    ">
                                        ${
                                            escapeHtml(
                                                eventDate
                                            )
                                        }
                                    </span>

                                </div>


                                <div class="
                                    booking-details-info-box
                                ">

                                    <span class="
                                        booking-details-info-label
                                    ">
                                        Guests
                                    </span>

                                    <span class="
                                        booking-details-info-value
                                    ">
                                        ${
                                            escapeHtml(
                                                guests
                                            )
                                        }
                                        People
                                    </span>

                                </div>


                                <div class="
                                    booking-details-info-box
                                ">

                                    <span class="
                                        booking-details-info-label
                                    ">
                                        Location
                                    </span>

                                    <span class="
                                        booking-details-info-value
                                    ">
                                        ${
                                            escapeHtml(
                                                location
                                            )
                                        }
                                    </span>

                                </div>


                                <div class="
                                    booking-details-info-box
                                ">

                                    <span class="
                                        booking-details-info-label
                                    ">
                                        Event End Time
                                    </span>

                                    <span class="
                                        booking-details-info-value
                                    ">
                                        ${
                                            escapeHtml(
                                                booking.eventEndTime ||
                                                "Not specified"
                                            )
                                        }
                                    </span>

                                </div>


                            </div>

                        </section>


                        <!-- PAYMENT SUMMARY -->

                        <section class="
                            booking-details-section
                        ">

                            <h3 class="
                                booking-details-section-title
                            ">

                                <i class="
                                    fa-solid
                                    fa-wallet
                                "></i>

                                Payment Summary

                            </h3>


                            <div class="
                                booking-details-money-grid
                            ">


                                <div class="
                                    booking-details-money-box
                                ">

                                    <span class="
                                        booking-details-money-label
                                    ">
                                        Total Amount
                                    </span>

                                    <span class="
                                        booking-details-money-value
                                    ">
                                        ${
                                            formatMoney(
                                                totalAmount
                                            )
                                        }
                                    </span>

                                </div>


                                <div class="
                                    booking-details-money-box
                                    paid
                                ">

                                    <span class="
                                        booking-details-money-label
                                    ">
                                        Amount Paid
                                    </span>

                                    <span class="
                                        booking-details-money-value
                                    ">
                                        ${
                                            formatMoney(
                                                amountPaid
                                            )
                                        }
                                    </span>

                                </div>


                                <div class="
                                    booking-details-money-box
                                    due
                                ">

                                    <span class="
                                        booking-details-money-label
                                    ">
                                        Amount Due
                                    </span>

                                    <span class="
                                        booking-details-money-value
                                    ">
                                        ${
                                            formatMoney(
                                                amountDue
                                            )
                                        }
                                    </span>

                                </div>


                            </div>


                            <!-- PROGRESS -->

                            <div class="
                                booking-details-progress-wrap
                            ">

                                <div class="
                                    booking-details-progress-top
                                ">

                                    <span>
                                        Payment Progress
                                    </span>

                                    <span class="
                                        booking-details-progress-percent
                                    ">
                                        ${
                                            paymentProgress.toFixed(
                                                0
                                            )
                                        }%
                                    </span>

                                </div>


                                <div class="
                                    booking-details-progress-track
                                ">

                                    <div class="
                                        booking-details-progress-fill
                                    "></div>

                                </div>


                                <div class="
                                    booking-details-progress-bottom
                                ">

                                    <span>
                                        Paid:
                                        <strong>
                                            ${
                                                formatMoney(
                                                    amountPaid
                                                )
                                            }
                                        </strong>
                                    </span>


                                    <span>
                                        Due:
                                        <strong>
                                            ${
                                                formatMoney(
                                                    amountDue
                                                )
                                            }
                                        </strong>
                                    </span>

                                </div>

                            </div>

                        </section>


                        <!-- PAYMENT HISTORY -->

                        <section class="
                            booking-details-section
                        ">

                            <h3 class="
                                booking-details-section-title
                            ">

                                <i class="
                                    fa-solid
                                    fa-clock-rotate-left
                                "></i>

                                Payment History

                            </h3>


                            ${
                                historyHtml
                            }

                        </section>


                        <!-- REQUIREMENTS -->

                        <section class="
                            booking-details-section
                        ">

                            <h3 class="
                                booking-details-section-title
                            ">

                                <i class="
                                    fa-solid
                                    fa-clipboard-list
                                "></i>

                                Requirements

                            </h3>


                            <div class="
                                booking-details-requirements
                            ">

                                ${
                                    escapeHtml(
                                        requirements
                                    )
                                }

                            </div>

                        </section>


                    </div>


                    <!-- FOOTER -->

                    <div class="
                        booking-details-footer
                    ">

                        <button
                            type="button"
                            id="
                                closeBookingDetailsBottom
                            "
                        >

                            <i class="
                                fa-solid
                                fa-xmark
                            "></i>

                            Close Details

                        </button>

                    </div>


                </div>

            `;


            // =================================================
            // SHOW MODAL
            // =================================================

            overlay.appendChild(
                modal
            );


            document.body.appendChild(
                overlay
            );


            // =================================================
            // CLOSE MODAL
            // =================================================

            const closeModal =
                () => {

                    overlay.remove();

                };


            const closeTop =
                modal.querySelector(
                    "#closeBookingDetails"
                );


            const closeBottom =
                modal.querySelector(
                    "#closeBookingDetailsBottom"
                );


            if (closeTop) {

                closeTop.addEventListener(
                    "click",
                    closeModal
                );

            }


            if (closeBottom) {

                closeBottom.addEventListener(
                    "click",
                    closeModal
                );

            }


            // Close by clicking outside.

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


            const scrollArea =
                modal.querySelector(
                    ".booking-details-scroll"
                );


            if (scrollArea) {

                scrollArea.scrollTop = 0;

            }

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