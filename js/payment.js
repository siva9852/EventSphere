import { db, auth } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// CONFIGURATION
// =========================================================

const API_BASE_URL =
    "https://eventsphere-dndh.onrender.com";


// =========================================================
// ELEMENTS
// =========================================================

const payButton =
    document.getElementById("payButton");

let paymentAmountInput =
    document.getElementById("paymentAmountInput");

let currentTotalAmount = 0;
let currentAmountPaid = 0;
let currentAmountDue = 0;
let currentPaymentAmount = 0;


// =========================================================
// LOAD RAZORPAY SCRIPT
// =========================================================

function loadRazorpayScript() {
    return new Promise((resolve, reject) => {

        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () => {
            resolve(true);
        };

        script.onerror = () => {
            reject(
                new Error(
                    "Unable to load Razorpay Checkout."
                )
            );
        };

        document.head.appendChild(script);
    });
}


// =========================================================
// LOAD jsPDF
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
                document.createElement("script");

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
// SET ELEMENT TEXT SAFELY
// =========================================================

function setElementText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "Not specified";
    }
}


// =========================================================
// PARTIAL PAYMENT UI
// =========================================================

function ensurePartialPaymentUI() {

    if (document.getElementById("partialPaymentBox")) {

        paymentAmountInput =
            document.getElementById("paymentAmountInput");

        return;
    }

    if (
        !payButton ||
        !payButton.parentElement
    ) {
        return;
    }

    const box =
        document.createElement("div");

    box.id =
        "partialPaymentBox";

    box.style.cssText = `
        margin: 18px 0;
        padding: 18px;
        border: 1px solid #dbe3ef;
        border-radius: 12px;
        background: #f8fafc;
    `;

    box.innerHTML = `
        <div style="
            font-weight:700;
            color:#1e3a8a;
            font-size:16px;
            margin-bottom:14px;
        ">
            Payment Summary
        </div>

        <div style="
            display:grid;
            grid-template-columns:
                repeat(3,minmax(0,1fr));
            gap:12px;
            margin-bottom:16px;
        ">

            <div style="
                padding:12px;
                background:#fff;
                border-radius:9px;
                border:1px solid #e2e8f0;
            ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                ">
                    Total Amount
                </div>

                <div
                    id="paymentTotalAmount"
                    style="
                        font-weight:700;
                        color:#0f172a;
                        margin-top:4px;
                    "
                >
                    ₹0
                </div>
            </div>


            <div style="
                padding:12px;
                background:#fff;
                border-radius:9px;
                border:1px solid #e2e8f0;
            ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                ">
                    Already Paid
                </div>

                <div
                    id="paymentPaidAmount"
                    style="
                        font-weight:700;
                        color:#15803d;
                        margin-top:4px;
                    "
                >
                    ₹0
                </div>
            </div>


            <div style="
                padding:12px;
                background:#fff;
                border-radius:9px;
                border:1px solid #e2e8f0;
            ">
                <div style="
                    font-size:12px;
                    color:#64748b;
                ">
                    Amount Due
                </div>

                <div
                    id="paymentDueAmount"
                    style="
                        font-weight:700;
                        color:#dc2626;
                        margin-top:4px;
                    "
                >
                    ₹0
                </div>
            </div>

        </div>


        <label
            for="paymentAmountInput"
            style="
                display:block;
                font-size:13px;
                font-weight:600;
                color:#334155;
                margin-bottom:7px;
            "
        >
            <span id="paymentAmountLabel">
                Amount to Pay Now
            </span>
        </label>


        <input
            type="number"
            id="paymentAmountInput"
            min="1"
            step="1"
            placeholder="Enter amount"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px 13px;
                border:1px solid #cbd5e1;
                border-radius:8px;
                font-size:15px;
                outline:none;
                background:#fff;
            "
        >


        <div style="
            font-size:12px;
            color:#64748b;
            margin-top:7px;
        ">
            You can pay any amount up to the current due amount.
            You can pay the remaining amount later.
        </div>
    `;

    payButton.parentElement.insertBefore(
        box,
        payButton
    );

    paymentAmountInput =
        document.getElementById(
            "paymentAmountInput"
        );
}


