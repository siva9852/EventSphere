const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");

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

const path = require("path");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

/* =====================================================
   FIREBASE ADMIN
===================================================== */

const serviceAccountPath =
    "/etc/secrets/firebase-service-account.json";

let firebaseAuth = null;
let db = null;

if (require("fs").existsSync(serviceAccountPath)) {

    const serviceAccount =
        JSON.parse(
            require("fs").readFileSync(
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

    firebaseAuth =
        getAuth();

    db =
        getFirestore();

    console.log(
        "Firebase Admin initialized."
    );

} else {

    console.error(
        "Firebase service account file not found."
    );
}
/* =====================================================
   ENVIRONMENT VARIABLES
===================================================== */

const PORT = process.env.PORT || 10000;

const RAZORPAY_KEY_ID =
    process.env.RAZORPAY_KEY_ID || "";

const RAZORPAY_KEY_SECRET =
    process.env.RAZORPAY_KEY_SECRET || "";

const BREVO_API_KEY =
    process.env.BREVO_API_KEY || "";

const EMAIL_FROM =
    process.env.EMAIL_FROM || "";

const EMAIL_FROM_NAME =
    process.env.EMAIL_FROM_NAME || "EventSphere";

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://eventsphere-dndh.web.app";

/* =====================================================
   RAZORPAY
===================================================== */

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

/* =====================================================
   BASIC ROUTES
===================================================== */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "EventSphere backend is running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy"
    });
});

/* =====================================================
   FIREBASE AUTH HELPER
===================================================== */

async function verifyFirebaseToken(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing"
            });
        }

        const idToken =
            authHeader.replace("Bearer ", "").trim();

        const decodedToken =
           firebaseAuth.verifyIdToken(idToken);

        req.user = decodedToken;

        next();

    } catch (error) {

        console.error(
            "Firebase authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token"
        });
    }
}

/* =====================================================
   ADMIN AUTH HELPER
===================================================== */

async function verifyAdmin(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing"
            });
        }

        const idToken =
            authHeader.replace("Bearer ", "").trim();

        const decodedToken =
            firebaseAuth.verifyIdToken(idToken);

        req.user = decodedToken;

        const email =
            String(decodedToken.email || "")
                .toLowerCase();

        const adminEmails = [
            "admin@eventsphere.com"
        ];

        if (!adminEmails.includes(email)) {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        next();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token"
        });
    }
}

/* =====================================================
   CREATE RAZORPAY ORDER
   PARTIAL PAYMENT SUPPORTED
===================================================== */

