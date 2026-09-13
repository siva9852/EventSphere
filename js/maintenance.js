/* =========================================================
   EVENTSPHERE
   PREMIUM SERVICE MAINTENANCE PAGE
========================================================= */

import { db } from "./firebase-config.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


/* =========================================================
   FIRESTORE
========================================================= */

const maintenanceRef =
    doc(
        db,
        "settings",
        "maintenance"
    );


/* =========================================================
   CHECK MAINTENANCE STATUS
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


        if (
            data.enabled !== true
        ) {

            return;

        }


        const now =
            new Date();


        let startTime = null;

        let endTime = null;


        /* ================= START TIME ================= */

        if (data.startTime) {

            startTime =
                new Date(
                    data.startTime
                );

        }


        /* ================= END TIME ================= */

        if (data.endTime) {

            endTime =
                new Date(
                    data.endTime
                );

        }


        /* ================= NOT STARTED ================= */

        if (
            startTime &&
            now < startTime
        ) {

            return;

        }


        /* ================= ALREADY ENDED ================= */

        if (
            endTime &&
            now >= endTime
        ) {

            return;

        }


        /* ================= SHOW PAGE ================= */

        showMaintenancePage(
            data,
            startTime,
            endTime
        );

    }

    catch (error) {

        console.error(
            "Unable to check maintenance status:",
            error
        );

    }

}


/* =========================================================
   SHOW PREMIUM MAINTENANCE PAGE
========================================================= */

function showMaintenancePage(
    data,
    startTime,
    endTime
) {


    const message =
        data.message ||
        "EventSphere is temporarily unavailable while we complete scheduled maintenance.";


    document.documentElement.innerHTML = `

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>
                EventSphere - Service Maintenance
            </title>

        </head>


        <body>


            <div class="es-maintenance">


                <!-- =========================================
                     BACKGROUND
                ========================================== -->

                <div class="es-background">

                    <div class="es-orb es-orb-one"></div>

                    <div class="es-orb es-orb-two"></div>

                    <div class="es-orb es-orb-three"></div>

                    <div class="es-noise"></div>

                </div>



                <!-- =========================================
                     MAIN CONTAINER
                ========================================== -->

                <main class="es-container">


                    <!-- =====================================
                         BRAND
                    ====================================== -->

                    <div class="es-brand">

                        <div class="es-logo">
                            ES
                        </div>

                        <span>
                            EventSphere
                        </span>

                    </div>



                    <!-- =====================================
                         MAIN CARD
                    ====================================== -->

                    <section class="es-card">


                        <!-- =================================
                             STATUS
                        ================================== -->

                        <div class="es-status">

                            <span class="es-status-light"></span>

                            <span>
                                SERVICE MAINTENANCE
                            </span>

                        </div>



                        <!-- =================================
                             ICON
                        ================================== -->

                        <div class="es-icon-area">

                            <div class="es-icon-ring">

                                <div class="es-icon">

                                    <svg
                                        viewBox="0 0 64 64"
                                        aria-hidden="true"
                                    >

                                        <path
                                            d="M38.6 10.2a16.8 16.8 0 0 0-8.2 15.1L13.1 42.6a6.1 6.1 0 1 0 8.6 8.6l17.3-17.3a16.8 16.8 0 0 0 15.1-8.2l-8.8 2.2-7.6-7.6 2.2-8.1-1.3-2z"
                                        />

                                        <path
                                            d="m11 53 6-6"
                                        />

                                    </svg>

                                </div>

                            </div>

                        </div>



                        <!-- =================================
                             HEADING
                        ================================== -->

                        <div class="es-heading">

                            <h1>
                                We'll be back soon.
                            </h1>


                            <p class="es-message">
                                ${escapeHtml(message)}
                            </p>


                            <p class="es-subtext">

                                Our team is working behind the scenes
                                to make EventSphere better, faster,
                                and more reliable.

                            </p>

                        </div>



                        <!-- =================================
                             RETURN TIME
                        ================================== -->

                        ${
                            endTime
                            ?

                            `

                            <div class="es-return">

                                <div class="es-return-left">

                                    <div class="es-return-icon">

                                        <svg
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >

                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="9"
                                            ></circle>

                                            <path
                                                d="M12 7v5l3 2"
                                            ></path>

                                        </svg>

                                    </div>


                                    <div>

                                        <span class="es-return-label">
                                            EXPECTED TO RESUME
                                        </span>

                                        <strong id="esResumeTime">
                                            ${formatDate(endTime)}
                                        </strong>

                                    </div>

                                </div>

                            </div>

                            `

                            :

                            ""
                        }



                        <!-- =================================
                             COUNTDOWN
                        ================================== -->

                        ${
                            endTime
                            ?

                            `

                            <div class="es-countdown-wrapper">

                                <div class="es-countdown-title">
                                    Estimated time remaining
                                </div>


                                <div class="es-countdown">

                                    <div class="es-countdown-item">

                                        <strong id="esDays">
                                            00
                                        </strong>

                                        <span>
                                            DAYS
                                        </span>

                                    </div>


                                    <div class="es-divider">
                                        :
                                    </div>


                                    <div class="es-countdown-item">

                                        <strong id="esHours">
                                            00
                                        </strong>

                                        <span>
                                            HOURS
                                        </span>

                                    </div>


                                    <div class="es-divider">
                                        :
                                    </div>


                                    <div class="es-countdown-item">

                                        <strong id="esMinutes">
                                            00
                                        </strong>

                                        <span>
                                            MINUTES
                                        </span>

                                    </div>


                                    <div class="es-divider">
                                        :
                                    </div>


                                    <div class="es-countdown-item">

                                        <strong id="esSeconds">
                                            00
                                        </strong>

                                        <span>
                                            SECONDS
                                        </span>

                                    </div>

                                </div>

                            </div>

                            `

                            :

                            ""
                        }



                        <!-- =================================
                             FOOTER MESSAGE
                        ================================== -->

                        <div class="es-footer">

                            <span>
                                Thank you for your patience.
                            </span>

                            <div class="es-footer-dot"></div>

                            <span>
                                EventSphere Team
                            </span>

                        </div>


                    </section>



                    <!-- =====================================
                         BOTTOM BRAND
                    ====================================== -->

                    <div class="es-bottom">

                        <span class="es-bottom-mark">
                            ES
                        </span>

                        <span>
                            EventSphere
                        </span>

                    </div>


                </main>

            </div>


        </body>

    `;


    addPremiumStyles();


    if (endTime) {

        startCountdown(
            endTime
        );

    }

}


