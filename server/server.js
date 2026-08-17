require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");

const {
    initializeApp,
    cert,
    getApps
} = require("firebase-admin/app");

const {
    getAuth
} = require("firebase-admin/auth");


const app =
    express();


app.use(cors());

app.use(
    express.json()
);


// =========================================================
// FIREBASE ADMIN
// =========================================================

const serviceAccountPath =
    "/etc/secrets/firebase-service-account.json";


let firebaseAuth =
    null;


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


            // =================================================
            // OTP TYPE
            // =================================================

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


            // =================================================
            // SUCCESS
            // =================================================

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


        // =================================================
        // CHECK OTP EXISTS
        // =================================================

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


        // =================================================
        // OTP VERIFIED
        // =================================================

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


            // =================================================
            // VALIDATION
            // =================================================

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


            // =================================================
            // ADMIN EMAIL
            // =================================================

            const adminEmail =
                "eventsphere.official2026@gmail.com";


            // =================================================
            // SUBJECT
            // =================================================

            const subject =
                "EventSphere Booking Cancelled by Customer";


            // =================================================
            // MESSAGE
            // =================================================

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