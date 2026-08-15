import { db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const customersContainer =
    document.getElementById("customersContainer");

const totalCustomersElement =
    document.getElementById("totalCustomers");

const searchInput =
    document.getElementById("customerSearch");

const showingElement =
    document.getElementById("customerShowing");

const pageNumbers =
    document.getElementById("pageNumbers");

const previousPage =
    document.getElementById("previousPage");

const nextPage =
    document.getElementById("nextPage");


let allCustomers = [];

let filteredCustomers = [];

let currentPage = 1;

const customersPerPage = 4;


// ================= LOAD CUSTOMERS =================

async function loadCustomers() {

    try {

        const snapshot =
            await getDocs(
                collection(db, "users")
            );


        allCustomers = [];


        for (const customerDoc of snapshot.docs) {

            const customer =
                customerDoc.data();


            if (customer.role !== "customer") {
                continue;
            }


            // Get booking count

            let bookingCount = 0;


            try {

                const bookingQuery =
                    query(
                        collection(db, "bookings"),
                        where(
                            "customerId",
                            "==",
                            customerDoc.id
                        )
                    );


                const bookingSnapshot =
                    await getDocs(bookingQuery);


                bookingCount =
                    bookingSnapshot.size;

            }

            catch (bookingError) {

                console.log(
                    "Booking count error:",
                    bookingError
                );

            }


            allCustomers.push({

                id: customerDoc.id,

                name:
                    customer.fullName ||
                    "No Name",

                email:
                    customer.email ||
                    "No Email",

                phone:
                    customer.phone ||
                    "No Phone",

                role:
                    customer.role ||
                    "customer",

                bookingCount:
                    bookingCount,

                createdAt:
                    customer.createdAt || null

            });

        }


        totalCustomersElement.textContent =
            allCustomers.length;


        filteredCustomers =
            [...allCustomers];


        currentPage = 1;

        displayCustomers();

    }

    catch (error) {

        console.error(
            "Error loading customers:",
            error
        );


        customersContainer.innerHTML = `

            <div class="customers-error">

                <h3>
                    Error loading customers
                </h3>

                <p>
                    Please refresh the page and try again.
                </p>

            </div>

        `;

    }

}


// ================= DISPLAY CUSTOMERS =================

function displayCustomers() {

    customersContainer.innerHTML = "";


    if (filteredCustomers.length === 0) {

        customersContainer.innerHTML = `

            <div class="customers-empty">

                👥

                <h2>
                    No Customers Found
                </h2>

                <p>
                    No registered customers match your search.
                </p>

            </div>

        `;


        showingElement.textContent =
            "Showing 0 customers";


        pageNumbers.innerHTML = "";

        return;

    }


    const start =
        (currentPage - 1) *
        customersPerPage;


    const end =
        start +
        customersPerPage;


    const pageCustomers =
        filteredCustomers.slice(
            start,
            end
        );


    pageCustomers.forEach(
        (customer) => {

            const card =
                document.createElement("div");


            card.className =
                "customer-modern-card";


            const joinedDate =
                formatDate(
                    customer.createdAt
                );


            card.innerHTML = `

                <div class="customer-avatar">
                    👤
                </div>


                <div class="customer-information">

                    <div class="customer-name-row">

                        <h2>
                            ${escapeHTML(customer.name)}
                        </h2>

                        <span class="customer-role">
                            Customer
                        </span>

                    </div>


                    <div class="customer-info-row">

                        <span>
                            ✉️
                            ${escapeHTML(customer.email)}
                        </span>


                        <span>
                            📞
                            ${escapeHTML(customer.phone)}
                        </span>


                        <span>
                            📅
                            Joined: ${joinedDate}
                        </span>

                    </div>

                </div>


                <div class="customer-bookings">

                    <div class="customer-booking-icon">
                        📅
                    </div>

                    <div>

                        <strong>
                            ${customer.bookingCount}
                        </strong>

                        <span>
                            Bookings
                        </span>

                    </div>

                </div>


                <button
                    class="customer-delete-btn"
                    onclick="deleteCustomer(
                        '${customer.id}',
                        '${escapeAttribute(customer.email)}'
                    )">

                    🗑 Delete

                </button>

            `;


            customersContainer.appendChild(card);

        }
    );


    const totalPages =
        Math.ceil(
            filteredCustomers.length /
            customersPerPage
        );


    showingElement.textContent =

        `Showing ${start + 1} to ${
            Math.min(
                end,
                filteredCustomers.length
            )
        } of ${
            filteredCustomers.length
        } customers`;


    createPagination(totalPages);

}


// ================= PAGINATION =================

function createPagination(totalPages) {

    pageNumbers.innerHTML = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const button =
            document.createElement("button");


        button.textContent =
            page;


        if (page === currentPage) {

            button.className =
                "page-active";

        }


        button.onclick = function () {

            currentPage =
                page;

            displayCustomers();

        };


        pageNumbers.appendChild(button);

    }


    previousPage.disabled =
        currentPage === 1;


    nextPage.disabled =
        currentPage === totalPages;

}


// ================= PREVIOUS =================

previousPage.onclick =
    function () {

        if (currentPage > 1) {

            currentPage--;

            displayCustomers();

        }

    };


// ================= NEXT =================

nextPage.onclick =
    function () {

        const totalPages =
            Math.ceil(
                filteredCustomers.length /
                customersPerPage
            );


        if (currentPage < totalPages) {

            currentPage++;

            displayCustomers();

        }

    };


// ================= SEARCH =================

searchInput.addEventListener(
    "input",
    function () {

        const search =
            this.value
                .toLowerCase()
                .trim();


        filteredCustomers =
            allCustomers.filter(
                (customer) => {

                    return (

                        customer.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        customer.email
                            .toLowerCase()
                            .includes(search)

                        ||

                        customer.phone
                            .toLowerCase()
                            .includes(search)

                    );

                }
            );


        currentPage = 1;

        displayCustomers();

    }
);


// ================= DELETE =================

window.deleteCustomer =
    async function (
        customerId,
        customerEmail
    ) {

        const confirmDelete =
            confirm(
                "Are you sure you want to delete this customer?"
            );


        if (!confirmDelete) {
            return;
        }


        try {

            const response =
                await fetch(
                    "https://eventsphere-dndh.onrender.com/delete-customer",
                    {

                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                email:
                                    customerEmail
                            })

                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                alert(
                    data.message ||
                    "Failed to delete customer."
                );

                return;

            }


            await deleteDoc(
                doc(
                    db,
                    "users",
                    customerId
                )
            );


            alert(
                "Customer deleted successfully!"
            );


            loadCustomers();

        }

        catch (error) {

            console.error(
                "Delete Customer Error:",
                error
            );


            alert(
                "Failed to delete customer."
            );

        }

    };


// ================= DATE =================

function formatDate(value) {

    if (!value) {
        return "Recently";
    }


    try {

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value
                .toDate()
                .toLocaleDateString(
                    "en-GB",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );

        }


        const date =
            new Date(value);


        if (!isNaN(date)) {

            return date
                .toLocaleDateString(
                    "en-GB",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );

        }

    }

    catch (error) {

        console.log(error);

    }


    return "Recently";

}


// ================= SECURITY =================

function escapeHTML(value) {

    return String(value)
        .replace(
            /[&<>"']/g,
            function (character) {

                const entities = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return entities[character];

            }
        );

}


function escapeAttribute(value) {

    return String(value)
        .replace(/'/g, "\\'");

}


// ================= LOAD =================

loadCustomers();