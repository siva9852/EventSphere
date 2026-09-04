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
app.use(express.json());


// =========================================================
// CONFIGURATION
// =========================================================

const PORT = process.env.PORT || 3000;

const BREVO_API_KEY =
    process.env.BREVO_API_KEY || "";

const EMAIL_FROM =
    "eventsphere.official2026@gmail.com";


// =========================================================
// FIREBASE ADMIN
// =========================================================

let firebaseAuth = null;
let firebaseDb = null;

const serviceAccountPath =
    "/etc/secrets/firebase-service-account.json";

try {

    if (fs.existsSync(serviceAccountPath)) {

        const serviceAccount =
            JSON.parse(
                fs.readFileSync(
                    serviceAccountPath,
                    "utf8"
                )
            );

        if (getApps().length === 0) {

            initializeApp({
                credential:
                    cert(serviceAccount)
            });

        }

        firebaseAuth = getAuth();
        firebaseDb = getFirestore();

        console.log(
            "Firebase Admin initialized."
        );

    } else {

        console.error(
            "Firebase service account file not found."
        );

    }

} catch (error) {

    console.error(
        "Firebase initialization error:",
        error.message
    );

}


// =========================================================
// RAZORPAY
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

} else {

    console.error(
        "Razorpay environment variables are missing."
    );

}


// =========================================================
// OTP STORAGE
// =========================================================

const otpStore = new Map();


// =========================================================
// SEND EMAIL USING BREVO API
// NO NODEMAILER
// =========================================================

async function sendEmail({
    to,
    subject,
    text
}) {

    if (!BREVO_API_KEY) {

        throw new Error(
            "BREVO_API_KEY is not configured."
        );

    }

    await axios.post(

        "https://api.brevo.com/v3/smtp/email",

        {
            sender: {
                name: "EventSphere",
                email: EMAIL_FROM
            },

            to: [
                {
                    email: to
                }
            ],

            subject: subject,

            textContent: text
        },

        {
            headers: {
                accept:
                    "application/json",

                "api-key":
                    BREVO_API_KEY,

                "content-type":
                    "application/json"
            }
        }
    );

}


// =========================================================
// SEND OTP
// =========================================================

app.post(
    "/send-otp",
    async (req, res) => {

        try {

            const email =
                String(
                    req.body?.email || ""
                )
                    .trim()
                    .toLowerCase();

            const loginType =
                req.body?.loginType ||
                "registration";


            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email is required."
                });

            }


            if (
                ![
                    "registration",
                    "customer",
                    "admin"
                ].includes(loginType)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid OTP type."
                });

            }


            // Generate 6 digit OTP

            const otp =
                Math.floor(
                    100000 +
                    Math.random() * 900000
                )
                    .toString();


            let subject = "";
            let message = "";


            // =================================================
            // REGISTRATION OTP
            // =================================================

            if (
                loginType ===
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
            // CUSTOMER LOGIN OTP
            // =================================================

            else if (
                loginType ===
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
            // ADMIN LOGIN OTP
            // =================================================

            else {

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
            // SEND EMAIL FIRST
            // =================================================

            await sendEmail({

                to: email,

                subject: subject,

                text: message

            });


            // =================================================
            // STORE OTP ONLY AFTER EMAIL SUCCESS
            // =================================================

            otpStore.set(
                email,
                {
                    otp: otp,

                    expiresAt:
                        Date.now() +
                        5 * 60 * 1000
                }
            );


            console.log(
                `OTP sent successfully to ${email}`
            );


            return res.json({

                success: true,

                message:
                    "OTP sent successfully!"
            });

        }

        catch (error) {

            console.error(
                "SEND OTP ERROR:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to send OTP. Check BREVO_API_KEY in server environment variables."
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

        try {

            const email =
                String(
                    req.body?.email || ""
                )
                    .trim()
                    .toLowerCase();

            const otp =
                String(
                    req.body?.otp || ""
                )
                    .trim();


            if (!email || !otp) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and OTP are required."
                });

            }


            const savedOtp =
                otpStore.get(email);


            if (!savedOtp) {

                return res.status(400).json({

                    success: false,

                    message:
                        "OTP not found. Please request a new OTP."
                });

            }


            if (
                Date.now() >
                savedOtp.expiresAt
            ) {

                otpStore.delete(email);

                return res.status(400).json({

                    success: false,

                    message:
                        "OTP expired. Please request a new OTP."
                });

            }


            if (
                otp !==
                savedOtp.otp
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid OTP."
                });

            }


            // OTP correct

            otpStore.delete(email);


            return res.json({

                success: true,

                message:
                    "OTP verified successfully!"
            });

        }

        catch (error) {

            console.error(
                "VERIFY OTP ERROR:",
                error.message
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to verify OTP."
            });

        }

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

                return res.status(400).json({

                    success: false,

                    message:
                        "Email, event name and status are required."
                });

            }


            let subject;
            let message;


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

