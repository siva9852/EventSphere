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
// SET ELEMENT TEXT SAFELY
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
        urlParams.get("bookingId");


    const bookingId =
        urlBookingId ||
        localStorage.getItem(
            "paymentBookingId"
        );


    // Save URL booking ID
    if (urlBookingId) {

        localStorage.setItem(
            "paymentBookingId",
            urlBookingId
        );
    }


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
            payButton.disabled = true;
        }

        return;
    }


    console.log(
        "Loading payment booking:",
        bookingId
    );


    try {

        // =================================================
        // GET BOOKING FROM FIRESTORE
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

        if (!bookingSnapshot.exists()) {

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
                payButton.disabled = true;
            }

            return;
        }


        // =================================================
        // GET BOOKING DATA
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
                payButton.disabled = true;
            }

            return;
        }


        // =================================================
        // DISPLAY EVENT NAME
        // =================================================

        setElementText(
            "eventName",
            booking.eventName ||
            booking.event ||
            "Event"
        );


        // =================================================
        // DISPLAY EVENT DATE
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


        setElementText(
            "eventPrice",
            "₹" +
            amount.toLocaleString("en-IN")
        );


        // =================================================
        // SAVE BOOKING ID FOR PAYMENT
        // =================================================

        if (payButton) {

            payButton.dataset.bookingId =
                bookingId;
        }


        // =================================================
        // PAYMENT STATUS CHECK
        // =================================================

        if (
            booking.paymentStatus ===
            "Paid"
        ) {

            if (payButton) {

                payButton.disabled =
                    true;

                payButton.innerHTML =
                    "✓ Already Paid";
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
            payButton.disabled = true;
        }
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

                body:
                    JSON.stringify({
                        bookingId:
                            bookingId
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
                method: "POST",

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
        // GET FIREBASE ID TOKEN
        // =================================================

        const idToken =
            await user.getIdToken();


        // =================================================
        // LOAD RAZORPAY
        // =================================================

        await loadRazorpayScript();


        // =================================================
        // CREATE RAZORPAY ORDER
        // =================================================

        const orderData =
            await createPaymentOrder(
                bookingId,
                idToken
            );


        console.log(
            "Razorpay Order Created:",
            orderData
        );


        // =================================================
        // RAZORPAY OPTIONS
        // =================================================

        const options = {

            key:
                orderData.keyId,

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


            prefill: {

                name:
                    user.displayName ||
                    "",

                email:
                    user.email ||
                    ""
            },


            theme: {

                color:
                    "#2563eb"
            },


            // =============================================
            // PAYMENT SUCCESS
            // =============================================

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


                        // =================================
                        // PAYMENT SUCCESS
                        // =================================

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
                                <i class="fa-solid fa-lock"></i>
                                Pay Now
                            `;
                        }
                    }
                },


            // =============================================
            // PAYMENT CANCELLED
            // =============================================

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
        // OPEN RAZORPAY
        // =================================================

        const razorpay =
            new window.Razorpay(
                options
            );


        razorpay.on(
            "payment.failed",
            function (response) {

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