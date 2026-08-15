import { db, auth } from "./firebase-config.js";

import {
    collection,
    addDoc,
    doc,
    serverTimestamp,
    setDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const otpInputs =
    document.querySelectorAll(".otp-box-input");

const hiddenOtp =
    document.getElementById("bookingOtp");


// ================= OTP BOXES =================

otpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {

        input.value =
            input.value.replace(/\D/g, "");

        if (
            input.value &&
            index < otpInputs.length - 1
        ) {

            otpInputs[index + 1].focus();

        }

        hiddenOtp.value =
            Array.from(otpInputs)
                .map(input => input.value)
                .join("");

    });


    input.addEventListener("keydown", (e) => {

        if (
            e.key === "Backspace" &&
            !input.value &&
            index > 0
        ) {

            otpInputs[index - 1].focus();

        }

    });

});


// ================= VERIFY OTP =================

document
    .getElementById("bookingOtpForm")
    .addEventListener("submit", async (e) => {

        e.preventDefault();


        const otp =
            Array.from(otpInputs)
                .map(input => input.value)
                .join("");


        const user =
            auth.currentUser;


        if (!user) {

            alert("Please login first.");

            window.location.href =
                "customer-login.html";

            return;

        }


        if (otp.length !== 6) {

            alert(
                "Please enter the complete 6-digit OTP."
            );

            return;

        }


        const bookingData =
            JSON.parse(
                localStorage.getItem("bookingData")
            );


        if (!bookingData) {

            alert(
                "Booking information not found."
            );

            window.location.href =
                "customer-events.html";

            return;

        }


        try {

            // ================= VERIFY OTP =================

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/verify-otp",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            email:
                                user.email,

                            otp:
                                otp

                        })
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                alert(data.message);

                return;

            }


            // ================= CREATE BOOKING =================

            await addDoc(
                collection(db, "bookings"),
                {

                    eventId:
                        bookingData.eventId,

                    eventName:
                        bookingData.eventName,

                    price:
                        bookingData.price,

                    customerId:
                        user.uid,

                    customerEmail:
                        user.email,

                    eventDate:
                        bookingData.eventDate,

                    eventEndTime:
                        bookingData.eventEndTime,

                    guests:
                        bookingData.guests,

                    location:
                        bookingData.location,

                    requirements:
                        bookingData.requirements,

                    status:
                        "Pending",

                    createdAt:
                        serverTimestamp()

                }
            );


            // ================= UPDATE TOTAL BOOKINGS =================

            await setDoc(
                doc(db, "statistics", "main"),
                {

                    totalBookings:
                        increment(1)

                },
                {
                    merge: true
                }
            );


            // ================= CLEAR DATA =================

            localStorage.removeItem(
                "bookingData"
            );

            localStorage.removeItem(
                "selectedEventId"
            );


            alert(
                "Booking verified successfully! Waiting for admin approval."
            );


            window.location.href =
                "customer-dashboard.html";

        }

        catch (error) {

            console.error(error);

            alert(
                "Booking verification failed."
            );

        }

    });


// ================= RESEND OTP =================

document
    .getElementById("resendBookingOtp")
    .addEventListener("click", async () => {

        const user =
            auth.currentUser;


        if (!user) {

            alert("Please login first.");

            return;

        }


        try {

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/send-otp",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            email:
                                user.email

                        })
                    }
                );


            const data =
                await response.json();


            if (data.success) {

                alert(
                    "New OTP has been sent to your email."
                );

            } else {

                alert(data.message);

            }

        }

        catch (error) {

            console.error(error);

            alert(
                "Unable to resend OTP."
            );

        }

    });