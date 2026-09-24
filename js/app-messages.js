// =========================================================
// EVENTSPHERE COMMON MESSAGE POPUP
// =========================================================

(function () {

    // =====================================================
    // CREATE MESSAGE STYLES
    // =====================================================

    const style = document.createElement("style");

    style.textContent = `

        .eventsphere-message-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 999999;
            backdrop-filter: blur(3px);
        }


        .eventsphere-message-box {
            width: 100%;
            max-width: 390px;
            background: #ffffff;
            border-radius: 16px;
            padding: 25px;
            box-sizing: border-box;
            text-align: center;
            box-shadow:
                0 20px 60px rgba(15, 23, 42, 0.20);
            animation: eventSphereMessageIn
                0.18s ease-out;
        }


        .eventsphere-message-icon {
            width: 54px;
            height: 54px;
            margin: 0 auto 15px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 23px;
            font-weight: 700;
        }


        .eventsphere-message-title {
            margin: 0 0 8px;
            color: #17336f;
            font-size: 20px;
            font-weight: 700;
        }


        .eventsphere-message-text {
            margin: 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.6;
        }


        .eventsphere-message-ok {
            margin-top: 21px;
            min-width: 85px;
            height: 39px;
            padding: 0 18px;
            border: none;
            border-radius: 8px;
            background: #2563eb;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }


        .eventsphere-message-ok:hover {
            background: #1d4ed8;
        }


        .eventsphere-message-success
        .eventsphere-message-icon {
            background: #dcfce7;
            color: #16a34a;
        }


        .eventsphere-message-error
        .eventsphere-message-icon {
            background: #fee2e2;
            color: #dc2626;
        }


        .eventsphere-message-warning
        .eventsphere-message-icon {
            background: #fef3c7;
            color: #d97706;
        }


        .eventsphere-message-info
        .eventsphere-message-icon {
            background: #dbeafe;
            color: #2563eb;
        }


        .eventsphere-confirm-buttons {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 21px;
        }


        .eventsphere-confirm-button {
            min-width: 85px;
            height: 39px;
            padding: 0 18px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }


        .eventsphere-confirm-cancel {
            background: #e2e8f0;
            color: #334155;
        }


        .eventsphere-confirm-cancel:hover {
            background: #cbd5e1;
        }


        .eventsphere-confirm-ok {
            background: #2563eb;
            color: #ffffff;
        }


        .eventsphere-confirm-ok:hover {
            background: #1d4ed8;
        }


        @keyframes eventSphereMessageIn {

            from {
                opacity: 0;
                transform: translateY(10px)
                    scale(0.97);
            }

            to {
                opacity: 1;
                transform: translateY(0)
                    scale(1);
            }

        }


        @media (max-width: 500px) {

            .eventsphere-message-box {
                max-width: 340px;
                padding: 22px;
            }

            .eventsphere-message-title {
                font-size: 18px;
            }

            .eventsphere-confirm-buttons {
                gap: 8px;
            }

        }

    `;

    document.head.appendChild(style);


    // =====================================================
    // SHOW EVENTSPHERE MESSAGE
    // =====================================================

    window.showEventSphereMessage =
        function (
            type = "info",
            title = "EventSphere",
            message = ""
        ) {

            // Remove existing message
            const existing =
                document.getElementById(
                    "eventsphereMessageOverlay"
                );

            if (existing) {
                existing.remove();
            }


            // Create overlay
            const overlay =
                document.createElement("div");

            overlay.id =
                "eventsphereMessageOverlay";

            overlay.className =
                "eventsphere-message-overlay";


            // Normalize type
            const messageType =
                [
                    "success",
                    "error",
                    "warning",
                    "info"
                ].includes(type)
                    ? type
                    : "info";


            // Icon
            let icon = "i";

            if (messageType === "success") {
                icon = "✓";
            }

            else if (messageType === "error") {
                icon = "✕";
            }

            else if (messageType === "warning") {
                icon = "!";
            }


            // Create popup
            overlay.innerHTML = `

                <div
                    class="
                        eventsphere-message-box
                        eventsphere-message-${messageType}
                    "
                    role="dialog"
                    aria-modal="true"
                >

                    <div
                        class="eventsphere-message-icon"
                    >
                        ${icon}
                    </div>


                    <h2
                        class="eventsphere-message-title"
                    >
                        ${escapeMessage(title)}
                    </h2>


                    <p
                        class="eventsphere-message-text"
                    >
                        ${escapeMessage(message)}
                    </p>


                    <button
                        type="button"
                        class="eventsphere-message-ok"
                        id="eventsphereMessageOk"
                    >
                        OK
                    </button>

                </div>

            `;


            document.body.appendChild(overlay);


            // =================================================
            // CLOSE MESSAGE
            // =================================================

            const closeMessage = () => {

                overlay.remove();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

            };


            const okButton =
                document.getElementById(
                    "eventsphereMessageOk"
                );


            if (okButton) {

                okButton.addEventListener(
                    "click",
                    closeMessage
                );

                okButton.focus();

            }


            // Click outside
            overlay.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target === overlay
                    ) {
                        closeMessage();
                    }

                }
            );


            // Escape key
            const escapeHandler =
                function (event) {

                    if (
                        event.key === "Escape"
                    ) {

                        closeMessage();

                    }

                };


            document.addEventListener(
                "keydown",
                escapeHandler
            );

        };


    // =====================================================
    // SHOW EVENTSPHERE CONFIRMATION
    // =====================================================

    window.showEventSphereConfirm =
        function (
            title = "Confirm Action",
            message = "",
            onConfirm
        ) {

            // Remove existing confirmation
            const existing =
                document.getElementById(
                    "eventsphereConfirmOverlay"
                );

            if (existing) {
                existing.remove();
            }


            // Create overlay
            const overlay =
                document.createElement("div");

            overlay.id =
                "eventsphereConfirmOverlay";

            overlay.className =
                "eventsphere-message-overlay";


            // Create confirmation popup
            overlay.innerHTML = `

                <div
                    class="
                        eventsphere-message-box
                        eventsphere-message-warning
                    "
                    role="dialog"
                    aria-modal="true"
                >

                    <div
                        class="eventsphere-message-icon"
                    >
                        !
                    </div>


                    <h2
                        class="eventsphere-message-title"
                    >
                        ${escapeMessage(title)}
                    </h2>


                    <p
                        class="eventsphere-message-text"
                    >
                        ${escapeMessage(message)}
                    </p>


                    <div
                        class="eventsphere-confirm-buttons"
                    >

                        <button
                            type="button"
                            class="
                                eventsphere-confirm-button
                                eventsphere-confirm-cancel
                            "
                            id="eventsphereConfirmCancel"
                        >
                            Cancel
                        </button>


                        <button
                            type="button"
                            class="
                                eventsphere-confirm-button
                                eventsphere-confirm-ok
                            "
                            id="eventsphereConfirmOk"
                        >
                            Disable
                        </button>

                    </div>

                </div>

            `;


            document.body.appendChild(overlay);


            // =================================================
            // CLOSE CONFIRMATION
            // =================================================

            const closeConfirm = () => {

                overlay.remove();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

            };


            // Cancel button
            const cancelButton =
                document.getElementById(
                    "eventsphereConfirmCancel"
                );


            if (cancelButton) {

                cancelButton.addEventListener(
                    "click",
                    closeConfirm
                );

            }


            // Confirm button
            const confirmButton =
                document.getElementById(
                    "eventsphereConfirmOk"
                );


            if (confirmButton) {

                confirmButton.addEventListener(
                    "click",
                    () => {

                        closeConfirm();

                        if (
                            typeof onConfirm ===
                            "function"
                        ) {

                            onConfirm();

                        }

                    }
                );

            }


            // Click outside
            overlay.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target === overlay
                    ) {

                        closeConfirm();

                    }

                }
            );


            // Escape key
            const escapeHandler =
                function (event) {

                    if (
                        event.key === "Escape"
                    ) {

                        closeConfirm();

                    }

                };


            document.addEventListener(
                "keydown",
                escapeHandler
            );


            // Focus Cancel initially
            if (cancelButton) {
                cancelButton.focus();
            }

        };


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeMessage(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }

})();