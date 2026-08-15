const otpInputs = document.querySelectorAll(".otp-digit");
const hiddenOtp = document.getElementById("adminOtp");


// ====================== OTP INPUT ======================

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


// ====================== ADMIN OTP VERIFICATION ======================

const adminOtpForm =
    document.getElementById("adminOtpForm");


adminOtpForm.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();


        const otp =
            Array.from(otpInputs)
                .map(input => input.value)
                .join("");


        const email =
            localStorage.getItem(
                "adminOtpEmail"
            );


        // Check email

        if (!email) {

            alert(
                "Admin OTP session expired. Please login again."
            );

            window.location.replace(
                "admin-login.html"
            );

            return;

        }


        // Check OTP

        if (otp.length !== 6) {

            alert(
                "Please enter the complete 6-digit OTP."
            );

            return;

        }


        try {

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/verify-otp",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                email: email,

                                otp: otp

                            })

                    }
                );


            const data =
                await response.json();


            if (data.success) {


                alert(
                    "Admin OTP Verified Successfully!"
                );


                /*
                 * Remove OTP information
                 * after successful verification.
                 */

                localStorage.removeItem(
                    "adminOtpEmail"
                );


                /*
                 * IMPORTANT:
                 * replace() prevents the old
                 * OTP page from remaining in
                 * browser history.
                 */

                window.location.replace(
                    "admin-dashboard.html"
                );


            }

            else {

                alert(
                    data.message
                );

            }

        }

        catch (error) {

            console.error(
                "Admin OTP Error:",
                error
            );


            alert(
                "Server Error"
            );

        }

    }
);