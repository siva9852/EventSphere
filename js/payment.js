import { db, auth } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// ELEMENTS
// =========================================================

const eventNameElement =
    document.getElementById("eventName");

const eventDateElement =
    document.getElementById("eventDate");

const guestCountElement =
    document.getElementById("guestCount");

const eventLocationElement =
    document.getElementById("eventLocation");

const eventPriceElement =
    document.getElementById("eventPrice");

const payButton =
    document.getElementById("payButton");


// =========================================================
// RENDER BACKEND URL
// =========================================================

const BACKEND_URL =
    "https://eventsphere-dndh.onrender.com";


// =========================================================
// BOOKING DATA
// =========================================================

let bookingId = null;

let bookingData = null;


// =========================================================
// LOAD BOOKING
// =========================================================

async function loadBooking() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        bookingId =
            params.get("bookingId");


        // =====================================================
        // IF BOOKING ID IS NOT IN URL
        // =====================================================

        if (!bookingId) {

            alert(
                "Booking information not found."
            );

            window.location.href =
                "my-bookings.html";

            return;

        }


        // =====================================================
        // CHECK LOGIN
        // =====================================================

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


        // =====================================================
        // GET BOOKING FROM FIRESTORE
        // =====================================================

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

            window.location.href =
                "my-bookings.html";

            return;

        }


        bookingData =
            bookingSnapshot.data();


        // =====================================================
        // CUSTOMER SECURITY CHECK
        // =====================================================

        if (
            bookingData.customerId !==
            user.uid
        ) {

            alert(
                "You cannot access this booking."
            );

            window.location.href =
                "my-bookings.html";

            return;

        }


        // =====================================================
        // APPROVAL CHECK
        // =====================================================

        if (
            bookingData.status !==
            "Approved"
        ) {

            alert(
                "Payment is available only after admin approval."
            );

            window.location.href =
                "my-bookings.html";

            return;

        }


        // =====================================================
        // ALREADY PAID CHECK
        // =====================================================

        if (
            bookingData.paymentStatus ===
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

        eventNameElement.textContent =
            bookingData.eventName ||
            "Event";


        eventDateElement.textContent =
            bookingData.eventDate ||
            "-";


        guestCountElement.textContent =
            bookingData.guests ||
            "-";


        eventLocationElement.textContent =
            bookingData.location ||
            "-";


        const price =
            Number(
                bookingData.price
            );


        eventPriceElement.textContent =
            `₹${price.toFixed(2)}`;


    }

    catch (error) {

        console.error(
            "Load Booking Error:",
            error
        );


        alert(
            "Unable to load booking details."
        );

        window.location.href =
            "my-bookings.html";

    }

}


// =========================================================
// GET FIREBASE ID TOKEN
// =========================================================

async function getIdToken() {

    const user =
        auth.currentUser;


    if (!user) {

        throw new Error(
            "User is not logged in."
        );

    }


    return await user.getIdToken(
        true
    );

}


// =========================================================
// START RAZORPAY PAYMENT
// =========================================================

async function startPayment() {

    if (!bookingId) {

        alert(
            "Booking information not found."
        );

        return;

    }


    if (!bookingData) {

        alert(
            "Booking details are not loaded yet."
        );

        return;

    }


    try {

        // =====================================================
        // DISABLE BUTTON
        // =====================================================

        payButton.disabled =
            true;


        payButton.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Creating Payment...

        `;


        // =====================================================
        // GET FIREBASE TOKEN
        // =====================================================

        const idToken =
            await getIdToken();


        // =====================================================
        // CREATE RAZORPAY ORDER
        // =====================================================

        const response =
            await fetch(

                `${BACKEND_URL}/create-payment-order`,

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
                                bookingId

                        })

                }

            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to create payment order."
            );

        }


        // =====================================================
        // RAZORPAY OPTIONS
        // =====================================================

        const options = {

            key:
                data.keyId,

            amount:
                data.amount,

            currency:
                data.currency,

            name:
                "EventSphere",

            description:
                `Payment for ${bookingData.eventName}`,

            order_id:
                data.orderId,


            prefill: {

                name:
                    bookingData.customerEmail
                        ?.split("@")[0] ||
                    "Customer",

                email:
                    bookingData.customerEmail ||
                    auth.currentUser.email

            },


            notes: {

                bookingId:
                    bookingId

            },


            theme: {

                color:
                    "#2563eb"

            },


            // =================================================
            // PAYMENT SUCCESS HANDLER
            // =================================================

            handler:
                async function (
                    paymentResponse
                ) {

                    await verifyPayment(
                        paymentResponse
                    );

                },


            // =================================================
            // MODAL CLOSED
            // =================================================

            modal: {

                ondismiss:
                    function () {

                        resetPayButton();

                    }

            }

        };


        // =====================================================
        // OPEN RAZORPAY
        // =====================================================

        const razorpayCheckout =
            new Razorpay(
                options
            );


        razorpayCheckout.on(
            "payment.failed",
            function (
                response
            ) {

                console.error(
                    "Payment Failed:",
                    response.error
                );


                alert(

                    response.error?.description ||

                    "Payment failed. Please try again."

                );


                resetPayButton();

            }
        );


        razorpayCheckout.open();

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


        resetPayButton();

    }

}


// =========================================================
// VERIFY PAYMENT
// =========================================================

async function verifyPayment(
    paymentResponse
) {

    try {

        payButton.disabled =
            true;


        payButton.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Verifying Payment...

        `;


        // =====================================================
        // GET FIREBASE TOKEN
        // =====================================================

        const idToken =
            await getIdToken();


        // =====================================================
        // SEND PAYMENT DETAILS TO SERVER
        // =====================================================

        const response =
            await fetch(

                `${BACKEND_URL}/verify-payment`,

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


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Payment verification failed."

            );

        }


        // =====================================================
        // SUCCESS
        // =====================================================

        alert(
            "Payment successful! Your booking is now confirmed."
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


        resetPayButton();

    }

}


// =========================================================
// RESET BUTTON
// =========================================================

function resetPayButton() {

    payButton.disabled =
        false;


    payButton.innerHTML = `

        <i class="fa-solid fa-lock"></i>

        Pay Now

    `;

}


// =========================================================
// BUTTON EVENT
// =========================================================

payButton.addEventListener(
    "click",
    startPayment
);


// =========================================================
// START
// =========================================================

loadBooking();