Regards,
EventSphere Team`;

            }

            else {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid booking status."
                });

            }


            await sendEmail({

                to: email,

                subject: subject,

                text: message

            });


            return res.json({

                success: true,

                message:
                    "Booking status email sent successfully!"
            });

        }

        catch (error) {

            console.error(
                "BOOKING STATUS EMAIL ERROR:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success: false,

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

                return res.status(400).json({

                    success: false,

                    message:
                        "Customer email, event name and reason are required."
                });

            }


            const message =
`Hello Admin,

A customer has cancelled a booking.

Event:
${eventName}

Customer Email:
${customerEmail}

Reason:
${reason}

Please login to EventSphere to view the booking details.

Regards,
EventSphere Team`;


            await sendEmail({

                to:
                    EMAIL_FROM,

                subject:
                    "EventSphere Booking Cancelled by Customer",

                text:
                    message

            });


            return res.json({

                success: true,

                message:
                    "Customer cancellation email sent successfully!"
            });

        }

        catch (error) {

            console.error(
                "CUSTOMER CANCELLATION EMAIL ERROR:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success: false,

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

            const email =
                String(
                    req.body?.email || ""
                )
                    .trim()
                    .toLowerCase();


            if (!email) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Customer email is required."
                });

            }


            if (!firebaseAuth) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Firebase Admin is not initialized."
                });

            }


            try {

                const userRecord =
                    await firebaseAuth
                        .getUserByEmail(email);


                await firebaseAuth
                    .deleteUser(
                        userRecord.uid
                    );


                console.log(
                    `Customer deleted: ${email}`
                );

            }

            catch (error) {

                if (
                    error.code !==
                    "auth/user-not-found"
                ) {

                    throw error;

                }

            }


            return res.json({

                success: true,

                message:
                    "Customer deleted successfully!"
            });

        }

        catch (error) {

            console.error(
                "DELETE CUSTOMER ERROR:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete customer."
            });

        }

    }
);


// =========================================================
// CREATE RAZORPAY PAYMENT ORDER
// =========================================================

app.post(
    "/create-payment-order",
    async (req, res) => {

        try {

            if (!razorpay) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Razorpay is not configured."
                });

            }


            if (
                !firebaseAuth ||
                !firebaseDb
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Firebase Admin is not initialized."
                });

            }


            const {
                bookingId,
                paymentAmount
            } = req.body;


            if (!bookingId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Booking ID is required."
                });

            }


            const authHeader =
                req.headers.authorization ||
                "";


            if (
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."
                });

            }


            const idToken =
                authHeader.substring(7);


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


            if (!bookingSnapshot.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."
                });

            }


            const booking =
                bookingSnapshot.data();


            // Support both customerId and userId

            const ownerId =
                booking.customerId ||
                booking.userId;


            if (
                ownerId !==
                decodedToken.uid
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot pay for this booking."
                });

            }


            if (
                booking.status !==
                "Approved"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment is available only for approved bookings."
                });

            }


            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );


            if (
                !Number.isFinite(
                    totalAmount
                ) ||
                totalAmount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid booking amount."
                });

            }


            const oldPaid =
                Number(
                    booking.amountPaid ||
                    0
                );


            const amountPaid =
                Math.max(
                    0,
                    Math.min(
                        oldPaid,
                        totalAmount
                    )
                );


            const amountDue =
                Number(
                    (
                        totalAmount -
                        amountPaid
                    ).toFixed(2)
                );


            if (amountDue <= 0) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This booking has already been fully paid."
                });

            }


            const requestedAmount =
                Number(
                    paymentAmount
                );


            if (
                !Number.isFinite(
                    requestedAmount
                ) ||
                requestedAmount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid payment amount."
                });

            }


            if (
                requestedAmount >
                amountDue
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Maximum payment allowed now is ₹${amountDue.toLocaleString("en-IN")}.`
                });

            }


            const amountPaise =
                Math.round(
                    requestedAmount * 100
                );


            const order =
                await razorpay.orders.create({

                    amount:
                        amountPaise,

                    currency:
                        "INR",

                    receipt:
                        `ES_${bookingId}_${Date.now()}`
                            .substring(0, 40),

                    notes: {

                        bookingId:
                            bookingId,

                        customerId:
                            decodedToken.uid,

                        paymentAmount:
                            requestedAmount

                    }

                });


            await bookingRef.update({

                razorpayOrderId:
                    order.id,

                pendingPaymentAmount:
                    requestedAmount,

                paymentStatus:
                    "Payment Initiated"

            });


            return res.json({

                success: true,

                keyId:
                    process.env.RAZORPAY_KEY_ID,

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                bookingId:
                    bookingId,

                paymentAmount:
                    requestedAmount,

                totalAmount:
                    totalAmount,

                amountPaid:
                    amountPaid,

                amountDue:
                    amountDue

            });

        }

        catch (error) {

            console.error(
                "CREATE PAYMENT ORDER ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create payment order."
            });

        }

    }
);

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