app.post(
    "/create-payment-order",
    verifyFirebaseToken,
    async (req, res) => {

        try {

            const {
                bookingId,
                paymentAmount
            } = req.body;

            if (!bookingId) {
                return res.status(400).json({
                    success: false,
                    message: "Booking ID is required"
                });
            }

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            const booking =
                bookingSnap.data();

            /* -----------------------------------------
               CHECK BOOKING OWNER
            ----------------------------------------- */

            if (
                booking.userId &&
                booking.userId !== req.user.uid
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not allowed to pay for this booking"
                });
            }

            /* -----------------------------------------
               TOTAL BOOKING AMOUNT
            ----------------------------------------- */

            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );

            if (
                !Number.isFinite(totalAmount) ||
                totalAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid booking amount"
                });
            }

            /* -----------------------------------------
               PREVIOUSLY PAID AMOUNT

               New bookings:
               booking.amountPaid

               Old bookings:
               if status is Paid, assume total paid
            ----------------------------------------- */

            let amountPaid;

            if (
                booking.amountPaid !== undefined &&
                booking.amountPaid !== null
            ) {

                amountPaid =
                    Number(booking.amountPaid || 0);

            } else if (
                booking.paymentStatus === "Paid"
            ) {

                amountPaid =
                    totalAmount;

            } else {

                amountPaid = 0;
            }

            amountPaid =
                Math.max(
                    0,
                    Math.min(amountPaid, totalAmount)
                );

            /* -----------------------------------------
               CURRENT AMOUNT DUE
            ----------------------------------------- */

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

            if (amountDue <= 0) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This booking is already fully paid"
                });
            }

            /* -----------------------------------------
               CUSTOMER PAYMENT AMOUNT

               Customer can enter:
               ₹1
               ₹5000
               ₹20000
               etc.

               But never more than amount due.
            ----------------------------------------- */

            const requestedAmount =
                Number(paymentAmount);

            if (
                !Number.isFinite(requestedAmount) ||
                requestedAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid payment amount"
                });
            }

            if (requestedAmount > amountDue) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Payment amount cannot exceed the current due amount of ₹${amountDue.toLocaleString("en-IN")}`
                });
            }

            const finalPaymentAmount =
                Number(
                    requestedAmount.toFixed(2)
                );

            /* -----------------------------------------
               CREATE RAZORPAY ORDER

               IMPORTANT:
               Razorpay receives ONLY the amount
               customer selected.

               Example:

               Total = ₹50,000
               Paid  = ₹0
               Customer enters = ₹20,000

               Razorpay order = ₹20,000

               Remaining due = ₹30,000
            ----------------------------------------- */

            const razorpayOrder =
                await razorpay.orders.create({

                    amount:
                        Math.round(
                            finalPaymentAmount * 100
                        ),

                    currency: "INR",

                    receipt:
                        `booking_${bookingId}_${Date.now()}`,

                    notes: {

                        bookingId:
                            String(bookingId),

                        userId:
                            String(
                                booking.userId ||
                                req.user.uid
                            ),

                        totalAmount:
                            String(totalAmount),

                        amountPaid:
                            String(amountPaid),

                        amountDue:
                            String(amountDue),

                        paymentAmount:
                            String(finalPaymentAmount)
                    }
                });

            /* -----------------------------------------
               SAVE PENDING PAYMENT INFORMATION

               This is important because when Razorpay
               returns the payment we need to know how
               much this particular installment was for.
            ----------------------------------------- */

            await bookingRef.update({

                razorpayOrderId:
                    razorpayOrder.id,

                pendingPaymentAmount:
                    finalPaymentAmount,

                pendingPaymentCreatedAt:
                    FieldValue.serverTimestamp(),

                paymentStatus:
                    amountPaid > 0
                        ? "Partially Paid"
                        : "Payment Initiated"
            });

            return res.json({

                success: true,

                orderId:
                    razorpayOrder.id,

                keyId:
                    RAZORPAY_KEY_ID,

                amount:
                    razorpayOrder.amount,

                currency:
                    razorpayOrder.currency,

                paymentAmount:
                    finalPaymentAmount,

                totalAmount:
                    totalAmount,

                amountPaid:
                    amountPaid,

                amountDue:
                    amountDue
            });

        } catch (error) {

            console.error(
                "Create payment order error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create payment order",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   VERIFY RAZORPAY PAYMENT
   CUMULATIVE PARTIAL PAYMENT
===================================================== */

app.post(
    "/verify-payment",
    verifyFirebaseToken,
    async (req, res) => {

        try {

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
                        "Payment verification details are incomplete"
                });
            }

            /* -----------------------------------------
               GET BOOKING
            ----------------------------------------- */

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found"
                });
            }

            const booking =
                bookingSnap.data();

            /* -----------------------------------------
               CHECK OWNER
            ----------------------------------------- */

            if (
                booking.userId &&
                booking.userId !== req.user.uid
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "You are not allowed to verify this payment"
                });
            }

            /* -----------------------------------------
               VERIFY RAZORPAY SIGNATURE
            ----------------------------------------- */

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest("hex");

            if (
                generatedSignature !==
                razorpay_signature
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Payment signature verification failed"
                });
            }

            /* -----------------------------------------
               TOTAL BOOKING AMOUNT
            ----------------------------------------- */

            const totalAmount =
                Number(
                    booking.price ||
                    booking.amount ||
                    booking.totalAmount ||
                    0
                );

            /* -----------------------------------------
               OLD AMOUNT PAID
            ----------------------------------------- */

            let oldAmountPaid;

            if (
                booking.amountPaid !== undefined &&
                booking.amountPaid !== null
            ) {

                oldAmountPaid =
                    Number(
                        booking.amountPaid || 0
                    );

            } else if (
                booking.paymentStatus === "Paid"
            ) {

                oldAmountPaid =
                    totalAmount;

            } else {

                oldAmountPaid = 0;
            }

            oldAmountPaid =
                Math.max(
                    0,
                    Math.min(
                        oldAmountPaid,
                        totalAmount
                    )
                );

            /* -----------------------------------------
               CURRENT INSTALLMENT

               Read the amount saved when the order
               was created.
            ----------------------------------------- */

            const paymentAmount =
                Number(
                    booking.pendingPaymentAmount || 0
                );

            if (
                !Number.isFinite(paymentAmount) ||
                paymentAmount <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Payment amount could not be determined"
                });
            }

            const newAmountPaid =
                Number(
                    (
                        oldAmountPaid +
                        paymentAmount
                    ).toFixed(2)
                );

            const amountPaid =
                Math.min(
                    newAmountPaid,
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

           // =========================================================
// GET RAZORPAY PAYMENT DETAILS
// =========================================================

let paymentMethod = null;
let bankName = null;
let paymentVpa = null;
let paymentWallet = null;
let cardNetwork = null;
let cardLast4 = null;
let cardIssuer = null;

try {

    const razorpayPayment =
        await razorpay.payments.fetch(
            razorpay_payment_id
        );

    paymentMethod =
        razorpayPayment.method || null;

    bankName =
        razorpayPayment.bank || null;

    paymentVpa =
        razorpayPayment.vpa || null;

    paymentWallet =
        razorpayPayment.wallet || null;

    cardNetwork =
        razorpayPayment.card?.network || null;

    cardLast4 =
        razorpayPayment.card?.last4 || null;

    cardIssuer =
        razorpayPayment.card?.issuer || null;

    console.log(
        "Razorpay payment details:",
        {
            method: paymentMethod,
            bank: bankName,
            vpa: paymentVpa,
            wallet: paymentWallet,
            cardNetwork: cardNetwork,
            cardLast4: cardLast4,
            cardIssuer: cardIssuer
        }
    );

}
catch (paymentDetailsError) {

    console.error(
        "Unable to fetch Razorpay payment details:",
        paymentDetailsError.message
    );

}

            /* -----------------------------------------
               SAVE PAYMENT HISTORY

               Every installment gets its own document.

               Payment 1 = ₹20,000
               Payment 2 = ₹30,000

               Both remain in Firestore.
            ----------------------------------------- */

            const paymentHistoryRef =
                bookingRef
                    .collection("payments")
                    .doc(razorpay_payment_id);

            await paymentHistoryRef.set({

                razorpayPaymentId:
                    razorpay_payment_id,

                razorpayOrderId:
                    razorpay_order_id,

                bookingId:
                    bookingId,

                userId:
                    req.user.uid,

                amount:
                    paymentAmount,

                totalAmount:
                    totalAmount,

                amountPaidBefore:
                    oldAmountPaid,

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

                paidAt:
                    FieldValue.serverTimestamp()
            });

            /* -----------------------------------------
               UPDATE MAIN BOOKING
            ----------------------------------------- */

            await bookingRef.update({

                amountPaid:
                    amountPaid,

                amountDue:
                    amountDue,

                paymentStatus:
                    paymentStatus,

                razorpayPaymentId:
                    razorpay_payment_id,

                razorpayOrderId:
                    razorpay_order_id,

                lastPaymentAmount:
                    paymentAmount,

                lastPaymentMethod:
                    paymentMethod,

                paymentDate:
                    FieldValue.serverTimestamp(),

                pendingPaymentAmount:
                    FieldValue.delete(),

                pendingPaymentCreatedAt:
                    FieldValue.delete()
            });

            /* -----------------------------------------
               RESPONSE
            ----------------------------------------- */

            return res.json({

                success: true,

                message:
                    paymentStatus === "Paid"
                        ? "Payment completed successfully"
                        : "Partial payment completed successfully",

                bookingId:
                    bookingId,

                razorpayOrderId:
                    razorpay_order_id,

                razorpayPaymentId:
                    razorpay_payment_id,

                paymentAmount:
                    paymentAmount,

                totalAmount:
                    totalAmount,

                amountPaid:
                    amountPaid,

                amountDue:
                    amountDue,

                paymentStatus:
                    paymentStatus,

                paymentMethod:
                    paymentMethod
            });

        } catch (error) {

            console.error(
                "Verify payment error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment verification failed",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   GET PAYMENT HISTORY
===================================================== */

app.get(
    "/payment-history/:bookingId",
    verifyFirebaseToken,
    async (req, res) => {

        try {

            const bookingId =
                req.params.bookingId;

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found"
                });
            }

            const booking =
                bookingSnap.data();

            if (
                booking.userId &&
                booking.userId !== req.user.uid
            ) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Access denied"
                });
            }

            const paymentsSnapshot =
                await bookingRef
                    .collection("payments")
                    .orderBy(
                        "paidAt",
                        "asc"
                    )
                    .get();

            const payments =
                paymentsSnapshot.docs.map(
                    (paymentDoc) => ({
                        id:
                            paymentDoc.id,
                        ...paymentDoc.data()
                    })
                );

            return res.json({
                success: true,
                payments: payments
            });

        } catch (error) {

            console.error(
                "Payment history error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load payment history",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   GET SINGLE RAZORPAY PAYMENT DETAILS
   USED FOR OLD PAYMENT HISTORY
===================================================== */

app.get(
    "/payment-details/:bookingId/:paymentId",
    verifyFirebaseToken,
    async (req, res) => {

        try {

            const {
                bookingId,
                paymentId
            } = req.params;

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found"
                });
            }

            const booking =
                bookingSnap.data();

            // Make sure this booking belongs to the logged-in user
            if (
                booking.userId &&
                booking.userId !== req.user.uid
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            // Fetch the old payment details from Razorpay
            const payment =
                await razorpay.payments.fetch(
                    paymentId
                );

            return res.json({
                success: true,

                paymentMethod:
                    payment.method || null,

                bankName:
                    payment.bank || null,

                paymentVpa:
                    payment.vpa || null,

                paymentWallet:
                    payment.wallet || null,

                cardNetwork:
                    payment.card?.network || null,

                cardLast4:
                    payment.card?.last4 || null,

                cardIssuer:
                    payment.card?.issuer || null
            });

        } catch (error) {

            console.error(
                "Payment details error:",
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

/* =====================================================
   EMAIL CONFIGURATION
===================================================== */

let transporter = null;

if (EMAIL_FROM) {

    transporter =
        nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: EMAIL_FROM,
                pass:
                    process.env.EMAIL_PASSWORD ||
                    ""
            }
        });
}

/* =====================================================
   BREVO EMAIL HELPER
===================================================== */

async function sendBrevoEmail({
    to,
    subject,
    html
}) {

    if (!BREVO_API_KEY) {

        console.log(
            "BREVO_API_KEY is not configured"
        );

        return false;
    }

    try {

        const response =
            await fetch(
                "https://api.brevo.com/v3/smtp/email",
                {

                    method: "POST",

                    headers: {

                        "accept":
                            "application/json",

                        "api-key":
                            BREVO_API_KEY,

                        "content-type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            sender: {

                                name:
                                    EMAIL_FROM_NAME,

                                email:
                                    EMAIL_FROM
                            },

                            to: [
                                {
                                    email:
                                        to
                                }
                            ],

                            subject:
                                subject,

                            htmlContent:
                                html
                        })
                }
            );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Brevo email error:",
                errorText
            );

            return false;
        }

        return true;

    } catch (error) {

        console.error(
            "Brevo send error:",
            error.message
        );

        return false;
    }
}

/* =====================================================
   PAYMENT RECEIPT EMAIL
===================================================== */

async function sendPaymentReceiptEmail({
    bookingId,
    booking,
    paymentAmount,
    amountPaid,
    amountDue,
    paymentStatus,
    razorpayPaymentId,
    razorpayOrderId,
    paymentMethod
}) {

    try {

        const customerEmail =
            booking.email ||
            booking.userEmail ||
            booking.customerEmail;

        if (!customerEmail) {

            console.log(
                "No customer email found for booking:",
                bookingId
            );

            return false;
        }

        const eventName =
            booking.eventName ||
            booking.eventTitle ||
            booking.title ||
            "Event";

        const customerName =
            booking.name ||
            booking.userName ||
            booking.customerName ||
            "Customer";

        const statusText =
            paymentStatus === "Paid"
                ? "Paid"
                : "Partially Paid";

        const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1.0">

<title>EventSphere Payment Receipt</title>

</head>

<body style="
margin:0;
padding:0;
font-family:Arial,sans-serif;
background:#f5f7fb;
">

<div style="
max-width:650px;
margin:30px auto;
background:#ffffff;
border-radius:12px;
overflow:hidden;
box-shadow:0 4px 20px rgba(0,0,0,0.08);
">

<div style="
padding:25px;
background:#172554;
color:#ffffff;
">

<h1 style="
margin:0;
font-size:24px;
">
EventSphere
</h1>

<p style="
margin:8px 0 0;
font-size:14px;
opacity:.9;
">
Payment Receipt
</p>

</div>

<div style="padding:25px;">

<h2 style="
margin-top:0;
color:#172554;
">
Payment Successful
</h2>

<p>
Hello ${customerName},
</p>

<p>
Your payment for
<strong>${eventName}</strong>
has been successfully received.
</p>

<table style="
width:100%;
border-collapse:collapse;
margin-top:20px;
">

<tr>
<td style="padding:10px 0;">
Booking ID
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
">
${bookingId}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
This Payment
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
">
₹${Number(paymentAmount).toLocaleString("en-IN")}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Total Amount
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
">
₹${Number(amountPaid + amountDue).toLocaleString("en-IN")}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Total Paid
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
color:#15803d;
">
₹${Number(amountPaid).toLocaleString("en-IN")}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Amount Due
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
color:#dc2626;
">
₹${Number(amountDue).toLocaleString("en-IN")}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Status
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
">
${statusText}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Payment Method
</td>
<td style="
padding:10px 0;
text-align:right;
font-weight:bold;
">
${paymentMethod || "Razorpay"}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Payment ID
</td>
<td style="
padding:10px 0;
text-align:right;
word-break:break-all;
font-size:12px;
">
${razorpayPaymentId}
</td>
</tr>

<tr>
<td style="padding:10px 0;">
Order ID
</td>
<td style="
padding:10px 0;
text-align:right;
word-break:break-all;
font-size:12px;
">
${razorpayOrderId}
</td>
</tr>

</table>

<p style="
margin-top:25px;
color:#64748b;
font-size:13px;
">

${
    amountDue > 0
        ? `₹${Number(amountDue).toLocaleString("en-IN")} remains to be paid for this booking.`
        : "Your booking has been fully paid."
}

</p>

</div>

</div>

</body>

</html>

`;

        return await sendBrevoEmail({

            to:
                customerEmail,

            subject:
                `EventSphere Payment Receipt - ${eventName}`,

            html:
                html
        });

    } catch (error) {

        console.error(
            "Payment receipt email error:",
            error
        );

        return false;
    }
}

