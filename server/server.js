require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// Temporary OTP storage
const otpStore = {};

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

        otpStore[email] = {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        };

        console.log("Generated OTP:", otp);

        // Send email using Brevo API
        await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: {
                    name: "EventSphere",
                    email: "eventsphere.official2026@gmail.com"
                },
                to: [
                    {
                        email: email
                    }
                ],
                subject: "EventSphere Email Verification OTP",
                textContent: `Your EventSphere OTP is ${otp}. It is valid for 5 minutes.`
            },
            {
                headers: {
                    accept: "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                }
            }
        );

        res.json({
            success: true,
            message: "OTP sent successfully!"
        });

    } catch (error) {
        console.error("Brevo Error:", error.response?.data || error.message);

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

    res.json({
        success: true,
        message: "OTP verified successfully!"
    });
});

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("EventSphere Backend Running");
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});