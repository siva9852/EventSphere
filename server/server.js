require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");

const {
    getFirestore,
    FieldValue
} = require("firebase-admin/firestore");


const app = express();

app.use(cors());

app.use(
    express.json()
);


// =========================================================
// FIREBASE ADMIN
// =========================================================

const serviceAccountPath =
    "/etc/secrets/firebase-service-account.json";

let firebaseAuth = null;
let firebaseDb = null;


if (
    fs.existsSync(
        serviceAccountPath
    )
) {

    const serviceAccount =
        JSON.parse(
            fs.readFileSync(
                serviceAccountPath,
                "utf8"
            )
        );


    if (
        getApps().length === 0
    ) {

        initializeApp({
            credential:
                cert(
                    serviceAccount
                )
        });

    }


    firebaseAuth =
        getAuth();

    firebaseDb =
        getFirestore();


    console.log(
        "Firebase Admin initialized."
    );

}

else {

    console.error(
        "Firebase service account file not found."
    );

}


// =========================================================
// RAZORPAY TEST MODE
// =========================================================

let razorpay = null;


if (
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
) {

    razorpay =
        new Razorpay({

            key_id:
                process.env.RAZORPAY_KEY_ID,

            key_secret:
                process.env.RAZORPAY_KEY_SECRET

        });


    console.log(
        "Razorpay initialized."
    );

}

else {

    console.error(
        "Razorpay environment variables are missing."
    );

}


// =========================================================
// TEMPORARY OTP STORAGE
// =========================================================

const otpStore = {};


// =========================================================
// SEND OTP
// =========================================================

app.post(
    "/send-otp",
    async (req, res) => {

        try {

            const {
                email,
                loginType
            } = req.body;


            if (!email) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Email is required."

                    });

            }


            const type =
                loginType ||
                "registration";


            // =================================================
            // GENERATE OTP
            // =================================================

            const otp =
                Math.floor(
                    100000 +
                    Math.random() * 900000
                );


            otpStore[email] = {

                otp,

                expiresAt:
                    Date.now() +
                    5 * 60 * 1000

            };


            console.log(
                "Generated OTP:",
                otp
            );


            // =================================================
            // EMAIL DETAILS
            // =================================================

            let subject =
                "";

            let message =
                "";


            // =================================================
            // CUSTOMER REGISTRATION
            // =================================================

            if (
                type ===
                "registration"
            ) {

                subject =
                    "EventSphere Customer Registration OTP";


                message =
`Hello,

Your EventSphere customer registration OTP is:

${otp}

This OTP is valid for 5 minutes.

If you did not request this registration, please ignore this email.

Regards,
EventSphere Team`;

            }


            // =================================================
            // CUSTOMER LOGIN
            // =================================================

            else if (
                type ===
                "customer"
            ) {

                subject =
                    "EventSphere Customer Login OTP";


                message =
`Hello,

Your EventSphere customer login OTP is:

${otp}

This OTP is valid for 5 minutes.

This OTP is required to securely access your EventSphere customer account.

If you did not attempt to login, please ignore this email.

Regards,
EventSphere Team`;

            }


            // =================================================
            // ADMIN LOGIN
            // =================================================

            else if (
                type ===
                "admin"
            ) {

                subject =
                    "EventSphere Admin Login OTP";


                message =
`Hello Admin,

Your EventSphere administrator login OTP is:

${otp}

This OTP is valid for 5 minutes.

This OTP is required for secure administrator access to EventSphere.

If you did not attempt to login to the EventSphere Admin Panel, please ignore this email.

Regards,
EventSphere Admin Security`;

            }


            // =================================================
            // INVALID TYPE
            // =================================================

            else {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid OTP type."

                    });

            }


            // =================================================
            // SEND EMAIL THROUGH BREVO
            // =================================================

            await axios.post(

                "https://api.brevo.com/v3/smtp/email",

                {

                    sender: {

                        name:
                            "EventSphere",

                        email:
                            "eventsphere.official2026@gmail.com"

                    },

                    to: [

                        {

                            email:
                                email

                        }

                    ],

                    subject:
                        subject,

                    textContent:
                        message

                },

                {

                    headers: {

                        accept:
                            "application/json",

                        "api-key":
                            process.env.BREVO_API_KEY,

                        "content-type":
                            "application/json"

                    }

                }

            );


            res.json({

                success:
                    true,

                message:
                    "OTP sent successfully!"

            });

        }


        catch (error) {

            console.error(

                "Brevo Error:",

                error.response?.data ||
                error.message

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Failed to send OTP."

                });

        }

    }
);


// =========================================================
// VERIFY OTP
// =========================================================