app.post(
    "/verify-payment",
    async (req, res) => {

        try {

            if (
                !firebaseAuth ||
                !firebaseDb ||
                !razorpay
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Payment service is not initialized."
                });

            }


            const {
                bookingId,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            } = req.body;


            if (
                !bookingId ||
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment verification details are incomplete."
                });

            }


            // =================================================
            // AUTHENTICATION
            // =================================================

            const authHeader =
                req.headers.authorization ||
                "";


            if (
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."
                });

            }


            const idToken =
                authHeader.substring(7);


            const decodedToken =
                await firebaseAuth
                    .verifyIdToken(
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


            if (!bookingSnapshot.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."
                });

            }


            const booking =
                bookingSnapshot.data();


            const ownerId =
                booking.customerId ||
                booking.userId;


            if (
                ownerId !==
                decodedToken.uid
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot verify this payment."
                });

            }


            if (
                booking.status !==
                "Approved"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This booking is not approved."
                });

            }


            if (
                booking.razorpayOrderId !==
                razorpay_order_id
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment order does not match the booking."
                });

            }


            // =================================================
            // VERIFY RAZORPAY SIGNATURE
            // =================================================

            if (
                !process.env.RAZORPAY_KEY_SECRET
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Razorpay secret is not configured."
                });

            }


            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env
                            .RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest("hex");


            if (
                generatedSignature.length !==
                razorpay_signature.length
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment verification failed."
                });

            }


            const signatureValid =
                crypto.timingSafeEqual(

                    Buffer.from(
                        generatedSignature
                    ),

                    Buffer.from(
                        razorpay_signature
                    )

                );


            if (!signatureValid) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment verification failed."
                });

            }


            // =================================================
            // VERIFY RAZORPAY ORDER AMOUNT
            // =================================================

            const razorpayOrder =
                await razorpay.orders.fetch(
                    razorpay_order_id
                );


            const paymentAmount =
                Number(
                    booking.pendingPaymentAmount ||
                    0
                );


            if (
                !Number.isFinite(
                    paymentAmount
                ) ||
                paymentAmount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment amount could not be determined."
                });

            }


            if (
                Number(
                    razorpayOrder.amount
                ) !==
                Math.round(
                    paymentAmount * 100
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Payment amount does not match the order."
                });

            }


            // =================================================
            // PAYMENT DETAILS
            // =================================================

            let paymentMethod = null;
            let bankName = null;
            let paymentVpa = null;
            let paymentWallet = null;
            let cardNetwork = null;
            let cardLast4 = null;
            let cardIssuer = null;


            try {

                const payment =
                    await razorpay
                        .payments
                        .fetch(
                            razorpay_payment_id
                        );


                paymentMethod =
                    payment.method ||
                    null;

                bankName =
                    payment.bank ||
                    null;

                paymentVpa =
                    payment.vpa ||
                    null;

                paymentWallet =
                    payment.wallet ||
                    null;

                cardNetwork =
                    payment.card?.network ||
                    null;

                cardLast4 =
                    payment.card?.last4 ||
                    null;

                cardIssuer =
                    payment.card?.issuer ||
                    null;

            }

            catch (error) {

                console.error(
                    "Payment details fetch failed:",
                    error.message
                );

            }


            // =================================================
            // FIRESTORE TRANSACTION
            // =================================================

            const paymentRef =
                bookingRef
                    .collection("payments")
                    .doc(
                        razorpay_payment_id
                    );


            let result;


            await firebaseDb.runTransaction(
                async (transaction) => {

                    const freshSnapshot =
                        await transaction.get(
                            bookingRef
                        );


                    if (
                        !freshSnapshot.exists
                    ) {

                        throw new Error(
                            "Booking not found."
                        );

                    }


                    const freshBooking =
                        freshSnapshot.data();


                    const existingPayment =
                        await transaction.get(
                            paymentRef
                        );


                    // =========================================
                    // PAYMENT ALREADY PROCESSED
                    // =========================================

                    if (
                        existingPayment.exists
                    ) {

                        const existing =
                            existingPayment.data();


                        const total =
                            Number(
                                freshBooking.price ||
                                freshBooking.amount ||
                                freshBooking.totalAmount ||
                                0
                            );


                        const paid =
                            Math.min(

                                Number(
                                    freshBooking.amountPaid ||
                                    0
                                ),

                                total

                            );


                        result = {

                            paymentAmount:
                                Number(
                                    existing.amount ||
                                    paymentAmount
                                ),

                            totalAmount:
                                total,

                            amountPaid:
                                paid,

                            amountDue:
                                Math.max(
                                    0,
                                    total - paid
                                ),

                            paymentStatus:
                                freshBooking.paymentStatus ||
                                "Paid"

                        };


                        return;

                    }


                    // =========================================
                    // TOTAL
                    // =========================================

                    const totalAmount =
                        Number(
                            freshBooking.price ||
                            freshBooking.amount ||
                            freshBooking.totalAmount ||
                            0
                        );


                    if (
                        !Number.isFinite(
                            totalAmount
                        ) ||
                        totalAmount <= 0
                    ) {

                        throw new Error(
                            "Invalid booking amount."
                        );

                    }


                    // =========================================
                    // OLD PAID
                    // =========================================

                    const oldPaid =
                        Number(
                            freshBooking.amountPaid ||
                            0
                        );


                    const safeOldPaid =
                        Math.max(
                            0,
                            Math.min(
                                oldPaid,
                                totalAmount
                            )
                        );


                    // =========================================
                    // PREVENT OVERPAYMENT
                    // =========================================

                    if (
                        paymentAmount >
                        (
                            totalAmount -
                            safeOldPaid +
                            0.01
                        )
                    ) {

                        throw new Error(
                            "This payment is greater than the remaining amount."
                        );

                    }


                    // =========================================
                    // NEW TOTAL
                    // =========================================

                    const newPaid =
                        Number(
                            (
                                safeOldPaid +
                                paymentAmount
                            ).toFixed(2)
                        );


                    const amountPaid =
                        Math.min(
                            newPaid,
                            totalAmount
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
                            : "Partially Paid";


                    // =========================================
                    // SAVE PAYMENT HISTORY
                    // =========================================

                    transaction.set(

                        paymentRef,

                        {

                            razorpayPaymentId:
                                razorpay_payment_id,

                            razorpayOrderId:
                                razorpay_order_id,

                            amount:
                                paymentAmount,

                            totalAmount:
                                totalAmount,

                            amountPaidBefore:
                                safeOldPaid,

                            cumulativeAmountPaid:
                                amountPaid,

                            amountDueAfter:
                                amountDue,

                            paymentStatus:
                                paymentStatus,

                            paymentMethod:
                                paymentMethod,

                            bankName:
                                bankName,

                            paymentVpa:
                                paymentVpa,

                            paymentWallet:
                                paymentWallet,

                            cardNetwork:
                                cardNetwork,

                            cardLast4:
                                cardLast4,

                            cardIssuer:
                                cardIssuer,

                            userId:
                                decodedToken.uid,

                            bookingId:
                                bookingId,

                            paidAt:
                                FieldValue
                                    .serverTimestamp()

                        }

                    );


                    // =========================================
                    // UPDATE BOOKING
                    // =========================================

                    transaction.update(

                        bookingRef,

                        {

                            amountPaid:
                                amountPaid,

                            amountDue:
                                amountDue,

                            paymentStatus:
                                paymentStatus,

                            razorpayPaymentId:
                                razorpay_payment_id,

                            razorpaySignature:
                                razorpay_signature,

                            paidAt:
                                FieldValue
                                    .serverTimestamp(),

                            pendingPaymentAmount:
                                FieldValue.delete()

                        }

                    );


                    result = {

                        paymentAmount:
                            paymentAmount,

                        totalAmount:
                            totalAmount,

                        amountPaid:
                            amountPaid,

                        amountDue:
                            amountDue,

                        paymentStatus:
                            paymentStatus

                    };

                }

            );


            // =================================================
            // PAYMENT RECEIPT EMAIL
            // =================================================

            try {

                const customerEmail =
                    booking.customerEmail ||
                    decodedToken.email ||
                    "";


                if (customerEmail) {

                    const eventName =
                        booking.eventName ||
                        "Event";


                    const eventDate =
                        booking.eventDate ||
                        "Not specified";


                    const bookingReference =
                        "BK-" +
                        bookingId
                            .substring(0, 8)
                            .toUpperCase();


                    const paymentDate =
                        new Date()
                            .toLocaleString(
                                "en-IN",
                                {
                                    timeZone:
                                        "Asia/Kolkata"
                                }
                            );


                    const emailText =
`Hello,

Your EventSphere payment has been successfully verified.

================================
        PAYMENT RECEIPT
================================

Booking ID:
${bookingReference}

Event:
${eventName}

Event Date:
${eventDate}

Amount Paid This Time:
₹${Number(
    result.paymentAmount
).toLocaleString("en-IN")}

Total Paid So Far:
₹${Number(
    result.amountPaid
).toLocaleString("en-IN")}

Amount Remaining:
₹${Number(
    result.amountDue
).toLocaleString("en-IN")}

Payment ID:
${razorpay_payment_id}

Payment Date:
${paymentDate}

Payment Status:
${result.paymentStatus}

================================

Thank you for choosing EventSphere.

Regards,
EventSphere Team`;


                    await sendEmail({

                        to:
                            customerEmail,

                        subject:
                            `EventSphere Payment Receipt - ${bookingReference}`,

                        text:
                            emailText

                    });

                }

            }

            catch (emailError) {

                console.error(
                    "Receipt email failed:",
                    emailError.response?.data ||
                    emailError.message
                );

                // Payment is already successful.
                // Do NOT fail the payment response.
            }


            return res.json({

                success: true,

                message:
                    "Payment verified successfully.",

                paymentAmount:
                    result.paymentAmount,

                totalAmount:
                    result.totalAmount,

                amountPaid:
                    result.amountPaid,

                amountDue:
                    result.amountDue,

                paymentStatus:
                    result.paymentStatus

            });

        }

        catch (error) {

            console.error(
                "VERIFY PAYMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Unable to verify payment."
            });

        }

    }
);


