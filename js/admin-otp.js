const otpInputs = document.querySelectorAll(".otp-digit");
const hiddenOtp = document.getElementById("adminOtp");

otpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {

        input.value = input.value.replace(/\D/g, "");

        if (input.value && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }

        hiddenOtp.value =
            Array.from(otpInputs).map(i => i.value).join("");

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


document.getElementById("adminOtpForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const otp = Array.from(otpInputs)
        .map(input => input.value)
        .join("");

    const email = localStorage.getItem("adminOtpEmail");

    if (otp.length !== 6) {
        alert("Please enter the complete 6-digit OTP.");
        return;
    }

    try {

        const response = await fetch(
            "https://eventsphere-dndh.onrender.com/verify-otp",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    otp: otp
                })
            }
        );

        const data = await response.json();

        if (data.success) {

            alert("Admin OTP Verified Successfully!");

            localStorage.removeItem("adminOtpEmail");

            window.location.href = "admin-dashboard.html";

        } else {

            alert(data.message);

        }

    } catch (error) {

        console.error(error);

        alert("Server Error");

    }

});