app.post(
    "/verify-otp",
    (req, res) => {

        const {
            email,
            otp
        } = req.body;


        if (
            !otpStore[email]
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "OTP not found."

                });

        }


        // =================================================
        // CHECK EXPIRY
        // =================================================

        if (
            Date.now() >
            otpStore[email]
                .expiresAt
        ) {

            delete otpStore[email];


            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "OTP expired."

                });

        }


        // =================================================
        // CHECK OTP
        // =================================================

        if (
            Number(otp) !==
            otpStore[email].otp
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Invalid OTP."

                });

        }


        delete otpStore[email];


        res.json({

            success:
                true,

            message:
                "OTP verified successfully!"

        });

    }
);


// =========================================================
// BOOKING STATUS EMAIL
// =========================================================

app.post(
    "/booking-status",
    async (req, res) => {

        try {

            const {
                email,
                eventName,
                status,
                reason
            } = req.body;


            if (
                !email ||
                !eventName ||
                !status
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Email, event name and status are required."

                    });

            }


            let subject =
                "";

            let message =
                "";


            // =================================================
            // APPROVED
            // =================================================

            if (
                status ===
                "Approved"
            ) {

                subject =
                    "EventSphere Booking Approved";


                message =
`Hello,

Your booking for "${eventName}" has been approved by the EventSphere admin.

Your event booking is now confirmed.

You can login to EventSphere and check your booking details in the My Bookings section.

Thank you for choosing EventSphere.

Regards,
EventSphere Team`;

            }


            // =================================================
            // REJECTED
            // =================================================

            else if (
                status ===
                "Rejected"
            ) {

                subject =
                    "EventSphere Booking Rejected";


                message =
`Hello,

Your booking for "${eventName}" has been rejected by the EventSphere admin.

Reason for rejection:

${reason || "No reason was provided."}

You can login to EventSphere and check your booking details in the My Bookings section.

If you have any questions, please contact the EventSphere team.

Regards,
EventSphere Team`;

            }


            // =================================================
            // INVALID STATUS
            // =================================================

            else {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid booking status."

                    });

            }


            // =================================================
            // SEND EMAIL
            // =================================================

            await axios.post(

                "https://api.brevo.com/v3/smtp/email",

                {

                    sender: {

                        name:
                            "EventSphere",

                        email:
                            "eventsphere.official2026@gmail.com"

                    },

                    to: [

                        {

                            email:
                                email

                        }

                    ],

                    subject:
                        subject,

                    textContent:
                        message

                },

                {

                    headers: {

                        accept:
                            "application/json",

                        "api-key":
                            process.env.BREVO_API_KEY,

                        "content-type":
                            "application/json"

                    }

                }

            );


            console.log(
                `Booking ${status} email sent to ${email}`
            );


            res.json({

                success:
                    true,

                message:
                    "Booking status email sent successfully!"

            });

        }


        catch (error) {

            console.error(

                "Booking Email Error:",

                error.response?.data ||
                error.message

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Failed to send booking status email."

                });

        }

    }
);


// =========================================================
// CUSTOMER CANCELLED BOOKING EMAIL
// =========================================================

app.post(
    "/customer-cancelled",
    async (req, res) => {

        try {

            const {
                customerEmail,
                eventName,
                reason
            } = req.body;


            if (
                !customerEmail ||
                !eventName ||
                !reason
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Customer email, event name and reason are required."

                    });

            }


            const adminEmail =
                "eventsphere.official2026@gmail.com";


            const subject =
                "EventSphere Booking Cancelled by Customer";


            const message =
`Hello Admin,

A customer has cancelled a booking.

Event:
${eventName}

Customer Email:
${customerEmail}

Reason for cancellation:
${reason}

Please login to EventSphere to view the booking details.

Regards,
EventSphere Team`;


            await axios.post(

                "https://api.brevo.com/v3/smtp/email",

                {

                    sender: {

                        name:
                            "EventSphere",

                        email:
                            "eventsphere.official2026@gmail.com"

                    },

                    to: [

                        {

                            email:
                                adminEmail

                        }

                    ],

                    subject:
                        subject,

                    textContent:
                        message

                },

                {

                    headers: {

                        accept:
                            "application/json",

                        "api-key":
                            process.env.BREVO_API_KEY,

                        "content-type":
                            "application/json"

                    }

                }

            );


            console.log(
                `Customer cancellation email sent to ${adminEmail}`
            );


            res.json({

                success:
                    true,

                message:
                    "Customer cancellation email sent successfully!"

            });

        }


        catch (error) {

            console.error(

                "Customer Cancellation Email Error:",

                error.response?.data ||
                error.message

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Failed to send customer cancellation email."

                });

        }

    }
);


// =========================================================
// DELETE CUSTOMER
// =========================================================

