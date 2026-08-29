import { db, auth } from "./firebase-config.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    setDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// =========================================================
// OTP ELEMENTS
// =========================================================

const otpInputs =
    document.querySelectorAll(".otp-box-input");

const hiddenOtp =
    document.getElementById("bookingOtp");


// =========================================================
// OTP BOXES
// =========================================================

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


// =========================================================
// VERIFY BOOKING OTP
// =========================================================

document
    .getElementById("bookingOtpForm")
    .addEventListener("submit", async (e) => {

        e.preventDefault();


        // =====================================================
        // GET OTP
        // =====================================================

        const otp =
            Array.from(otpInputs)
                .map(input => input.value)
                .join("");


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
        // CHECK OTP LENGTH
        // =====================================================

        if (otp.length !== 6) {

            alert(
                "Please enter the complete 6-digit OTP."
            );

            return;

        }


        // =====================================================
        // GET BOOKING DATA
        // =====================================================

        const savedBookingData =
            localStorage.getItem(
                "bookingData"
            );


        if (!savedBookingData) {

            alert(
                "Booking information not found."
            );

            window.location.href =
                "customer-events.html";

            return;

        }


        let bookingData;


        try {

            bookingData =
                JSON.parse(
                    savedBookingData
                );

        }

        catch (error) {

            console.error(
                "Booking data error:",
                error
            );

            alert(
                "Invalid booking information. Please create the booking again."
            );

            return;

        }


        try {

            // =================================================
            // STEP 1 — VERIFY OTP WITH SERVER
            // =================================================

            const otpResponse =
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


            const otpData =
                await otpResponse.json();


            console.log(
                "OTP verification response:",
                otpData
            );


            if (
                !otpResponse.ok ||
                !otpData.success
            ) {

                alert(
                    otpData.message ||
                    "Incorrect or expired OTP."
                );

                return;

            }


            // =================================================
            // STEP 2 — CREATE BOOKING
            // =================================================

            const bookingRef =
                await addDoc(

                    collection(
                        db,
                        "bookings"
                    ),

                    {

                        eventId:
                            bookingData.eventId,

                        eventName:
                            bookingData.eventName,

                        price:
                            Number(
                                bookingData.price || 0
                            ),

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

                        paymentStatus:
                            "Unpaid",

                        createdAt:
                            serverTimestamp()

                    }

                );


            console.log(
                "Booking created:",
                bookingRef.id
            );


            // =================================================
            // STEP 3 — UPDATE STATISTICS
            // =================================================
            //
            // This is kept separate.
            // If statistics update fails, the booking
            // should NOT be treated as a failed booking.
            // =================================================

            try {

                await setDoc(

                    doc(
                        db,
                        "statistics",
                        "main"
                    ),

                    {

                        totalBookings:
                            increment(1)

                    },

                    {

                        merge:
                            true

                    }

                );


                console.log(
                    "Statistics updated successfully."
                );

            }

            catch (statisticsError) {

                console.error(
                    "Statistics update failed:",
                    statisticsError
                );

                // Do NOT fail the booking because
                // only the statistics update failed.

            }


            // =================================================
            // STEP 4 — CLEAR TEMPORARY DATA
            // =================================================

            localStorage.removeItem(
                "bookingData"
            );


            localStorage.removeItem(
                "selectedEventId"
            );


            // =================================================
            // STEP 5 — SUCCESS
            // =================================================

            alert(
                "Booking verified successfully! Waiting for admin approval."
            );


            window.location.href =
                "customer-dashboard.html";

        }


        catch (error) {

            console.error(
                "BOOKING VERIFICATION ERROR:",
                error
            );


            // =================================================
            // SHOW ACTUAL ERROR
            // =================================================

            alert(
                "Booking could not be completed.\n\n" +
                (error.message ||
                "Please try again.")
            );

        }

    });


// =========================================================
// RESEND OTP
// =========================================================

document
    .getElementById("resendBookingOtp")
    .addEventListener("click", async () => {

        const user =
            auth.currentUser;


        if (!user) {

            alert(
                "Please login first."
            );

            return;

        }


        try {

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/send-otp",
                    {

                        method:
                            "POST",

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


            if (
                response.ok &&
                data.success
            ) {

                alert(
                    "New OTP has been sent to your email."
                );

            }

            else {

                alert(
                    data.message ||
                    "Unable to resend OTP."
                );

            }

        }

        catch (error) {

            console.error(
                "Resend OTP Error:",
                error
            );


            alert(
                "Unable to resend OTP. Please try again."
            );

        }

    });