// =========================================================
// LOAD PAYMENT BOOKING
// =========================================================

async function loadPaymentBooking() {

    const user =
        auth.currentUser;


    // =====================================================
    // CHECK LOGIN
    // =====================================================

    if (!user) {

        window.location.href =
            "customer-login.html";

        return;
    }


    // =====================================================
    // GET BOOKING ID
    // =====================================================

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const urlBookingId =
        urlParams.get(
            "bookingId"
        );


    const bookingId =
        urlBookingId ||
        localStorage.getItem(
            "paymentBookingId"
        );


    if (urlBookingId) {

        localStorage.setItem(
            "paymentBookingId",
            urlBookingId
        );
    }


    // =====================================================
    // CHECK BOOKING ID
    // =====================================================

    if (!bookingId) {

        console.error(
            "Payment booking ID not found."
        );


        setElementText(
            "eventName",
            "Booking not found"
        );


        setElementText(
            "eventDate",
            "Not available"
        );


        setElementText(
            "guestCount",
            "Not available"
        );


        setElementText(
            "eventLocation",
            "Not available"
        );


        setElementText(
            "eventPrice",
            "₹0"
        );


        if (payButton) {

            payButton.disabled =
                true;
        }

        return;
    }


    console.log(
        "Loading payment booking:",
        bookingId
    );


    try {

        // =================================================
        // GET BOOKING
        // =================================================

        const bookingReference =
            doc(
                db,
                "bookings",
                bookingId
            );


        const bookingSnapshot =
            await getDoc(
                bookingReference
            );


        // =================================================
        // BOOKING NOT FOUND
        // =================================================

        if (
            !bookingSnapshot.exists()
        ) {

            console.error(
                "Booking document does not exist:",
                bookingId
            );


            setElementText(
                "eventName",
                "Booking not found"
            );


            setElementText(
                "eventDate",
                "Not available"
            );


            setElementText(
                "guestCount",
                "Not available"
            );


            setElementText(
                "eventLocation",
                "Not available"
            );


            setElementText(
                "eventPrice",
                "₹0"
            );


            if (payButton) {

                payButton.disabled =
                    true;
            }


            return;
        }


        // =================================================
        // BOOKING DATA
        // =================================================

        const booking =
            bookingSnapshot.data();


        console.log(
            "Payment booking loaded:",
            booking
        );


        // =================================================
        // SECURITY CHECK
        // =================================================

        if (
            booking.customerId &&
            booking.customerId !== user.uid
        ) {

            console.error(
                "Customer does not own this booking."
            );


            setElementText(
                "eventName",
                "Access denied"
            );


            setElementText(
                "eventDate",
                "Not available"
            );


            setElementText(
                "guestCount",
                "Not available"
            );


            setElementText(
                "eventLocation",
                "Not available"
            );


            setElementText(
                "eventPrice",
                "₹0"
            );


            if (payButton) {

                payButton.disabled =
                    true;
            }


            return;
        }


        // =================================================
        // DISPLAY EVENT
        // =================================================

        setElementText(
            "eventName",
            booking.eventName ||
            booking.event ||
            "Event"
        );


        // =================================================
        // DISPLAY DATE
        // =================================================

        setElementText(
            "eventDate",
            booking.eventDate ||
            "Not specified"
        );


        // =================================================
        // DISPLAY GUESTS
        // =================================================

        setElementText(
            "guestCount",
            booking.guests ||
            booking.guestCount ||
            booking.numberOfGuests ||
            "Not specified"
        );


        // =================================================
        // DISPLAY LOCATION
        // =================================================

        setElementText(
            "eventLocation",
            booking.location ||
            booking.eventLocation ||
            "Not specified"
        );


        // =================================================
        // DISPLAY PRICE
        // =================================================

        const amount =
            Number(
                booking.price ||
                booking.amount ||
                booking.totalAmount ||
                0
            );


        // =================================================
        // PREVIOUSLY PAID AMOUNT
        // =================================================

        const storedPaid =
            booking.amountPaid !== undefined
                ? Number(
                    booking.amountPaid || 0
                )
                : booking.paymentStatus === "Paid"
                    ? amount
                    : 0;


        const paid =
            Math.max(
                0,
                Math.min(
                    storedPaid,
                    amount
                )
            );


        // =================================================
        // CURRENT DUE AMOUNT
        // =================================================

        const due =
            Math.max(
                0,
                Number(
                    (
                        amount -
                        paid
                    ).toFixed(2)
                )
            );


        currentTotalAmount =
            amount;

        currentAmountPaid =
            paid;

        currentAmountDue =
            due;

        currentPaymentAmount =
            due;


        // =================================================
        // DISPLAY CURRENT DUE
        // =================================================

        setElementText(
            "eventPrice",
            "₹" +
            due.toLocaleString(
                "en-IN"
            )
        );


        // =================================================
        // DISPLAY PAYMENT SUMMARY
        // =================================================

        setElementText(
            "paymentTotalAmount",
            "₹" +
            amount.toLocaleString(
                "en-IN"
            )
        );


        setElementText(
            "paymentPaidAmount",
            "₹" +
            paid.toLocaleString(
                "en-IN"
            )
        );


        setElementText(
            "paymentDueAmount",
            "₹" +
            due.toLocaleString(
                "en-IN"
            )
        );


        setElementText(
            "paymentAmountLabel",
            due > 0
                ? "Amount to Pay Now"
                : "Amount to Pay"
        );


        // =================================================
        // PAYMENT INPUT
        // =================================================

        if (paymentAmountInput) {

            paymentAmountInput.value =
                due > 0
                    ? due
                    : "";

            paymentAmountInput.max =
                due;
        }


        // =================================================
        // SAVE BOOKING ID
        // =================================================

        if (payButton) {

            payButton.dataset.bookingId =
                bookingId;
        }


        // =================================================
        // FULLY PAID
        // =================================================

        if (
            due <= 0 ||
            booking.paymentStatus === "Paid"
        ) {

            if (payButton) {

                payButton.disabled =
                    true;

                payButton.innerHTML =
                    "✓ Fully Paid";
            }


            return;
        }


        // =================================================
        // APPROVAL CHECK
        // =================================================

        if (
            booking.status !==
            "Approved"
        ) {

            if (payButton) {

                payButton.disabled =
                    true;

                payButton.innerHTML =
                    "Payment Not Available";
            }


            return;
        }


        // =================================================
        // PAYMENT AVAILABLE
        // =================================================

        if (payButton) {

            payButton.disabled =
                false;

            payButton.innerHTML = `
                <i class="fa-solid fa-lock"></i>
                Pay Now
            `;
        }

    }


    catch (error) {

        console.error(
            "Payment Booking Error:",
            error
        );


        setElementText(
            "eventName",
            "Unable to load booking"
        );


        setElementText(
            "eventDate",
            "Please refresh the page"
        );


        setElementText(
            "guestCount",
            "Not available"
        );


        setElementText(
            "eventLocation",
            "Not available"
        );


        setElementText(
            "eventPrice",
            "₹0"
        );


        if (payButton) {

            payButton.disabled =
                true;
        }
    }
}


// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

async function createPaymentOrder(
    bookingId,
    idToken,
    paymentAmount
) {

    const response =
        await fetch(
            `${API_BASE_URL}/create-payment-order`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body:
                    JSON.stringify({

                        bookingId:
                            bookingId,

                        paymentAmount:
                            paymentAmount
                    })
            }
        );


    const responseText =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                responseText
            );

    }

    catch {

        console.error(
            "Server returned non-JSON response:",
            responseText
        );


        throw new Error(
            `Server error (${response.status}).`
        );
    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Payment order failed (${response.status}).`
        );
    }


    if (!data.success) {

        throw new Error(
            data.message ||
            "Unable to create payment order."
        );
    }


    return data;
}


// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

async function verifyPayment(
    bookingId,
    paymentResponse,
    idToken
) {

    const response =
        await fetch(
            `${API_BASE_URL}/verify-payment`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body:
                    JSON.stringify({

                        bookingId:
                            bookingId,

                        razorpay_order_id:
                            paymentResponse
                                .razorpay_order_id,

                        razorpay_payment_id:
                            paymentResponse
                                .razorpay_payment_id,

                        razorpay_signature:
                            paymentResponse
                                .razorpay_signature
                    })
            }
        );


    const responseText =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                responseText
            );

    }

    catch {

        console.error(
            "Verify server returned non-JSON:",
            responseText
        );


        throw new Error(
            `Payment verification server error (${response.status}).`
        );
    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Payment verification failed (${response.status}).`
        );
    }


    if (!data.success) {

        throw new Error(
            data.message ||
            "Payment verification failed."
        );
    }


    return data;
}