app.delete(
    "/delete-customer",
    async (req, res) => {

        try {

            const {
                email
            } = req.body;


            if (!email) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Customer email is required."

                    });

            }


            if (!firebaseAuth) {

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Firebase Admin is not initialized."

                    });

            }


            // =================================================
            // DELETE AUTH ACCOUNT
            // =================================================

            try {

                const userRecord =
                    await firebaseAuth
                        .getUserByEmail(
                            email
                        );


                await firebaseAuth
                    .deleteUser(
                        userRecord.uid
                    );


                console.log(
                    `Customer deleted from Authentication: ${email}`
                );

            }


            catch (authError) {

                if (
                    authError.code ===
                    "auth/user-not-found"
                ) {

                    console.log(
                        `No Authentication account found for ${email}.`
                    );

                }

                else {

                    throw authError;

                }

            }


            res.json({

                success:
                    true,

                message:
                    "Customer deleted successfully!"

            });

        }


        catch (error) {

            console.error(

                "Delete Customer Error:",

                error.message

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Failed to delete customer."

                });

        }

    }
);


// =========================================================
// RAZORPAY - CREATE PAYMENT ORDER
// =========================================================

app.post(
    "/create-payment-order",
    async (req, res) => {

        try {

            if (!razorpay) {

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Razorpay is not configured."

                    });

            }


            if (!firebaseAuth || !firebaseDb) {

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "Firebase Admin is not initialized."

                    });

            }


            const {
                bookingId
            } = req.body;


            const authHeader =
                req.headers.authorization || "";


            if (
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res
                    .status(401)
                    .json({

                        success:
                            false,

                        message:
                            "Authentication required."

                    });

            }


            const idToken =
                authHeader.substring(
                    7
                );


            const decodedToken =
                await firebaseAuth
                    .verifyIdToken(
                        idToken
                    );


            const bookingRef =
                firebaseDb
                    .collection("bookings")
                    .doc(bookingId);


            const bookingSnapshot =
                await bookingRef.get();


            if (
                !bookingSnapshot.exists
            ) {

                return res
                    .status(404)
                    .json({

                        success:
                            false,

                        message:
                            "Booking not found."

                    });

            }


            const booking =
                bookingSnapshot.data();


            // =================================================
            // CUSTOMER SECURITY CHECK
            // =================================================

            if (
                booking.customerId !==
                decodedToken.uid
            ) {

                return res
                    .status(403)
                    .json({

                        success:
                            false,

                        message:
                            "You cannot pay for this booking."

                    });

            }


            // =================================================
            // APPROVAL CHECK
            // =================================================

            if (
                booking.status !==
                "Approved"
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Payment is available only for approved bookings."

                    });

            }


            // =================================================
            // ALREADY PAID CHECK
            // =================================================

            if (
                booking.paymentStatus ===
                "Paid"
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "This booking has already been paid."

                    });

            }


            const amount =
                Number(
                    booking.price
                );


            if (
                !Number.isFinite(amount) ||
                amount <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid booking amount."

                    });

            }


            // =================================================
            // CREATE RAZORPAY ORDER
            // =================================================

            const order =
                await razorpay.orders.create({

                    amount:
                        Math.round(
                            amount * 100
                        ),

                    currency:
                        "INR",

                    receipt:
                        `ES_${bookingId.substring(0, 20)}`,

                    notes: {

                        bookingId:
                            bookingId,

                        customerId:
                            decodedToken.uid

                    }

                });


            // =================================================
            // SAVE ORDER ID
            // =================================================

            await bookingRef.update({

                razorpayOrderId:
                    order.id,

                paymentStatus:
                    "Payment Initiated"

            });


            res.json({

                success:
                    true,

                keyId:
                    process.env.RAZORPAY_KEY_ID,

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                bookingId:
                    bookingId

            });

        }


        catch (error) {

            console.error(

                "Create Razorpay Order Error:",

                error

            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to create payment order."

                });

        }

    }
);

// =========================================================
// RAZORPAY - VERIFY PAYMENT + SEND RECEIPT EMAIL
// =========================================================