/* =====================================================
   ADMIN - GET ALL BOOKINGS
===================================================== */

app.get(
    "/admin/bookings",
    verifyAdmin,
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection("bookings")
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            const bookings =
                snapshot.docs.map(
                    (doc) => ({
                        id: doc.id,
                        ...doc.data()
                    })
                );

            return res.json({
                success: true,
                bookings: bookings
            });

        } catch (error) {

            console.error(
                "Admin bookings error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load bookings",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   ADMIN - GET SINGLE BOOKING PAYMENT HISTORY
===================================================== */

app.get(
    "/admin/payment-history/:bookingId",
    verifyAdmin,
    async (req, res) => {

        try {

            const bookingId =
                req.params.bookingId;

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found"
                });
            }

            const paymentsSnapshot =
                await bookingRef
                    .collection("payments")
                    .orderBy(
                        "paidAt",
                        "asc"
                    )
                    .get();

            const payments =
                paymentsSnapshot.docs.map(
                    (paymentDoc) => ({
                        id:
                            paymentDoc.id,
                        ...paymentDoc.data()
                    })
                );

            return res.json({

                success: true,

                bookingId:
                    bookingId,

                payments:
                    payments
            });

        } catch (error) {

            console.error(
                "Admin payment history error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load payment history",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   ADMIN - UPDATE BOOKING STATUS
===================================================== */

app.put(
    "/admin/bookings/:bookingId/status",
    verifyAdmin,
    async (req, res) => {

        try {

            const bookingId =
                req.params.bookingId;

            const {
                status
            } = req.body;

            if (!status) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Booking status is required"
                });
            }

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found"
                });
            }

            await bookingRef.update({

                status:
                    status,

                updatedAt:
                    FieldValue.serverTimestamp()
            });

            return res.json({

                success: true,

                message:
                    "Booking status updated successfully"
            });

        } catch (error) {

            console.error(
                "Update booking status error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to update booking status",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   ADMIN - DELETE BOOKING
===================================================== */

app.delete(
    "/admin/bookings/:bookingId",
    verifyAdmin,
    async (req, res) => {

        try {

            const bookingId =
                req.params.bookingId;

            const bookingRef =
                db.collection("bookings")
                    .doc(bookingId);

            const bookingSnap =
                await bookingRef.get();

            if (!bookingSnap.exists) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found"
                });
            }

            /* -----------------------------------------
               DELETE PAYMENT HISTORY FIRST
            ----------------------------------------- */

            const paymentsSnapshot =
                await bookingRef
                    .collection("payments")
                    .get();

            const batch =
                db.batch();

            paymentsSnapshot.docs.forEach(
                (paymentDoc) => {

                    batch.delete(
                        paymentDoc.ref
                    );
                }
            );

            batch.delete(
                bookingRef
            );

            await batch.commit();

            return res.json({

                success: true,

                message:
                    "Booking deleted successfully"
            });

        } catch (error) {

            console.error(
                "Delete booking error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to delete booking",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   USER - GET BOOKINGS
===================================================== */

app.get(
    "/my-bookings",
    verifyFirebaseToken,
    async (req, res) => {

        try {

            const snapshot =
                await db
                    .collection("bookings")
                    .where(
                        "userId",
                        "==",
                        req.user.uid
                    )
                    .get();

            const bookings =
                snapshot.docs.map(
                    (doc) => ({
                        id: doc.id,
                        ...doc.data()
                    })
                );

            bookings.sort(
                (a, b) => {

                    const aTime =
                        a.createdAt?.toMillis
                            ? a.createdAt.toMillis()
                            : 0;

                    const bTime =
                        b.createdAt?.toMillis
                            ? b.createdAt.toMillis()
                            : 0;

                    return bTime - aTime;
                }
            );

            return res.json({

                success: true,

                bookings:
                    bookings
            });

        } catch (error) {

            console.error(
                "My bookings error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load your bookings",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   SEND BOOKING CONFIRMATION EMAIL
===================================================== */

async function sendBookingConfirmationEmail(
    booking
) {

    try {

        const customerEmail =
            booking.email ||
            booking.userEmail ||
            booking.customerEmail;

        if (!customerEmail) {
            return false;
        }

        const customerName =
            booking.name ||
            booking.userName ||
            booking.customerName ||
            "Customer";

        const eventName =
            booking.eventName ||
            booking.eventTitle ||
            booking.title ||
            "Event";

        const totalAmount =
            Number(
                booking.price ||
                booking.amount ||
                booking.totalAmount ||
                0
            );

        const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

</head>

<body style="
font-family:Arial,sans-serif;
background:#f5f7fb;
padding:20px;
">

<div style="
max-width:650px;
margin:auto;
background:#ffffff;
padding:30px;
border-radius:12px;
">

<h1 style="color:#172554;">
EventSphere
</h1>

<h2>
Booking Confirmed
</h2>

<p>
Hello ${customerName},
</p>

<p>
Your booking for
<strong>${eventName}</strong>
has been confirmed.
</p>

<hr>

<p>
<strong>Booking ID:</strong>
${booking.id || "N/A"}
</p>

<p>
<strong>Total Amount:</strong>
₹${totalAmount.toLocaleString("en-IN")}
</p>

<p>
<strong>Payment Status:</strong>
${booking.paymentStatus || "Unpaid"}
</p>

<p>
<strong>Amount Paid:</strong>
₹${Number(
    booking.amountPaid || 0
).toLocaleString("en-IN")}
</p>

<p>
<strong>Amount Due:</strong>
₹${Number(
    booking.amountDue || totalAmount
).toLocaleString("en-IN")}
</p>

<p style="
margin-top:30px;
color:#64748b;
">

Thank you for choosing EventSphere.

</p>

</div>

</body>

</html>

`;

        return await sendBrevoEmail({

            to:
                customerEmail,

            subject:
                `EventSphere Booking Confirmation - ${eventName}`,

            html:
                html
        });

    } catch (error) {

        console.error(
            "Booking confirmation email error:",
            error
        );

        return false;
    }
}

/* =====================================================
   TEST EMAIL
===================================================== */

app.post(
    "/test-email",
    verifyAdmin,
    async (req, res) => {

        try {

            const {
                email
            } = req.body;

            if (!email) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Email address is required"
                });
            }

            const sent =
                await sendBrevoEmail({

                    to:
                        email,

                    subject:
                        "EventSphere Test Email",

                    html: `

                        <h2>
                            EventSphere Email Test
                        </h2>

                        <p>
                            Your email configuration
                            is working correctly.
                        </p>

                    `
                });

            return res.json({

                success:
                    sent,

                message:
                    sent
                        ? "Test email sent successfully"
                        : "Test email could not be sent"
            });

        } catch (error) {

            console.error(
                "Test email error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to send test email",
                error:
                    error.message
            });
        }
    }
);

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use(
    (error, req, res, next) => {

        console.error(
            "Unhandled server error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Internal server error",

            error:
                error.message
        });
    }
);

/* =====================================================
   404 HANDLER
===================================================== */

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

/* =====================================================
   START SERVER
===================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `EventSphere server running on port ${PORT}`
        );

        console.log(
            "Partial payment system enabled"
        );

    }
);