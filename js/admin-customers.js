import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
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

                <button
                    onclick="deleteCustomer(
                        '${customerDoc.id}'
                    )">

                    Delete Customer

                </button>

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


// ================= DELETE CUSTOMER =================

window.deleteCustomer = async function (customerId) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this customer?"
    );


    if (!confirmDelete) {
        return;
    }


    try {

        const response = await fetch(
            `https://eventsphere-dndh.onrender.com/delete-customer/${customerId}`,
            {
                method: "DELETE"
            }
        );


        const data = await response.json();


        if (!data.success) {

            alert(
                data.message ||
                "Failed to delete customer."
            );

            return;

        }


        // Delete customer record from Firestore

        await deleteDoc(
            doc(db, "users", customerId)
        );


        alert("Customer deleted successfully!");


        loadCustomers();

    }

    catch (error) {

        console.error(error);

        alert(
            "Failed to delete customer."
        );

    }

};


loadCustomers();