app.post(
    "/verify-payment",
    async (req, res) => {

        try {

            if (!firebaseAuth || !firebaseDb) {

                return res
                    .status(500)
                    .json({
                        success:
                            false,

                        message:
                            "Firebase Admin is not initialized."
                    });

            }


            const {
                bookingId,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = req.body;


            // =================================================
            // CHECK PAYMENT DETAILS
            // =================================================

            if (
                !bookingId ||
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "Payment verification details are incomplete."
                    });

            }


            // =================================================
            // CHECK AUTHENTICATION
            // =================================================

            const authHeader =
                req.headers.authorization || "";


            if (
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res
                    .status(401)
                    .json({
                        success:
                            false,

                        message:
                            "Authentication required."
                    });

            }


            const idToken =
                authHeader.substring(7);


            const decodedToken =
                await firebaseAuth.verifyIdToken(
                    idToken
                );


            // =================================================
            // GET BOOKING
            // =================================================

            const bookingRef =
                firebaseDb
                    .collection("bookings")
                    .doc(bookingId);


            const bookingSnapshot =
                await bookingRef.get();


            if (
                !bookingSnapshot.exists
            ) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        message:
                            "Booking not found."
                    });

            }


            const booking =
                bookingSnapshot.data();


            // =================================================
            // CUSTOMER SECURITY CHECK
            // =================================================

            if (
                booking.customerId !==
                decodedToken.uid
            ) {

                return res
                    .status(403)
                    .json({
                        success:
                            false,

                        message:
                            "You cannot verify this payment."
                    });

            }


            // =================================================
            // ORDER CHECK
            // =================================================

            if (
                booking.razorpayOrderId !==
                razorpay_order_id
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "Payment order does not match the booking."
                    });

            }


            // =================================================
            // VERIFY RAZORPAY SIGNATURE
            // =================================================

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        razorpay_order_id +
                        "|" +
                        razorpay_payment_id
                    )
                    .digest("hex");


            if (
                generatedSignature.length !==
                razorpay_signature.length
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "Payment verification failed."
                    });

            }


            const signatureIsValid =
                crypto.timingSafeEqual(

                    Buffer.from(
                        generatedSignature
                    ),

                    Buffer.from(
                        razorpay_signature
                    )

                );


            if (!signatureIsValid) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "Payment verification failed."
                    });

            }


            // =================================================
            // PAYMENT SUCCESS
            // =================================================

            await bookingRef.update({

                paymentStatus:
                    "Paid",

                razorpayPaymentId:
                    razorpay_payment_id,

                razorpaySignature:
                    razorpay_signature,

                paidAt:
                    FieldValue.serverTimestamp()

            });


            // =================================================
            // SEND PAYMENT RECEIPT EMAIL
            // =================================================

            try {

                const customerEmail =
                    booking.customerEmail ||
                    decodedToken.email ||
                    "";


                const eventName =
                    booking.eventName ||
                    "Event";


                const eventDate =
                    booking.eventDate ||
                    "Not specified";


                const amount =
                    Number(
                        booking.price || 0
                    );


                const receiptBookingId =
                    "BK-" +
                    bookingId
                        .substring(0, 8)
                        .toUpperCase();


                const paymentDate =
                    new Date().toLocaleString(
                        "en-IN",
                        {
                            timeZone:
                                "Asia/Kolkata"
                        }
                    );


                if (customerEmail) {

                    const subject =
                        "EventSphere Payment Receipt - " +
                        receiptBookingId;


                    const message =
`Hello,

Your payment for EventSphere has been successfully received.

================================
       PAYMENT RECEIPT
================================

Booking ID:
${receiptBookingId}

Event:
${eventName}

Event Date:
${eventDate}

Amount Paid:
₹${amount.toLocaleString("en-IN")}

Payment ID:
${razorpay_payment_id}

Payment Date:
${paymentDate}

Payment Status:
PAID

================================

Your payment has been successfully verified.

You can login to EventSphere and view your booking in the My Bookings section.

Thank you for choosing EventSphere.

Regards,
EventSphere Team`;


                    await axios.post(

                        "https://api.brevo.com/v3/smtp/email",

                        {

                            sender: {

                                name:
                                    "EventSphere",

                                email:
                                    "eventsphere.official2026@gmail.com"

                            },

                            to: [

                                {

                                    email:
                                        customerEmail

                                }

                            ],

                            subject:
                                subject,

                            textContent:
                                message

                        },

                        {

                            headers: {

                                accept:
                                    "application/json",

                                "api-key":
                                    process.env.BREVO_API_KEY,

                                "content-type":
                                    "application/json"

                            }

                        }

                    );


                    console.log(
                        `Payment receipt email sent to ${customerEmail}`
                    );

                }

                else {

                    console.log(
                        "Payment successful but customer email was not available."
                    );

                }

            }


            catch (emailError) {

                // Payment is already successful.
                // Email failure must not make the payment fail.

                console.error(
                    "Payment receipt email failed:",
                    emailError.response?.data ||
                    emailError.message
                );

            }


            // =================================================
            // SUCCESS RESPONSE
            // =================================================

            res.json({

                success:
                    true,

                message:
                    "Payment verified successfully."

            });

        }


        catch (error) {

            console.error(
                "Verify Razorpay Payment Error:",
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "Unable to verify payment."

                });

        }

    }
);


// =========================================================
// HOME
// =========================================================

app.get(
    "/",
    (req, res) => {

        res.send(
            "EventSphere Backend Running"
        );

    }
);


// =========================================================
// START SERVER
// =========================================================

const PORT =
    process.env.PORT ||
    3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);