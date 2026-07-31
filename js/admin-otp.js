document.getElementById("adminOtpForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const otp = document.getElementById("adminOtp").value;

    const email = localStorage.getItem("adminOtpEmail");

    try {

        const response = await fetch("https://eventsphere-dndh.onrender.com/verify-otp", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                otp: otp
            })

        });

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