// =========================================================
// GET PAYMENT DETAILS
// =========================================================

app.get(
    "/payment-details/:bookingId/:paymentId",
    async (req, res) => {

        try {

            if (
                !firebaseAuth ||
                !firebaseDb ||
                !razorpay
            ) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Payment service is not initialized."
                });

            }


            const authHeader =
                req.headers.authorization ||
                "";


            if (
                !authHeader.startsWith(
                    "Bearer "
                )
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required."
                });

            }


            const idToken =
                authHeader.substring(7);


            const decodedToken =
                await firebaseAuth
                    .verifyIdToken(
                        idToken
                    );


            const {
                bookingId,
                paymentId
            } = req.params;


            const bookingRef =
                firebaseDb
                    .collection("bookings")
                    .doc(bookingId);


            const bookingSnapshot =
                await bookingRef.get();


            if (!bookingSnapshot.exists) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Booking not found."
                });

            }


            const booking =
                bookingSnapshot.data();


            const ownerId =
                booking.customerId ||
                booking.userId;


            if (
                ownerId !==
                decodedToken.uid
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You cannot view this payment."
                });

            }


            const payment =
                await razorpay
                    .payments
                    .fetch(
                        paymentId
                    );


            return res.json({

                success: true,

                paymentMethod:
                    payment.method ||
                    null,

                bankName:
                    payment.bank ||
                    null,

                paymentVpa:
                    payment.vpa ||
                    null,

                paymentWallet:
                    payment.wallet ||
                    null,

                cardNetwork:
                    payment.card?.network ||
                    null,

                cardLast4:
                    payment.card?.last4 ||
                    null,

                cardIssuer:
                    payment.card?.issuer ||
                    null

            });

        }

        catch (error) {

            console.error(
                "PAYMENT DETAILS ERROR:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch payment details."
            });

        }

    }
);


// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "EventSphere Backend Running"

        });

    }
);


// =========================================================
// UNKNOWN API ROUTE
// =========================================================

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found",

            path:
                req.originalUrl

        });

    }
);


// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "GLOBAL SERVER ERROR:",
            error
        );


        if (res.headersSent) {

            return next(error);

        }


        res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);


// =========================================================
// START SERVER
// =========================================================

app.listen(
    PORT,
    () => {

        console.log(
            `EventSphere Backend Running on port ${PORT}`
        );

        console.log(
            `Brevo configured: ${
                BREVO_API_KEY
                    ? "YES"
                    : "NO"
            }`
        );

        console.log(
            `Razorpay configured: ${
                razorpay
                    ? "YES"
                    : "NO"
            }`
        );

    }
);