// =========================================================
// GENERATE PAYMENT RECEIPT PDF
// =========================================================

async function generatePaymentReceipt(
    bookingId,
    booking,
    razorpayResponse,
    user,
    verification = {}
) {

    try {

        const jsPDF =
            await loadJsPDF();


        const pdf =
            new jsPDF();


        // =================================================
        // DATA
        // =================================================

        const eventName =
            booking.eventName ||
            booking.event ||
            "Event";


        const eventDate =
            booking.eventDate ||
            "Not specified";


        const guests =
            booking.guests ||
            booking.guestCount ||
            booking.numberOfGuests ||
            "Not specified";


        const location =
            booking.location ||
            booking.eventLocation ||
            "Not specified";


        // =================================================
        // CURRENT PAYMENT AMOUNT
        // =================================================

        const amount =
            Number(
                verification.paymentAmount ||
                currentPaymentAmount ||
                booking.price ||
                booking.amount ||
                booking.totalAmount ||
                0
            );


        // =================================================
        // TOTAL PAID SO FAR
        // =================================================

        const totalPaid =
            Number(
                verification.amountPaid ||
                0
            );


        // =================================================
        // REMAINING AMOUNT
        // =================================================

        const amountDue =
            Number(
                verification.amountDue ||
                0
            );


        // =================================================
        // PAYMENT STATUS
        // =================================================

        const receiptStatus =
            verification.paymentStatus ===
            "Paid"
                ? "PAID"
                : "PARTIALLY PAID";


        // =================================================
        // PAYMENT ID
        // =================================================

        const paymentId =
            razorpayResponse
                ?.razorpay_payment_id ||
            "Not available";


        // =================================================
        // ORDER ID
        // =================================================

        const orderId =
            razorpayResponse
                ?.razorpay_order_id ||
            booking.razorpayOrderId ||
            "Not available";


        // =================================================
        // CUSTOMER NAME
        // =================================================

        const customerName =
            user.displayName ||
            booking.customerName ||
            "Customer";


        // =================================================
        // CUSTOMER EMAIL
        // =================================================

        const customerEmail =
            user.email ||
            booking.customerEmail ||
            "Not available";


        // =================================================
        // RECEIPT DATE
        // =================================================

        const receiptDate =
            new Date()
                .toLocaleString(
                    "en-IN"
                );


        // =================================================
        // FORMATTED AMOUNT
        // =================================================

        const formattedAmount =
            "Rs. " +
            amount.toLocaleString(
                "en-IN"
            );


        // =================================================
        // PAGE
        // =================================================

        pdf.setFont(
            "helvetica",
            "normal"
        );


        // =================================================
        // HEADER
        // =================================================

        pdf.setFontSize(
            25
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            "EventSphere",
            105,
            30,
            {
                align:
                    "center"
            }
        );


        pdf.setFontSize(
            18
        );


        pdf.text(
            "PAYMENT RECEIPT",
            105,
            43,
            {
                align:
                    "center"
            }
        );


        pdf.setLineWidth(
            0.6
        );


        pdf.line(
            20,
            52,
            190,
            52
        );


        // =================================================
        // PAYMENT STATUS
        // =================================================

        pdf.setFontSize(
            13
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            `Payment Status: ${receiptStatus}`,
            105,
            66,
            {
                align:
                    "center"
            }
        );


        // =================================================
        // CUSTOMER DETAILS
        // =================================================

        pdf.setFontSize(
            12
        );


        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            "Customer Details",
            20,
            85
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.text(
            `Name: ${customerName}`,
            20,
            96
        );


        pdf.text(
            `Email: ${customerEmail}`,
            20,
            106
        );


        // =================================================
        // BOOKING DETAILS
        // =================================================

        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            "Booking Details",
            20,
            125
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.text(
            `Booking ID: ${bookingId}`,
            20,
            137
        );


        pdf.text(
            `Event: ${eventName}`,
            20,
            147
        );


        pdf.text(
            `Event Date: ${eventDate}`,
            20,
            157
        );


        pdf.text(
            `Guests: ${guests}`,
            20,
            167
        );


        pdf.text(
            `Location: ${location}`,
            20,
            177
        );


        // =================================================
        // PAYMENT DETAILS
        // =================================================

        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.text(
            "Payment Details",
            20,
            197
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.text(
            `Razorpay Order ID: ${orderId}`,
            20,
            209
        );


        pdf.text(
            `Razorpay Payment ID: ${paymentId}`,
            20,
            219
        );


        pdf.text(
            `Payment Date: ${receiptDate}`,
            20,
            229
        );


        // =================================================
        // AMOUNT
        // =================================================

        pdf.setFont(
            "helvetica",
            "bold"
        );


        pdf.setFontSize(
            16
        );


        pdf.text(
            `Amount Paid This Time: ${formattedAmount}`,
            20,
            252
        );


        pdf.setFontSize(
            12
        );


        pdf.text(
            `Total Paid So Far: Rs. ${totalPaid.toLocaleString("en-IN")}`,
            20,
            264
        );


        pdf.text(
            `Amount Remaining: Rs. ${amountDue.toLocaleString("en-IN")}`,
            20,
            270
        );


        // =================================================
        // FOOTER
        // =================================================

        pdf.setFontSize(
            10
        );


        pdf.setFont(
            "helvetica",
            "normal"
        );


        pdf.text(
            "Thank you for booking with EventSphere!",
            105,
            283,
            {
                align:
                    "center"
            }
        );


        pdf.text(
            "This is a computer-generated payment receipt.",
            105,
            291,
            {
                align:
                    "center"
            }
        );


        // =================================================
        // DOWNLOAD
        // =================================================

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


        return true;

    }


    catch (error) {

        console.error(
            "Receipt Generation Error:",
            error
        );


        return false;
    }
}

// =========================================================
// START RAZORPAY PAYMENT
// =========================================================

async function startPayment() {

    const user =
        auth.currentUser;


    // =====================================================
    // CHECK LOGIN
    // =====================================================

    if (!user) {

        alert(
            "Please login first."
        );


        window.location.href =
            "customer-login.html";


        return;
    }


    // =====================================================
    // GET BOOKING ID
    // =====================================================

    const bookingId =
        payButton?.dataset.bookingId ||

        new URLSearchParams(
            window.location.search
        ).get("bookingId") ||

        localStorage.getItem(
            "paymentBookingId"
        );


    if (!bookingId) {

        alert(
            "Booking information not found."
        );


        return;
    }


    // =====================================================
    // GET PAYMENT AMOUNT
    // =====================================================

    const enteredAmount =
        Number(
            paymentAmountInput?.value ||
            currentAmountDue
        );


    // =====================================================
    // VALIDATE AMOUNT
    // =====================================================

    if (
        !Number.isFinite(
            enteredAmount
        ) ||
        enteredAmount <= 0
    ) {

        alert(
            "Please enter a valid payment amount."
        );


        return;
    }


    // =====================================================
    // DO NOT ALLOW MORE THAN DUE
    // =====================================================

    if (
        enteredAmount >
        currentAmountDue + 0.01
    ) {

        alert(
            "You cannot pay more than the remaining due amount of ₹" +
            currentAmountDue.toLocaleString(
                "en-IN"
            )
        );


        return;
    }


    // =====================================================
    // STORE CURRENT PAYMENT
    // =====================================================

    currentPaymentAmount =
        Number(
            enteredAmount.toFixed(2)
        );


    try {

        // =================================================
        // DISABLE BUTTON
        // =================================================

        if (payButton) {

            payButton.disabled =
                true;


            payButton.innerHTML = `
                🔄 Processing Payment...
            `;
        }


        // =================================================
        // FIREBASE TOKEN
        // =================================================

        const idToken =
            await user.getIdToken();


        // =================================================
        // LOAD RAZORPAY
        // =================================================

        await loadRazorpayScript();


        // =================================================
        // CREATE PAYMENT ORDER
        // =================================================

        const orderData =
            await createPaymentOrder(
                bookingId,
                idToken,
                currentPaymentAmount
            );


        console.log(
            "Razorpay Order Created:",
            orderData
        );


        // =================================================
        // GET FRESH BOOKING
        // =================================================

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


        // =================================================
        // RAZORPAY OPTIONS
        // =================================================

        const options = {

            key:
                orderData.keyId,


            // IMPORTANT:
            // Razorpay receives ONLY
            // the amount selected by customer.

            amount:
                orderData.amount,


            currency:
                orderData.currency ||
                "INR",


            name:
                "EventSphere",


            description:
                "Event Booking Payment",


            order_id:
                orderData.orderId,


            // =================================================
            // CUSTOMER DETAILS
            // =================================================

            prefill: {

                name:
                    user.displayName ||
                    booking.customerName ||
                    "",


                email:
                    user.email ||
                    booking.customerEmail ||
                    ""
            },


            // =================================================
            // RAZORPAY THEME
            // =================================================

            theme: {

                color:
                    "#2563eb"
            },


            // =================================================
            // PAYMENT SUCCESS
            // =================================================

            handler:
                async function (
                    razorpayResponse
                ) {

                    try {

                        // =====================================
                        // VERIFYING
                        // =====================================

                        if (payButton) {

                            payButton.innerHTML = `
                                🔄 Verifying Payment...
                            `;
                        }


                        console.log(
                            "Razorpay Payment Response:",
                            razorpayResponse
                        );


                        // =====================================
                        // FRESH FIREBASE TOKEN
                        // =====================================

                        const latestToken =
                            await user.getIdToken(
                                true
                            );


                        // =====================================
                        // VERIFY PAYMENT
                        // =====================================

                        const verification =
                            await verifyPayment(
                                bookingId,
                                razorpayResponse,
                                latestToken
                            );


                        console.log(
                            "Payment Verification:",
                            verification
                        );


                        // =====================================
                        // GENERATE RECEIPT
                        // =====================================

                        await generatePaymentReceipt(
                            bookingId,
                            booking,
                            razorpayResponse,
                            user,
                            verification
                        );


                        // =====================================
                        // REMOVE LOCAL BOOKING ID
                        // =====================================

                        localStorage.removeItem(
                            "paymentBookingId"
                        );


                        // =====================================
                        // SUCCESS MESSAGE
                        // =====================================

                        if (
                            verification.paymentStatus ===
                            "Paid"
                        ) {

                            alert(
                                "Payment successful! Your booking is fully paid. Your payment receipt has been downloaded."
                            );

                        }

                        else {

                            const remaining =
                                Number(
                                    verification.amountDue ||
                                    0
                                );


                            alert(
                                "Payment successful! ₹" +
                                Number(
                                    verification.paymentAmount ||
                                    currentPaymentAmount
                                ).toLocaleString(
                                    "en-IN"
                                ) +
                                " paid.\n\n" +
                                "Remaining amount: ₹" +
                                remaining.toLocaleString(
                                    "en-IN"
                                ) +
                                "\n\nYour payment receipt has been downloaded."
                            );
                        }


                        // =====================================
                        // GO TO MY BOOKINGS
                        // =====================================

                        window.location.href =
                            "my-bookings.html";

                    }


                    catch (error) {

                        console.error(
                            "Payment Verification Error:",
                            error
                        );


                        alert(
                            error.message ||
                            "Payment verification failed."
                        );


                        if (payButton) {

                            payButton.disabled =
                                false;


                            payButton.innerHTML = `
                                <i class="fa-solid fa-lock"></i>
                                Pay Now
                            `;
                        }
                    }
                },


            // =================================================
            // PAYMENT MODAL CLOSED
            // =================================================

            modal: {

                ondismiss:
                    function () {

                        console.log(
                            "Razorpay payment window closed."
                        );


                        if (payButton) {

                            payButton.disabled =
                                false;


                            payButton.innerHTML = `
                                <i class="fa-solid fa-lock"></i>
                                Pay Now
                            `;
                        }
                    }
            }
        };


        // =================================================
        // CREATE RAZORPAY INSTANCE
        // =================================================

        const razorpay =
            new window.Razorpay(
                options
            );


        // =================================================
        // PAYMENT FAILED
        // =================================================

        razorpay.on(
            "payment.failed",
            function (
                response
            ) {

                console.error(
                    "Razorpay Payment Failed:",
                    response
                );


                alert(
                    response.error?.description ||
                    "Payment failed."
                );


                if (payButton) {

                    payButton.disabled =
                        false;


                    payButton.innerHTML = `
                        <i class="fa-solid fa-lock"></i>
                        Pay Now
                    `;
                }
            }
        );


        // =================================================
        // OPEN RAZORPAY
        // =================================================

        razorpay.open();

    }


    catch (error) {

        console.error(
            "Payment Error:",
            error
        );


        alert(
            error.message ||
            "Unable to start payment."
        );


        if (payButton) {

            payButton.disabled =
                false;


            payButton.innerHTML = `
                <i class="fa-solid fa-lock"></i>
                Pay Now
            `;
        }
    }
}


// =========================================================
// PAYMENT AMOUNT INPUT VALIDATION
// =========================================================

if (paymentAmountInput) {

    paymentAmountInput.addEventListener(
        "input",
        function () {

            const value =
                Number(
                    this.value
                );


            if (
                Number.isFinite(value) &&
                value > currentAmountDue
            ) {

                this.setCustomValidity(
                    "Payment amount cannot be greater than the remaining due amount."
                );

            }

            else {

                this.setCustomValidity(
                    ""
                );
            }
        }
    );
}


// =========================================================
// PAY BUTTON
// =========================================================

if (payButton) {

    payButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            startPayment();
        }
    );
}


// =========================================================
// CREATE PARTIAL PAYMENT UI
// =========================================================

ensurePartialPaymentUI();


// =========================================================
// AUTH STATE
// =========================================================

auth.onAuthStateChanged(
    function (user) {

        if (user) {

            loadPaymentBooking();
        }

        else {

            window.location.href =
                "customer-login.html";
        }
    }
);