/* =========================================================
   EVENTSPHERE
   SERVICE MAINTENANCE SYSTEM
   PREMIUM SCHEDULED MAINTENANCE
   ========================================================= */

import { db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================================================
   FIRESTORE
   ========================================================= */

const maintenanceRef = doc(
    db,
    "settings",
    "maintenance"
);


/* =========================================================
   SETTINGS
   ========================================================= */

const CHECK_INTERVAL = 10000;

let maintenanceTimer = null;

let countdownTimer = null;

let scheduledPopupShown = false;


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDateTime(date) {

    if (!date || isNaN(date.getTime())) {
        return "Not specified";
    }

    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


/* =========================================================
   GET DATE
   ========================================================= */

function getDate(value) {

    if (!value) {
        return null;
    }


    if (
        typeof value === "object" &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    const date = new Date(value);


    if (isNaN(date.getTime())) {
        return null;
    }


    return date;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   CREATE UNIQUE MAINTENANCE ID
   ========================================================= */

function createMaintenanceId(
    startDate,
    endDate,
    message
) {

    return [
        startDate
            ? startDate.getTime()
            : "no-start",

        endDate
            ? endDate.getTime()
            : "no-end",

        message || ""
    ].join("|");

}


/* =========================================================
   CHECK WHETHER POPUP WAS ALREADY DISMISSED
   ========================================================= */

function wasPopupDismissed(
    maintenanceId
) {

    return false;

}


/* =========================================================
   SAVE DISMISSED MAINTENANCE
   ========================================================= */

function savePopupDismissed(
    maintenanceId
) {

    // Do not remember the popup.
    // It should appear again after every refresh.

}

/* =========================================================
   ADD PREMIUM CSS
   ========================================================= */

function addMaintenanceStyles() {

    if (
        document.getElementById(
            "eventSphereMaintenanceStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "eventSphereMaintenanceStyles";


    style.textContent = `

        /* ===============================================
           POPUP OVERLAY
           =============================================== */

        .es-maintenance-overlay {

            position: fixed;

            inset: 0;

            z-index: 999999;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 24px;

            background:
                rgba(8, 18, 45, 0.58);

            backdrop-filter:
                blur(12px);

            -webkit-backdrop-filter:
                blur(12px);

            animation:
                esFadeIn 0.35s ease;

        }


        /* ===============================================
           POPUP
           =============================================== */

        .es-maintenance-popup {

            position: relative;

            width: 100%;

            max-width: 520px;

            padding:
                34px 34px 30px;

            border:
                1px solid
                rgba(255,255,255,0.7);

            border-radius: 28px;

            background:
                rgba(255,255,255,0.98);

            box-shadow:
                0 30px 80px
                rgba(5,18,50,0.30);

            text-align: center;

            animation:
                esPopupIn 0.45s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                );

        }


        /* ===============================================
           CLOSE BUTTON
           =============================================== */

        .es-maintenance-close {

            position: absolute;

            top: 18px;

            right: 18px;

            width: 38px;

            height: 38px;

            display: flex;

            align-items: center;

            justify-content: center;

            border: none;

            border-radius: 50%;

            background:
                #f1f5f9;

            color:
                #64748b;

            font-size: 20px;

            cursor: pointer;

            transition:
                transform 0.2s ease,
                background 0.2s ease,
                color 0.2s ease;

        }


        .es-maintenance-close:hover {

            background:
                #e2e8f0;

            color:
                #0f172a;

            transform:
                rotate(90deg);

        }


        /* ===============================================
           ICON
           =============================================== */

        .es-maintenance-icon {

            width: 72px;

            height: 72px;

            margin:
                0 auto 20px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 22px;

            background:
                linear-gradient(
                    135deg,
                    #eef4ff,
                    #e4eaff
                );

            color:
                #3264df;

        }


        .es-maintenance-icon svg {

            width: 34px;

            height: 34px;

        }


        /* ===============================================
           LABEL
           =============================================== */

        .es-maintenance-label {

            margin-bottom: 10px;

            color:
                #3264df;

            font-size: 12px;

            font-weight: 800;

            letter-spacing: 2px;

            text-transform: uppercase;

        }


        /* ===============================================
           TITLE
           =============================================== */

        .es-maintenance-title {

            margin: 0;

            color:
                #172033;

            font-size: 30px;

            font-weight: 800;

            line-height: 1.15;

        }


        /* ===============================================
           MESSAGE
           =============================================== */

        .es-maintenance-message {

            max-width: 430px;

            margin:
                14px auto 26px;

            color:
                #64748b;

            font-size: 15px;

            line-height: 1.7;

        }


        /* ===============================================
           DATE CARDS
           =============================================== */

        .es-maintenance-dates {

            display: grid;

            grid-template-columns:
                repeat(2, 1fr);

            gap: 12px;

            margin-bottom: 24px;

        }


        .es-maintenance-date {

            padding: 16px;

            border:
                1px solid #e7edf6;

            border-radius: 16px;

            background:
                linear-gradient(
                    145deg,
                    #f8fafc,
                    #f3f6fb
                );

            text-align: left;

        }


        .es-maintenance-date-label {

            margin-bottom: 7px;

            color:
                #94a3b8;

            font-size: 10px;

            font-weight: 800;

            letter-spacing: 1px;

            text-transform: uppercase;

        }


        .es-maintenance-date-value {

            color:
                #1e293b;

            font-size: 13px;

            font-weight: 700;

            line-height: 1.4;

        }


        /* ===============================================
           BUTTON
           =============================================== */

        .es-maintenance-button {

            width: 100%;

            min-height: 48px;

            border: none;

            border-radius: 14px;

            background:
                linear-gradient(
                    135deg,
                    #3264df,
                    #4c46e8
                );

            color:
                #ffffff;

            font-size: 14px;

            font-weight: 750;

            cursor: pointer;

            box-shadow:
                0 10px 24px
                rgba(50,100,223,0.24);

            transition:
                transform 0.2s ease,
                box-shadow 0.2s ease;

        }


        .es-maintenance-button:hover {

            transform:
                translateY(-2px);

            box-shadow:
                0 14px 30px
                rgba(50,100,223,0.30);

        }


        /* ===============================================
           BRAND
           =============================================== */

        .es-maintenance-brand {

            margin-top: 20px;

            color:
                #94a3b8;

            font-size: 12px;

            font-weight: 700;

        }


        /* ===============================================
           FULL MAINTENANCE PAGE
           =============================================== */

        .es-full-maintenance {

            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

            box-sizing: border-box;

            padding: 30px;

            background:
                radial-gradient(
                    circle at 20% 20%,
                    rgba(65,100,220,0.25),
                    transparent 35%
                ),
                radial-gradient(
                    circle at 80% 80%,
                    rgba(95,75,220,0.20),
                    transparent 35%
                ),
                linear-gradient(
                    135deg,
                    #08142f,
                    #101e46 55%,
                    #111b3b
                );

            color:
                #ffffff;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

        }


        /* ===============================================
           MAINTENANCE CARD
           =============================================== */

        .es-full-maintenance-card {

            width: 100%;

            max-width: 680px;

            padding:
                54px 44px;

            box-sizing: border-box;

            border:
                1px solid
                rgba(255,255,255,0.12);

            border-radius: 30px;

            background:
                rgba(255,255,255,0.075);

            backdrop-filter:
                blur(18px);

            -webkit-backdrop-filter:
                blur(18px);

            box-shadow:
                0 35px 100px
                rgba(0,0,0,0.30);

            text-align: center;

            animation:
                esPopupIn 0.55s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                );

        }


        /* ===============================================
           FULL PAGE ICON
           =============================================== */

        .es-full-icon {

            width: 82px;

            height: 82px;

            margin:
                0 auto 25px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 25px;

            background:
                linear-gradient(
                    135deg,
                    rgba(70,113,235,0.25),
                    rgba(95,77,230,0.22)
                );

            border:
                1px solid
                rgba(255,255,255,0.12);

        }


        .es-full-icon svg {

            width: 40px;

            height: 40px;

        }


        /* ===============================================
           FULL PAGE LABEL
           =============================================== */

        .es-full-label {

            margin-bottom: 10px;

            color:
                #9db8ff;

            font-size: 12px;

            font-weight: 800;

            letter-spacing: 2px;

            text-transform: uppercase;

        }


        /* ===============================================
           FULL PAGE TITLE
           =============================================== */

        .es-full-title {

            margin: 0;

            font-size: 42px;

            font-weight: 800;

            letter-spacing: -1px;

        }


        /* ===============================================
           FULL PAGE MESSAGE
           =============================================== */

        .es-full-message {

            max-width: 520px;

            margin:
                18px auto 30px;

            color:
                rgba(255,255,255,0.72);

            font-size: 15px;

            line-height: 1.8;

        }


        /* ===============================================
           RESUME
           =============================================== */

        .es-resume-label {

            margin-bottom: 9px;

            color:
                rgba(255,255,255,0.48);

            font-size: 10px;

            font-weight: 800;

            letter-spacing: 1.5px;

            text-transform: uppercase;

        }


        .es-resume-time {

            margin-bottom: 28px;

            color:
                #ffffff;

            font-size: 16px;

            font-weight: 700;

        }


        /* ===============================================
           COUNTDOWN
           =============================================== */

        .es-countdown-label {

            margin-bottom: 10px;

            color:
                rgba(255,255,255,0.50);

            font-size: 11px;

            font-weight: 700;

            letter-spacing: 1px;

            text-transform: uppercase;

        }


        .es-countdown {

            margin-bottom: 28px;

            color:
                #ffffff;

            font-size: 34px;

            font-weight: 800;

            letter-spacing: 3px;

        }


        /* ===============================================
           FOOTER
           =============================================== */

        .es-full-footer {

            padding-top: 22px;

            border-top:
                1px solid
                rgba(255,255,255,0.10);

            color:
                rgba(255,255,255,0.40);

            font-size: 12px;

            font-weight: 600;

        }


        /* ===============================================
           ANIMATIONS
           =============================================== */

        @keyframes esFadeIn {

            from {

                opacity: 0;

            }

            to {

                opacity: 1;

            }

        }


        @keyframes esPopupIn {

            from {

                opacity: 0;

                transform:
                    translateY(20px)
                    scale(0.96);

            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);

            }

        }


        /* ===============================================
           MOBILE
           =============================================== */

        @media (max-width: 600px) {

            .es-maintenance-overlay {

                padding: 15px;

            }


            .es-maintenance-popup {

                padding:
                    30px 20px 24px;

                border-radius: 23px;

            }


            .es-maintenance-title {

                font-size: 26px;

            }


            .es-maintenance-dates {

                grid-template-columns: 1fr;

            }


            .es-full-maintenance {

                padding: 16px;

            }


            .es-full-maintenance-card {

                padding:
                    38px 22px;

                border-radius: 24px;

            }


            .es-full-title {

                font-size: 32px;

            }


            .es-countdown {

                font-size: 26px;

                letter-spacing: 2px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   MAINTENANCE ICON
   ========================================================= */

function maintenanceIcon() {

    return `

        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
        >

            <path
                d="M14.7 6.3
                   a5 5 0 0 0-6.4 6.4
                   L3 18
                   a2 2 0 0 0 3 3
                   l5.3-5.3
                   a5 5 0 0 0 6.4-6.4
                   l-3 3
                   -3-3
                   3-3z"
            />

        </svg>

    `;

}


/* =========================================================
   REMOVE POPUP
   ========================================================= */

function removeScheduledPopup() {

    const popup =
        document.getElementById(
            "esMaintenanceOverlay"
        );


    if (popup) {

        popup.remove();

    }

}


/* =========================================================
   SHOW SCHEDULED POPUP
   ========================================================= */

function showScheduledPopup(
    startDate,
    endDate,
    message,
    maintenanceId
) {

    if (scheduledPopupShown) {

        return;

    }


    /*
     * Do not show again if this exact
     * maintenance schedule was already
     * dismissed.
     */

    if (
        wasPopupDismissed(
            maintenanceId
        )
    ) {

        return;

    }


    scheduledPopupShown = true;


    addMaintenanceStyles();


    removeScheduledPopup();


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "esMaintenanceOverlay";


    overlay.className =
        "es-maintenance-overlay";


    overlay.innerHTML = `

        <div
            class="es-maintenance-popup"
        >


            <button
                class="es-maintenance-close"
                id="esMaintenanceClose"
                aria-label="Close"
            >
                ×
            </button>


            <div
                class="es-maintenance-icon"
            >

                ${maintenanceIcon()}

            </div>


            <div
                class="es-maintenance-label"
            >
                Scheduled Maintenance
            </div>


            <h2
                class="es-maintenance-title"
            >
                A quick heads-up
            </h2>


            <p
                class="es-maintenance-message"
            >
                ${escapeHtml(message)}
            </p>


            <div
                class="es-maintenance-dates"
            >


                <div
                    class="es-maintenance-date"
                >

                    <div
                        class="es-maintenance-date-label"
                    >
                        Maintenance Starts
                    </div>


                    <div
                        class="es-maintenance-date-value"
                    >
                        ${formatDateTime(startDate)}
                    </div>

                </div>


                <div
                    class="es-maintenance-date"
                >

                    <div
                        class="es-maintenance-date-label"
                    >
                        Expected Resume
                    </div>


                    <div
                        class="es-maintenance-date-value"
                    >
                        ${formatDateTime(endDate)}
                    </div>

                </div>


            </div>


            <button
                class="es-maintenance-button"
                id="esMaintenanceGotIt"
            >
                Got it
            </button>


            <div
                class="es-maintenance-brand"
            >
                EventSphere
            </div>


        </div>

    `;


    document.body.appendChild(
        overlay
    );


    function dismiss() {

        /*
         * Save THIS maintenance schedule.
         * A different schedule will automatically
         * create a different ID.
         */

        savePopupDismissed(
            maintenanceId
        );


        removeScheduledPopup();

    }


    document
        .getElementById(
            "esMaintenanceClose"
        )
        ?.addEventListener(
            "click",
            dismiss
        );


    document
        .getElementById(
            "esMaintenanceGotIt"
        )
        ?.addEventListener(
            "click",
            dismiss
        );

}


/* =========================================================
   SHOW FULL MAINTENANCE PAGE
   ========================================================= */

function showMaintenancePage(
    endDate,
    message
) {

    if (
        document.body.dataset
            .maintenanceActive === "true"
    ) {

        return;

    }


    document.body.dataset
        .maintenanceActive = "true";


    removeScheduledPopup();


    if (maintenanceTimer) {

        clearInterval(
            maintenanceTimer
        );

        maintenanceTimer = null;

    }


    addMaintenanceStyles();


    const resumeText =
        endDate
            ? formatDateTime(endDate)
            : "As soon as possible";


    document.documentElement.innerHTML = `

        <head>

            <meta
                charset="UTF-8"
            >

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                EventSphere - Maintenance
            </title>

        </head>


        <body>

            <div
                class="es-full-maintenance"
            >

                <div
                    class="es-full-maintenance-card"
                >


                    <div
                        class="es-full-icon"
                    >

                        ${maintenanceIcon()}

                    </div>


                    <div
                        class="es-full-label"
                    >
                        EventSphere Service
                    </div>


                    <h1
                        class="es-full-title"
                    >
                        We'll be back soon.
                    </h1>


                    <p
                        class="es-full-message"
                    >
                        ${escapeHtml(message)}
                    </p>


                    <div
                        class="es-resume-label"
                    >
                        Expected to Resume
                    </div>


                    <div
                        class="es-resume-time"
                    >
                        ${escapeHtml(resumeText)}
                    </div>


                    ${
                        endDate
                            ? `

                                <div
                                    class="es-countdown-label"
                                >
                                    Service resumes in
                                </div>


                                <div
                                    id="esCountdown"
                                    class="es-countdown"
                                >
                                    00:00:00
                                </div>

                              `
                            : ""
                    }


                    <div
                        class="es-full-footer"
                    >
                        Thank you for your patience.
                        <br>
                        EventSphere
                    </div>


                </div>

            </div>

        </body>

    `;


    if (endDate) {

        startCountdown(
            endDate
        );

    }

}


/* =========================================================
   COUNTDOWN
   ========================================================= */

function startCountdown(
    endDate
) {

    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

    }


    function updateCountdown() {

        const now =
            new Date();


        const difference =
            endDate.getTime()
            - now.getTime();


        const countdown =
            document.getElementById(
                "esCountdown"
            );


        if (!countdown) {

            return;

        }


        if (difference <= 0) {

            countdown.textContent =
                "00:00:00";


            clearInterval(
                countdownTimer
            );


            setTimeout(
                () => {

                    window.location.reload();

                },
                1000
            );


            return;

        }


        const totalSeconds =
            Math.floor(
                difference / 1000
            );


        const hours =
            Math.floor(
                totalSeconds / 3600
            );


        const minutes =
            Math.floor(
                (totalSeconds % 3600) / 60
            );


        const seconds =
            totalSeconds % 60;


        countdown.textContent =
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;

    }


    updateCountdown();


    countdownTimer =
        setInterval(
            updateCountdown,
            1000
        );

}


/* =========================================================
   CHECK MAINTENANCE
   ========================================================= */

async function checkMaintenance() {

    try {

        const snapshot =
            await getDoc(
                maintenanceRef
            );


        if (!snapshot.exists()) {

            return;

        }


        const data =
            snapshot.data();


        if (data.enabled !== true) {

            removeScheduledPopup();

            return;

        }


        const message =
            data.message ||
            "EventSphere is currently undergoing scheduled maintenance. Please check back soon.";


        const startDate =
            getDate(
                data.startTime
            );


        const endDate =
            getDate(
                data.endTime
            );


        /*
         * Create a unique ID for this
         * particular maintenance schedule.
         */

        const maintenanceId =
            createMaintenanceId(
                startDate,
                endDate,
                message
            );


        const now =
            new Date();


        /* =============================================
           BEFORE MAINTENANCE
           ============================================= */

        if (
            startDate &&
            now < startDate
        ) {

            showScheduledPopup(
                startDate,
                endDate,
                message,
                maintenanceId
            );


            return;

        }


        /* =============================================
           MAINTENANCE ACTIVE
           ============================================= */

        if (
            !endDate ||
            now < endDate
        ) {

            showMaintenancePage(
                endDate,
                message
            );


            return;

        }


        /* =============================================
           MAINTENANCE FINISHED
           ============================================= */

        removeScheduledPopup();

    }
    catch (error) {

        console.error(
            "Maintenance check failed:",
            error
        );

    }

}


/* =========================================================
   START SYSTEM
   ========================================================= */

async function startMaintenanceSystem() {

    await checkMaintenance();


    maintenanceTimer =
        setInterval(
            async () => {

                await checkMaintenance();

            },
            CHECK_INTERVAL
        );

}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startMaintenanceSystem,
        {
            once: true
        }
    );

}
else {

    startMaintenanceSystem();

}