/* =========================================================
   COUNTDOWN
========================================================= */

function startCountdown(
    endTime
) {


    function updateCountdown() {

        const now =
            new Date();


        let difference =
            endTime.getTime() -
            now.getTime();


        if (
            difference <= 0
        ) {

            difference = 0;

        }


        const totalSeconds =
            Math.floor(
                difference / 1000
            );


        const days =
            Math.floor(
                totalSeconds / 86400
            );


        const hours =
            Math.floor(
                (
                    totalSeconds % 86400
                ) / 3600
            );


        const minutes =
            Math.floor(
                (
                    totalSeconds % 3600
                ) / 60
            );


        const seconds =
            totalSeconds % 60;


        setText(
            "esDays",
            pad(days)
        );


        setText(
            "esHours",
            pad(hours)
        );


        setText(
            "esMinutes",
            pad(minutes)
        );


        setText(
            "esSeconds",
            pad(seconds)
        );


        if (
            difference <= 0
        ) {

            clearInterval(
                timer
            );


            setTimeout(
                () => {

                    window.location.reload();

                },
                1200
            );

        }

    }


    updateCountdown();


    const timer =
        setInterval(
            updateCountdown,
            1000
        );

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   PAD NUMBER
========================================================= */

function pad(
    value
) {

    return String(
        value
    ).padStart(
        2,
        "0"
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
    date
) {

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
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   PREMIUM STYLES
========================================================= */

function addPremiumStyles() {

    const style =
        document.createElement(
            "style"
        );


    style.textContent = `

        /* ================================================
           RESET
        ================================================= */

        * {

            box-sizing: border-box;

        }


        html,
        body {

            margin: 0;

            padding: 0;

            width: 100%;

            min-height: 100%;

        }


        body {

            font-family:
                Inter,
                ui-sans-serif,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Arial,
                sans-serif;

        }



        /* ================================================
           MAIN BACKGROUND
        ================================================= */

        .es-maintenance {

            min-height: 100vh;

            width: 100%;

            position: relative;

            display: flex;

            align-items: center;

            justify-content: center;

            overflow: hidden;

            background:
                #07111f;

            color: #ffffff;

        }



        /* ================================================
           BACKGROUND
        ================================================= */

        .es-background {

            position: absolute;

            inset: 0;

            overflow: hidden;

            pointer-events: none;

        }


        .es-background::before {

            content: "";

            position: absolute;

            inset: 0;

            background:
                radial-gradient(
                    circle at 50% 45%,
                    rgba(
                        37,
                        99,
                        235,
                        0.18
                    ),
                    transparent 38%
                );

        }


        .es-background::after {

            content: "";

            position: absolute;

            inset: 0;

            background-image:
                linear-gradient(
                    rgba(
                        255,
                        255,
                        255,
                        0.025
                    ) 1px,
                    transparent 1px
                ),
                linear-gradient(
                    90deg,
                    rgba(
                        255,
                        255,
                        255,
                        0.025
                    ) 1px,
                    transparent 1px
                );

            background-size:
                55px 55px;

            mask-image:
                linear-gradient(
                    to bottom,
                    transparent,
                    black 20%,
                    black 80%,
                    transparent
                );

        }



        /* ================================================
           GLOW ORBS
        ================================================= */

        .es-orb {

            position: absolute;

            border-radius: 50%;

            filter: blur(2px);

            opacity: 0.55;

        }


        .es-orb-one {

            width: 430px;

            height: 430px;

            top: -250px;

            left: -120px;

            background:
                radial-gradient(
                    circle,
                    rgba(
                        37,
                        99,
                        235,
                        0.34
                    ),
                    transparent 68%
                );

            animation:
                esOrbOne 12s ease-in-out infinite;

        }


        .es-orb-two {

            width: 500px;

            height: 500px;

            right: -220px;

            bottom: -280px;

            background:
                radial-gradient(
                    circle,
                    rgba(
                        124,
                        58,
                        237,
                        0.28
                    ),
                    transparent 68%
                );

            animation:
                esOrbTwo 15s ease-in-out infinite;

        }


        .es-orb-three {

            width: 240px;

            height: 240px;

            left: 48%;

            top: -130px;

            background:
                radial-gradient(
                    circle,
                    rgba(
                        14,
                        165,
                        233,
                        0.13
                    ),
                    transparent 70%
                );

        }



        @keyframes esOrbOne {

            0%,
            100% {

                transform:
                    translate(
                        0,
                        0
                    );

            }

            50% {

                transform:
                    translate(
                        40px,
                        35px
                    );

            }

        }


        @keyframes esOrbTwo {

            0%,
            100% {

                transform:
                    translate(
                        0,
                        0
                    );

            }

            50% {

                transform:
                    translate(
                        -35px,
                        -30px
                    );

            }

        }



        /* ================================================
           NOISE
        ================================================= */

        .es-noise {

            position: absolute;

            inset: 0;

            opacity: 0.035;

            background-image:
                url(
                    "data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E"
                );

        }



        /* ================================================
           CONTAINER
        ================================================= */

        .es-container {

            width: min(
                760px,
                calc(100% - 32px)
            );

            position: relative;

            z-index: 5;

            display: flex;

            flex-direction: column;

            align-items: center;

            padding:
                36px 0;

        }



        /* ================================================
           BRAND
        ================================================= */

        .es-brand {

            display: flex;

            align-items: center;

            gap: 11px;

            margin-bottom: 22px;

            font-size: 17px;

            font-weight: 700;

            letter-spacing:
                -0.2px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    0.95
                );

        }


        .es-logo {

            width: 36px;

            height: 36px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 11px;

            background:
                linear-gradient(
                    135deg,
                    #2563eb,
                    #7c3aed
                );

            box-shadow:
                0 8px 24px
                rgba(
                    37,
                    99,
                    235,
                    0.35
                );

            font-size: 11px;

            font-weight: 800;

            letter-spacing:
                0.3px;

        }



        /* ================================================
           CARD
        ================================================= */

        .es-card {

            width: 100%;

            padding:
                52px 58px 38px;

            border-radius: 30px;

            text-align: center;

            background:
                linear-gradient(
                    145deg,
                    rgba(
                        255,
                        255,
                        255,
                        0.98
                    ),
                    rgba(
                        248,
                        250,
                        255,
                        0.96
                    )
                );

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    0.75
                );

            box-shadow:
                0 40px 100px
                rgba(
                    0,
                    0,
                    0,
                    0.34
                );

            color: #111827;

            animation:
                esCardIn
                0.65s
                cubic-bezier(
                    0.22,
                    1,
                    0.36,
                    1
                );

        }



        @keyframes esCardIn {

            from {

                opacity: 0;

                transform:
                    translateY(22px)
                    scale(0.98);

            }

            to {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);

            }

        }



        /* ================================================
           STATUS
        ================================================= */

        .es-status {

            display: inline-flex;

            align-items: center;

            gap: 8px;

            padding:
                7px 12px;

            border-radius: 50px;

            background:
                #f8fafc;

            border:
                1px solid
                #e5e7eb;

            color:
                #64748b;

            font-size: 10px;

            font-weight: 800;

            letter-spacing:
                1.2px;

        }


        .es-status-light {

            width: 7px;

            height: 7px;

            border-radius: 50%;

            background:
                #f59e0b;

            box-shadow:
                0 0 0 4px
                rgba(
                    245,
                    158,
                    11,
                    0.10
                );

            animation:
                esStatusPulse
                1.8s
                ease-in-out
                infinite;

        }


        @keyframes esStatusPulse {

            0%,
            100% {

                opacity: 1;

            }

            50% {

                opacity: 0.35;

            }

        }



        /* ================================================
           ICON
        ================================================= */

        .es-icon-area {

            display: flex;

            justify-content: center;

            margin:
                30px 0 25px;

        }


        .es-icon-ring {

            width: 104px;

            height: 104px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 50%;

            background:
                #eef4ff;

            border:
                1px solid
                #dbe7ff;

            position: relative;

        }


        .es-icon-ring::before {

            content: "";

            position: absolute;

            inset: -9px;

            border-radius: 50%;

            border:
                1px solid
                rgba(
                    96,
                    165,
                    250,
                    0.20
                );

        }


        .es-icon {

            width: 76px;

            height: 76px;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 23px;

            background:
                linear-gradient(
                    145deg,
                    #2563eb,
                    #4f46e5
                );

            box-shadow:
                0 16px 30px
                rgba(
                    37,
                    99,
                    235,
                    0.24
                );

            animation:
                esIconFloat
                3.5s
                ease-in-out
                infinite;

        }


        .es-icon svg {

            width: 39px;

            height: 39px;

            fill: none;

            stroke:
                white;

            stroke-width: 2.7;

            stroke-linecap:
                round;

            stroke-linejoin:
                round;

        }


        @keyframes esIconFloat {

            0%,
            100% {

                transform:
                    translateY(0);

            }

            50% {

                transform:
                    translateY(-4px);

            }

        }



        /* ================================================
           HEADING
        ================================================= */

        .es-heading h1 {

            margin:
                0 0 15px;

            font-size:
                clamp(
                    34px,
                    6vw,
                    52px
                );

            line-height:
                1.05;

            letter-spacing:
                -2px;

            color:
                #0f172a;

        }


        .es-message {

            max-width: 580px;

            margin:
                0 auto 12px;

            color:
                #334155;

            font-size: 17px;

            line-height:
                1.65;

            font-weight: 600;

        }


        .es-subtext {

            max-width: 540px;

            margin:
                0 auto;

            color:
                #94a3b8;

            font-size: 13px;

            line-height:
                1.7;

        }



        /* ================================================
           RETURN TIME
        ================================================= */

        .es-return {

            margin-top: 30px;

            padding:
                16px 18px;

            display: flex;

            align-items: center;

            text-align: left;

            border-radius: 17px;

            background:
                #f8faff;

            border:
                1px solid
                #e4eaff;

        }


        .es-return-left {

            display: flex;

            align-items: center;

            gap: 13px;

            width: 100%;

        }


        .es-return-icon {

            width: 43px;

            height: 43px;

            flex-shrink: 0;

            display: flex;

            align-items: center;

            justify-content: center;

            border-radius: 12px;

            background:
                #eaf2ff;

        }


        .es-return-icon svg {

            width: 21px;

            height: 21px;

            fill: none;

            stroke:
                #2563eb;

            stroke-width: 1.8;

            stroke-linecap:
                round;

            stroke-linejoin:
                round;

        }


        .es-return-label {

            display: block;

            margin-bottom: 4px;

            color:
                #94a3b8;

            font-size: 9px;

            font-weight: 800;

            letter-spacing:
                1px;

        }


        .es-return strong {

            color:
                #1e3a8a;

            font-size: 15px;

            font-weight: 700;

        }



        /* ================================================
           COUNTDOWN
        ================================================= */

        .es-countdown-wrapper {

            margin-top: 29px;

        }


        .es-countdown-title {

            margin-bottom: 13px;

            color:
                #94a3b8;

            font-size: 11px;

            font-weight: 600;

        }


        .es-countdown {

            display: flex;

            align-items: center;

            justify-content: center;

            gap: 7px;

        }


        .es-countdown-item {

            width: 84px;

            padding:
                14px 8px 12px;

            border-radius: 15px;

            background:
                #0f172a;

            box-shadow:
                0 9px 22px
                rgba(
                    15,
                    23,
                    42,
                    0.14
                );

        }


        .es-countdown-item strong {

            display: block;

            color:
                #ffffff;

            font-size: 26px;

            line-height: 1;

            letter-spacing:
                -0.8px;

            font-variant-numeric:
                tabular-nums;

        }


        .es-countdown-item span {

            display: block;

            margin-top: 7px;

            color:
                #64748b;

            font-size: 8px;

            font-weight: 800;

            letter-spacing:
                0.8px;

        }


        .es-divider {

            color:
                #cbd5e1;

            font-size: 18px;

            font-weight: 800;

            margin-top: -12px;

        }



        /* ================================================
           FOOTER
        ================================================= */

        .es-footer {

            margin-top: 30px;

            padding-top: 21px;

            border-top:
                1px solid
                #edf0f5;

            display: flex;

            justify-content: center;

            align-items: center;

            gap: 9px;

            color:
                #94a3b8;

            font-size: 11px;

        }


        .es-footer-dot {

            width: 3px;

            height: 3px;

            border-radius: 50%;

            background:
                #cbd5e1;

        }



        /* ================================================
           BOTTOM BRAND
        ================================================= */

        .es-bottom {

            display: flex;

            align-items: center;

            gap: 7px;

            margin-top: 20px;

            color:
                rgba(
                    255,
                    255,
                    255,
                    0.42
                );

            font-size: 11px;

            font-weight: 600;

        }


        .es-bottom-mark {

            display: inline-flex;

            align-items: center;

            justify-content: center;

            width: 21px;

            height: 21px;

            border-radius: 7px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.08
                );

            font-size: 7px;

            font-weight: 800;

        }



        /* ================================================
           MOBILE
        ================================================= */

        @media (
            max-width: 600px
        ) {

            .es-container {

                width:
                    calc(100% - 24px);

                padding:
                    22px 0;

            }


            .es-card {

                padding:
                    34px 20px 27px;

                border-radius:
                    23px;

            }


            .es-brand {

                margin-bottom:
                    17px;

            }


            .es-icon-area {

                margin:
                    25px 0 22px;

            }


            .es-icon-ring {

                width: 88px;

                height: 88px;

            }


            .es-icon {

                width: 65px;

                height: 65px;

                border-radius: 19px;

            }


            .es-icon svg {

                width: 33px;

                height: 33px;

            }


            .es-heading h1 {

                font-size: 34px;

                letter-spacing:
                    -1.4px;

            }


            .es-message {

                font-size: 15px;

            }


            .es-subtext {

                font-size: 12px;

            }


            .es-return {

                margin-top:
                    24px;

            }


            .es-countdown {

                gap: 4px;

            }


            .es-countdown-item {

                width: 65px;

                padding:
                    12px 5px 10px;

                border-radius:
                    12px;

            }


            .es-countdown-item strong {

                font-size: 20px;

            }


            .es-countdown-item span {

                font-size: 7px;

            }


            .es-divider {

                font-size: 15px;

            }


            .es-footer {

                flex-direction:
                    column;

                gap: 5px;

            }


            .es-footer-dot {

                display: none;

            }

        }



        /* ================================================
           VERY SMALL DEVICES
        ================================================= */

        @media (
            max-width: 380px
        ) {

            .es-card {

                padding:
                    30px 15px 24px;

            }


            .es-heading h1 {

                font-size: 30px;

            }


            .es-countdown-item {

                width: 58px;

            }


            .es-countdown-item strong {

                font-size: 18px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   START
========================================================= */

checkMaintenance();