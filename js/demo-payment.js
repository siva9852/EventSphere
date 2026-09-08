import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// CONFIGURATION
// =========================================================

const API_BASE_URL =
    "http://127.0.0.1:3000";


// =========================================================
// VARIABLES
// =========================================================

let demoPaymentModal = null;


// =========================================================
// HELPER
// =========================================================

function formatMoney(amount) {

    return "₹" +
        Number(amount || 0)
            .toLocaleString("en-IN");

}


// =========================================================
// GET BOOKING ID
// =========================================================

function getBookingId() {

    return localStorage.getItem(
        "paymentBookingId"
    );

}


// =========================================================
// CREATE DEMO PAYMENT UI
// =========================================================

function createDemoPaymentUI() {

    if (
        document.getElementById(
            "demoPaymentSection"
        )
    ) {
        return;
    }


    const payButton =
        document.getElementById(
            "payButton"
        );


    if (!payButton) {
        return;
    }


    const section =
        document.createElement("div");


    section.id =
        "demoPaymentSection";


    section.style.cssText = `
        margin-top: 20px;
        padding: 22px;
        border: 1px solid #dbe3ef;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 8px 25px rgba(15,23,42,0.06);
    `;


    section.innerHTML = `

        <div style="
            display:flex;
            align-items:center;
            gap:10px;
            margin-bottom:8px;
        ">

            <span style="
                font-size:22px;
            ">
                🧪
            </span>

            <h3 style="
                margin:0;
                color:#172554;
                font-size:20px;
            ">
                Demo Payment Mode
            </h3>

        </div>


        <p style="
            margin:0 0 18px;
            color:#64748b;
            font-size:14px;
            line-height:1.5;
        ">
            Test the payment interface without
            transferring real money.
        </p>


        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fit,minmax(140px,1fr));
            gap:12px;
        ">


            <button
                type="button"
                class="demo-payment-method"
                data-method="upi">

                <span style="font-size:25px;">
                    📱
                </span>

                <strong>
                    Demo UPI
                </strong>

                <small>
                    Pay using UPI
                </small>

            </button>


            <button
                type="button"
                class="demo-payment-method"
                data-method="qr">

                <span style="font-size:25px;">
                    📷
                </span>

                <strong>
                    Demo QR
                </strong>

                <small>
                    Scan QR code
                </small>

            </button>


            <button
                type="button"
                class="demo-payment-method"
                data-method="card">

                <span style="font-size:25px;">
                    💳
                </span>

                <strong>
                    Demo Card
                </strong>

                <small>
                    Test card payment
                </small>

            </button>


            <button
                type="button"
                class="demo-payment-method"
                data-method="netbanking">

                <span style="font-size:25px;">
                    🏦
                </span>

                <strong>
                    Net Banking
                </strong>

                <small>
                    Demo banking
                </small>

            </button>


            <button
                type="button"
                class="demo-payment-method"
                data-method="wallet">

                <span style="font-size:25px;">
                    👛
                </span>

                <strong>
                    Demo Wallet
                </strong>

                <small>
                    Test wallet
                </small>

            </button>

        </div>


        <div style="
            margin-top:15px;
            padding:10px 12px;
            background:#f0fdf4;
            border:1px solid #bbf7d0;
            border-radius:9px;
            color:#166534;
            font-size:12px;
        ">

            ✓ Demo payments never transfer real money.

        </div>

    `;


    payButton.parentElement.insertBefore(
        section,
        payButton
    );


    addDemoPaymentStyles();


    document
        .querySelectorAll(
            ".demo-payment-method"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const method =
                            this.dataset.method;

                        openDemoPayment(
                            method
                        );

                    }
                );

            }
        );

}


// =========================================================
// STYLES
// =========================================================

