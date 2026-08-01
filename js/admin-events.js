import { db } from "./firebase-config.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const addEventForm = document.getElementById("addEventForm");

if (addEventForm) {

    addEventForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const eventName = document.getElementById("eventName").value;
        const category = document.getElementById("category").value;
        const price = document.getElementById("price").value;
        const image = document.getElementById("image").value;
        const description = document.getElementById("description").value;

        try {

            await addDoc(collection(db, "events"), {
                eventName,
                category,
                price: Number(price),
                image,
                description,
                createdAt: new Date()
            });

            alert("Event Added Successfully!");
            addEventForm.reset();

        } catch (error) {

            console.error(error);
            alert(error.message);

        }

    });

}