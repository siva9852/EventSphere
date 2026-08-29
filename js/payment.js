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

const paymentForm =
    document.getElementById("paymentForm");


// =========================================================
// LOAD RAZORPAY SCRIPT
// =========================================================

function loadRazorpayScript() {

    return new Promise((resolve, reject) => {

        // Already loaded
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
// GET ELEMENT SAFELY
// =========================================================

function setElementText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "Not specified";
    }
}


// =========================================================
// LOAD BOOKING DETAILS
// =========================================================

async function loadPaymentBooking() {

    const user =
        auth.currentUser;

    if (!user) {

        window.location.href =
            "customer-login.html";

        return;
    }


    const bookingId =
        localStorage.getItem(
            "paymentBookingId"
        );


    if (!bookingId) {

        alert(
            "Payment booking not found."
        );

        window.location.href =
            "my-bookings.html";

        return;
    }


    try {

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


        if (!bookingSnapshot.exists()) {

            alert(
                "Booking not found."
            );

            window.location.href =
                "my-bookings.html";

            return;
        }


        const booking =
            bookingSnapshot.data();


        // =====================================================
        // SECURITY CHECK
        // =====================================================

        if (
            booking.customerId !==
            user.uid
        ) {

            alert(
                "You cannot access this payment."
            );

            window.location.href =
                "my-bookings.html";

            return;
        }


        // =====================================================
        // APPROVAL CHECK
        // =====================================================

        if (
            booking.status !==
            "Approved"
        ) {

            alert(
                "Payment is available only for approved bookings."
            );

            window.location.href =
                "my-bookings.html";

            return;
        }


        // =====================================================
        // ALREADY PAID
        // =====================================================

        if (
            booking.paymentStatus ===
            "Paid"
        ) {

            alert(
                "This booking has already been paid."
            );

            window.location.href =
                "my-bookings.html";

            return;
        }


        // =====================================================
        // DISPLAY BOOKING DETAILS
        // =====================================================

        setElementText(
            "paymentEventName",
            booking.eventName || "Event"
        );


        setElementText(
            "paymentBookingId",
            "#BK-" +
            bookingId
                .substring(0, 6)
                .toUpperCase()
        );


        setElementText(
            "paymentEventDate",
            booking.eventDate || "Not specified"
        );


        setElementText(
            "paymentGuests",
            booking.guests || "Not specified"
        );


        setElementText(
            "paymentLocation",
            booking.location || "Not specified"
        );


        const amount =
            Number(
                booking.price || 0
            );


        setElementText(
            "paymentAmount",
            "₹" +
            amount.toLocaleString("en-IN")
        );


        // Save booking ID on button/form
        if (payButton) {

            payButton.dataset.bookingId =
                bookingId;
        }

        if (paymentForm) {

            paymentForm.dataset.bookingId =
                bookingId;
        }

    }

    catch (error) {

        console.error(
            "Payment Booking Error:",
            error
        );

        alert(
            "Unable to load payment details."
        );

        window.location.href =
            "my-bookings.html";
    }
}


// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

async function createPaymentOrder(
    bookingId,
    idToken
) {

    const response =
        await fetch(
            `${API_BASE_URL}/create-payment-order`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body: JSON.stringify({
                    bookingId:
                        bookingId
                })
            }
        );


    // IMPORTANT:
    // Do NOT directly call response.json()
    // because a 404/HTML response can cause:
    // Unexpected token '<'

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
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${idToken}`
                },

                body: JSON.stringify({

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
// START RAZORPAY PAYMENT
// =========================================================

async function startPayment() {

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


    const bookingId =
        payButton?.dataset.bookingId ||
        paymentForm?.dataset.bookingId ||
        localStorage.getItem(
            "paymentBookingId"
        );


    if (!bookingId) {

        alert(
            "Booking information not found."
        );

        return;
    }


    try {

        // =====================================================
        // DISABLE BUTTON
        // =====================================================

        if (payButton) {

            payButton.disabled =
                true;

            payButton.innerHTML = `
                🔄 Processing Payment...
            `;
        }


        // =====================================================
        // GET FIREBASE ID TOKEN
        // =====================================================

        const idToken =
            await user.getIdToken();


        // =====================================================
        // LOAD RAZORPAY
        // =====================================================

        await loadRazorpayScript();


        // =====================================================
        // CREATE RAZORPAY ORDER
        // =====================================================

        const orderData =
            await createPaymentOrder(
                bookingId,
                idToken
            );


        console.log(
            "Razorpay Order Created:",
            orderData
        );


        // =====================================================
        // RAZORPAY OPTIONS
        // =====================================================

        const options = {

            key:
                orderData.keyId,

            amount:
                orderData.amount,

            currency:
                orderData.currency || "INR",

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
                    "",

                email:
                    user.email ||
                    ""
            },


            // =================================================
            // THEME
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
                        // VERIFY PAYMENT ON SERVER
                        // =====================================

                        const latestToken =
                            await user.getIdToken(
                                true
                            );


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
                        // PAYMENT SUCCESS
                        // =====================================

                        localStorage.removeItem(
                            "paymentBookingId"
                        );


                        alert(
                            "Payment successful!"
                        );


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
                                🔒 Pay Now
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
                            "Razorpay checkout closed."
                        );


                        if (payButton) {

                            payButton.disabled =
                                false;

                            payButton.innerHTML = `
                                🔒 Pay Now
                            `;
                        }
                    }
            }
        };


        // =====================================================
        // OPEN RAZORPAY
        // =====================================================

        const razorpay =
            new window.Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (response) {

                console.error(
                    "Razorpay Payment Failed:",
                    response.error
                );


                alert(
                    response.error?.description ||
                    "Payment failed. Please try again."
                );


                if (payButton) {

                    payButton.disabled =
                        false;

                    payButton.innerHTML = `
                        🔒 Pay Now
                    `;
                }
            }
        );


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
                🔒 Pay Now
            `;
        }
    }
}


// =========================================================
// BUTTON CLICK
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
// FORM SUBMIT
// =========================================================
// This is included in case your payment.html
// still has the Pay Now button inside a <form>.

if (paymentForm) {

    paymentForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            startPayment();
        }
    );
}


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