function addDemoPaymentStyles() {

    if (
        document.getElementById(
            "demoPaymentStyles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");


    style.id =
        "demoPaymentStyles";


    style.textContent = `

        .demo-payment-method {

            border:1px solid #dbe3ef;

            background:#f8fafc;

            border-radius:12px;

            padding:16px 10px;

            display:flex;

            flex-direction:column;

            align-items:center;

            justify-content:center;

            gap:5px;

            cursor:pointer;

            transition:0.2s;

            min-height:115px;

            color:#172554;

        }


        .demo-payment-method:hover {

            transform:translateY(-2px);

            border-color:#2563eb;

            background:#eff6ff;

            box-shadow:
                0 8px 20px
                rgba(37,99,235,0.10);

        }


        .demo-payment-method strong {

            font-size:14px;

        }


        .demo-payment-method small {

            font-size:11px;

            color:#64748b;

        }


        .demo-modal-overlay {

            position:fixed;

            inset:0;

            background:
                rgba(15,23,42,0.62);

            display:flex;

            align-items:center;

            justify-content:center;

            padding:20px;

            z-index:99999;

            backdrop-filter:blur(4px);

        }


        .demo-modal {

            width:100%;

            max-width:460px;

            background:#ffffff;

            border-radius:18px;

            padding:25px;

            box-shadow:
                0 25px 70px
                rgba(15,23,42,0.28);

            position:relative;

            max-height:90vh;

            overflow-y:auto;

        }


        .demo-close {

            position:absolute;

            top:12px;

            right:14px;

            width:34px;

            height:34px;

            border:none;

            border-radius:50%;

            background:#f1f5f9;

            color:#475569;

            font-size:20px;

            cursor:pointer;

        }


        .demo-close:hover {

            background:#e2e8f0;

        }


        .demo-pay-now {

            width:100%;

            height:46px;

            border:none;

            border-radius:10px;

            background:#2563eb;

            color:white;

            font-weight:700;

            font-size:15px;

            cursor:pointer;

            margin-top:15px;

        }


        .demo-pay-now:hover {

            background:#1d4ed8;

        }


        .demo-pay-now:disabled {

            opacity:0.6;

            cursor:not-allowed;

        }


        .demo-input {

            width:100%;

            box-sizing:border-box;

            padding:11px 12px;

            border:1px solid #cbd5e1;

            border-radius:9px;

            font-size:14px;

            outline:none;

        }


        .demo-input:focus {

            border-color:#2563eb;

            box-shadow:
                0 0 0 3px
                rgba(37,99,235,0.10);

        }


        .demo-summary {

            background:#f8fafc;

            border:1px solid #e2e8f0;

            border-radius:12px;

            padding:15px;

            margin:15px 0;

        }


        .demo-summary-row {

            display:flex;

            justify-content:space-between;

            padding:6px 0;

            font-size:14px;

        }


        .demo-summary-row strong {

            color:#172554;

        }


        .demo-qr {

            display:flex;

            justify-content:center;

            align-items:center;

            margin:20px auto;

            padding:15px;

            width:max-content;

            background:#ffffff;

            border:1px solid #e2e8f0;

            border-radius:12px;

        }

    `;


    document.head.appendChild(
        style
    );

}


// =========================================================
// GET BOOKING
// =========================================================

async function getBooking() {

    const bookingId =
        getBookingId();


    if (!bookingId) {

        throw new Error(
            "Booking ID was not found."
        );

    }


    const snapshot =
        await getDoc(
            doc(
                db,
                "bookings",
                bookingId
            )
        );


    if (!snapshot.exists()) {

        throw new Error(
            "Booking not found."
        );

    }


    return {

        id: bookingId,

        ...snapshot.data()

    };

}


// =========================================================
// OPEN DEMO PAYMENT
// =========================================================

async function openDemoPayment(
    method
) {

    try {

        const booking =
            await getBooking();


        const totalAmount =
            Number(
                booking.price ||
                booking.amount ||
                booking.totalAmount ||
                0
            );


        const amountPaid =
            Number(
                booking.amountPaid ||
                0
            );


        const amountDue =
            Math.max(
                0,
                totalAmount -
                amountPaid
            );


        if (amountDue <= 0) {

            alert(
                "This booking is already fully paid."
            );

            return;

        }


        let paymentInput =
            document.getElementById(
                "paymentAmountInput"
            );


        let selectedAmount =
            Number(
                paymentInput?.value ||
                amountDue
            );


        if (
            !Number.isFinite(
                selectedAmount
            ) ||
            selectedAmount <= 0
        ) {

            selectedAmount =
                amountDue;

        }


        if (
            selectedAmount >
            amountDue
        ) {

            alert(
                "Payment amount cannot be greater than ₹" +
                amountDue.toLocaleString(
                    "en-IN"
                )
            );

            return;

        }


        showDemoModal(
            booking,
            totalAmount,
            amountPaid,
            amountDue,
            selectedAmount,
            method
        );

    }

    catch (error) {

        console.error(
            "Demo Payment Error:",
            error
        );

        alert(
            error.message ||
            "Unable to open demo payment."
        );

    }

}


// =========================================================
// METHOD NAME
// =========================================================

function getMethodName(
    method
) {

    const names = {

        upi:
            "📱 Demo UPI",

        qr:
            "📷 Demo QR Scanner",

        card:
            "💳 Demo Card",

        netbanking:
            "🏦 Demo Net Banking",

        wallet:
            "👛 Demo Wallet"

    };


    return (
        names[method] ||
        "Demo Payment"
    );

}


// =========================================================
// SHOW DEMO MODAL
// =========================================================

function showDemoModal(
    booking,
    totalAmount,
    amountPaid,
    amountDue,
    selectedAmount,
    method
) {

    closeDemoModal();


    demoPaymentModal =
        document.createElement(
            "div"
        );


    demoPaymentModal.className =
        "demo-modal-overlay";


    demoPaymentModal.innerHTML = `

        <div class="demo-modal">

            <button
                type="button"
                class="demo-close"
                id="demoCloseButton">

                ×

            </button>


            <div style="
                text-align:center;
                margin-bottom:5px;
            ">

                <div style="
                    font-size:34px;
                    margin-bottom:7px;
                ">
                    🧪
                </div>

                <h2 style="
                    margin:0;
                    color:#172554;
                    font-size:22px;
                ">
                    ${getMethodName(method)}
                </h2>

                <p style="
                    color:#64748b;
                    font-size:13px;
                    margin:6px 0 0;
                ">
                    Demo payment — no real money
                </p>

            </div>


            <div class="demo-summary">

                <div class="demo-summary-row">

                    <span>
                        Event
                    </span>

                    <strong>
                        ${escapeHtml(
                            booking.eventName ||
                            booking.event ||
                            "Event"
                        )}
                    </strong>

                </div>


                <div class="demo-summary-row">

                    <span>
                        Total
                    </span>

                    <strong>
                        ${formatMoney(
                            totalAmount
                        )}
                    </strong>

                </div>


                <div class="demo-summary-row">

                    <span>
                        Already Paid
                    </span>

                    <strong style="
                        color:#15803d;
                    ">
                        ${formatMoney(
                            amountPaid
                        )}
                    </strong>

                </div>


                <div class="demo-summary-row">

                    <span>
                        Remaining
                    </span>

                    <strong style="
                        color:#dc2626;
                    ">
                        ${formatMoney(
                            amountDue
                        )}
                    </strong>

                </div>

            </div>


            <label style="
                display:block;
                font-size:13px;
                font-weight:700;
                color:#334155;
                margin-bottom:6px;
            ">
                Demo Payment Amount
            </label>


            <input
                type="number"
                id="demoPaymentAmount"
                class="demo-input"
                min="1"
                max="${amountDue}"
                step="0.01"
                value="${selectedAmount}">


            <div
                id="demoMethodArea"
                style="margin-top:15px;">
            </div>


            <button
                type="button"
                id="demoPayNowButton"
                class="demo-pay-now">

                ✓ Demo Pay ${formatMoney(
                    selectedAmount
                )}

            </button>


            <div style="
                margin-top:12px;
                text-align:center;
                color:#64748b;
                font-size:11px;
            ">
                This is a simulated payment for
                EventSphere testing only.
            </div>

        </div>

    `;


    document.body.appendChild(
        demoPaymentModal
    );


    document
        .getElementById(
            "demoCloseButton"
        )
        .addEventListener(
            "click",
            closeDemoModal
        );


    setupDemoMethodArea(
        method,
        booking,
        selectedAmount
    );


    const amountInput =
        document.getElementById(
            "demoPaymentAmount"
        );


    const payButton =
        document.getElementById(
            "demoPayNowButton"
        );


    amountInput.addEventListener(
        "input",
        function () {

            const amount =
                Number(
                    this.value
                );


            payButton.textContent =
                "✓ Demo Pay " +
                formatMoney(
                    amount
                );

        }
    );


    payButton.addEventListener(
        "click",
        function () {

            processDemoPayment(
                booking.id,
                method
            );

        }
    );

}


// =========================================================
// METHOD-SPECIFIC AREA
// =========================================================

function setupDemoMethodArea(
    method,
    booking,
    amount
) {

    const area =
        document.getElementById(
            "demoMethodArea"
        );


    if (!area) {
        return;
    }


    if (method === "upi") {

        area.innerHTML = `

            <label style="
                display:block;
                font-size:13px;
                font-weight:700;
                margin-bottom:6px;
                color:#334155;
            ">
                Demo UPI ID
            </label>

            <input
                type="text"
                class="demo-input"
                value="eventsphere@demo"
                readonly>

        `;

    }


    else if (method === "card") {

        area.innerHTML = `

            <div style="
                display:grid;
                gap:10px;
            ">

                <input
                    class="demo-input"
                    value="4111 1111 1111 1111"
                    readonly
                    placeholder="Card Number">


                <div style="
                    display:grid;
                    grid-template-columns:
                        1fr 1fr;
                    gap:10px;
                ">

                    <input
                        class="demo-input"
                        value="12/30"
                        readonly
                        placeholder="Expiry">


                    <input
                        class="demo-input"
                        value="123"
                        readonly
                        placeholder="CVV">

                </div>

            </div>

        `;

    }


    else if (
        method === "netbanking"
    ) {

        area.innerHTML = `

            <label style="
                display:block;
                font-size:13px;
                font-weight:700;
                margin-bottom:6px;
                color:#334155;
            ">
                Select Demo Bank
            </label>

            <select
                id="demoBank"
                class="demo-input">

                <option>
                    Demo State Bank
                </option>

                <option>
                    Demo HDFC Bank
                </option>

                <option>
                    Demo ICICI Bank
                </option>

                <option>
                    Demo Axis Bank
                </option>

            </select>

        `;

    }


    else if (method === "wallet") {

        area.innerHTML = `

            <label style="
                display:block;
                font-size:13px;
                font-weight:700;
                margin-bottom:6px;
                color:#334155;
            ">
                Select Demo Wallet
            </label>

            <select
                id="demoWallet"
                class="demo-input">

                <option>
                    Demo Wallet
                </option>

                <option>
                    Demo Pay
                </option>

                <option>
                    Demo Wallet Plus
                </option>

            </select>

        `;

    }


    else if (method === "qr") {

        area.innerHTML = `

            <div style="
                text-align:center;
            ">

                <p style="
                    margin:0 0 10px;
                    color:#475569;
                    font-size:13px;
                ">
                    Scan this Demo QR code with
                    your phone.
                </p>


                <div
                    id="demoQRCode"
                    class="demo-qr">
                </div>


                <p style="
                    margin:8px 0 0;
                    color:#64748b;
                    font-size:11px;
                ">
                    No real payment will be made.
                </p>

            </div>

        `;


        generateDemoQR(
            booking.id,
            amount
        );

    }

}


// =========================================================
// GENERATE QR
// =========================================================

function generateDemoQR(
    bookingId,
    amount
) {

    const qrContainer =
        document.getElementById(
            "demoQRCode"
        );


    if (!qrContainer) {
        return;
    }


    const qrText =
        window.location.origin +
        "/demo-payment.html" +
        "?bookingId=" +
        encodeURIComponent(
            bookingId
        ) +
        "&amount=" +
        encodeURIComponent(
            amount
        );


    const script =
        document.createElement(
            "script"
        );


    script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";


    script.onload =
        function () {

            qrContainer.innerHTML = "";


            new QRCode(
                qrContainer,
                {

                    text:
                        qrText,

                    width:
                        210,

                    height:
                        210

                }
            );

        };


    script.onerror =
        function () {

            qrContainer.innerHTML = `

                <div style="
                    padding:15px;
                    color:#dc2626;
                    font-size:13px;
                ">
                    Unable to generate QR code.
                </div>

            `;

        };


    document.head.appendChild(
        script
    );

}


// =========================================================
// PROCESS DEMO PAYMENT
// =========================================================

async function processDemoPayment(
    bookingId,
    method
) {

    const user =
        auth.currentUser;


    if (!user) {

        alert(
            "Please login again before making a payment."
        );

        return;

    }


    const amountInput =
        document.getElementById(
            "demoPaymentAmount"
        );


    const payButton =
        document.getElementById(
            "demoPayNowButton"
        );


    const amount =
        Number(
            amountInput?.value
        );


    if (
        !Number.isFinite(
            amount
        ) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid payment amount."
        );

        return;

    }


    try {

        payButton.disabled =
            true;


        payButton.textContent =
            "🔄 Processing Demo Payment...";


        const idToken =
            await user.getIdToken(
                true
            );


        const response =
            await fetch(
                `${API_BASE_URL}/demo-payment`,
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
                                amount,

                            paymentMethod:
                                method

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

            throw new Error(
                `Server error (${response.status}).`
            );

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Demo payment failed."
            );

        }


        alert(

            data.paymentStatus ===
            "Paid"

                ?

                "Demo payment successful! Your booking is fully paid."

                :

                "Demo payment successful! ₹" +
                Number(
                    data.amountDue || 0
                ).toLocaleString(
                    "en-IN"
                ) +
                " is remaining."

        );


        closeDemoModal();


        localStorage.removeItem(
            "paymentBookingId"
        );


        window.location.href =
            "my-bookings.html";

    }

    catch (error) {

        console.error(
            "Demo Payment Error:",
            error
        );


        alert(
            error.message ||
            "Demo payment failed."
        );


        if (payButton) {

            payButton.disabled =
                false;

            payButton.textContent =
                "✓ Demo Pay";

        }

    }

}


// =========================================================
// CLOSE MODAL
// =========================================================

function closeDemoModal() {

    if (
        demoPaymentModal
    ) {

        demoPaymentModal.remove();

        demoPaymentModal =
            null;

    }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(
    value
) {

    return String(
        value || ""
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

}


// =========================================================
// START
// =========================================================

function initializeDemoPayment() {

    createDemoPaymentUI();

}


// =========================================================
// AUTH STATE
// =========================================================

auth.onAuthStateChanged(
    function (user) {

        if (user) {

            initializeDemoPayment();

        }

    }
);