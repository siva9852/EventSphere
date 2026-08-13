import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const customersContainer =
    document.getElementById("customersContainer");


async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(collection(db, "users"));

        customersContainer.innerHTML = "";

        if (snapshot.empty) {

            customersContainer.innerHTML =
                "<p>No registered customers found.</p>";

            return;

        }


        snapshot.forEach((customerDoc) => {

            const customer = customerDoc.data();

            if (customer.role !== "customer") {
                return;
            }

            const card = document.createElement("div");

            card.className = "card";

            card.innerHTML = `

                <h2>${customer.fullName || "No Name"}</h2>

                <p>
                    <strong>Email:</strong>
                    ${customer.email || "No Email"}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${customer.phone || "No Phone"}
                </p>

                <p>
                    <strong>Role:</strong>
                    ${customer.role}
                </p>

                <hr>

            `;

            customersContainer.appendChild(card);

        });

    }

    catch (error) {

        console.error(error);

        customersContainer.innerHTML =
            "<p>Error loading customers.</p>";

    }

}


loadCustomers();