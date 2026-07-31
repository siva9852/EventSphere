require("dotenv").config();

console.log("SMTP User:", process.env.BREVO_SMTP_USER);

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();

app.use(cors());
app.use(express.json());

// Temporary OTP storage
const otpStore = {};

// Brevo SMTP
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
    },
});

// ================= SEND OTP =================
app.post("/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Store OTP
        otpStore[email] = {
            otp: otp,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        };

        console.log(otpStore);

        // Send Email
        await transporter.sendMail({
            from: '"EventSphere" <eventsphere.official2026@gmail.com>',
            to: email,
            subject: "EventSphere Email Verification OTP",
            text: `Your EventSphere OTP is: ${otp}. It is valid for 5 minutes.`,
        });

        res.json({
            success: true,
            message: "OTP sent successfully!"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to send OTP."
        });

    }

});

// ================= VERIFY OTP =================
app.post("/verify-otp", (req, res) => {

    const { email, otp } = req.body;

    if (!otpStore[email]) {
        return res.status(400).json({
            success: false,
            message: "OTP not found."
        });
    }

    if (Date.now() > otpStore[email].expiresAt) {
        delete otpStore[email];

        return res.status(400).json({
            success: false,
            message: "OTP expired."
        });
    }

    if (Number(otp) !== otpStore[email].otp) {
        return res.status(400).json({
            success: false,
            message: "Invalid OTP."
        });
    }

    delete otpStore[email];

    return res.json({
        success: true,
        message: "OTP verified successfully!"
    });

});

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("EventSphere Backend is Running!");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});