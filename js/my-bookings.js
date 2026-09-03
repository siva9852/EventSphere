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


        snapshot.forEach((bookingDoc) => {

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
                        onclick="payForBooking('${bookingDoc.id}')">

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

            <span>Partially Paid</span>

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
                    onerror="this.src='images/hero.jpg'"
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


                <div class="booking-bottom">


                    <button
                        type="button"
                        class="view-details-btn"
                        onclick="viewBookingDetails('${bookingDoc.id}')">

                        👁 View Details

                    </button>


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


                    ${paymentButton}


                    ${paidLabel}


                    ${
                        actualPaymentStatus === "Paid"
                        ? `

                            <button
                                type="button"
                                class="download-receipt-btn"
                                onclick="previewPaymentReceipt('${bookingDoc.id}')">

                                <i class="fa-solid fa-file-pdf"></i>

                                Preview Receipt

                            </button>

                        `
                        : ""
                    }


                </div>

            `;


            container.appendChild(card);

        });

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


            const amountPaid =
                Number(
                    booking.amountPaid ||
                    totalPrice
                );


            // =================================================
            // GET CUSTOMER NAME
            // =================================================

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
                "PAYMENT STATUS: PAID",
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


            pdf.setFillColor(
                24,
                54,
                111
            );


            pdf.roundedRect(
                20,
                230,
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
                246
            );


            pdf.setFontSize(17);


            pdf.text(
                `Rs. ${amountPaid.toLocaleString("en-IN")}`,
                180,
                246,
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
                270,
                {
                    align: "center"
                }
            );


            pdf.text(
                "This is a computer-generated payment receipt.",
                105,
                278,
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


            const amountPaid =
                Number(
                    booking.amountPaid ||
                    totalPrice
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

                        <i class="fa-solid fa-file-invoice"></i>

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
                                    margin-bottom:8px;
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
// VIEW BOOKING DETAILS
// =========================================================

window.viewBookingDetails =
    async function (bookingId) {

        try {

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
                        booking.amountPaid ||
                        0
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


            const actualPaymentStatus =
                amountDue <= 0
                    ? "Paid"
                    : amountPaid > 0
                        ? "Partially Paid"
                        : "Unpaid";


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


            const overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "booking-details-overlay";


            overlay.innerHTML = `

                <div class="booking-details-modal">

                    <button
                        type="button"
                        class="close-booking-details"
                        id="closeBookingDetails">

                        ×

                    </button>


                    <div class="booking-modal-icon">
                        🎉
                    </div>


                    <h2>
                        Booking Details
                    </h2>


                    <p class="booking-modal-event">
                        ${eventName}
                    </p>


                    <div class="
                        booking-modal-status
                        ${statusClass}
                    ">
                        ${statusText}
                    </div>


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
                                ₹${totalPrice.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Amount Paid
                            </span>

                            <strong>
                                ₹${amountPaid.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Amount Due
                            </span>

                            <strong>
                                ₹${amountDue.toLocaleString("en-IN")}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Payment Status
                            </span>

                            <strong>
                                ${actualPaymentStatus}
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


        closeButton.addEventListener(
            "click",
            () => {
                overlay.remove();
            }
        );


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


                    // =================================================
                    // SEND CANCELLATION EMAIL
                    // =================================================

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

                    catch (
                        emailError
                    ) {

                        console.error(
                            "Cancellation email error:",
                            emailError
                        );

                    }


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
);s