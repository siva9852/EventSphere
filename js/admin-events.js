import { db } from "./firebase-config.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


const eventForm =
    document.getElementById("eventForm");


if (eventForm) {

    eventForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const eventName =
                document.getElementById(
                    "eventName"
                ).value.trim();


            const category =
                document.getElementById(
                    "category"
                ).value.trim();


            const price =
                document.getElementById(
                    "price"
                ).value;


            const imageUrl =
                document.getElementById(
                    "imageUrl"
                ).value.trim();


            const description =
                document.getElementById(
                    "description"
                ).value.trim();


            // ================= VALIDATION =================

            if (
                !eventName ||
                !category ||
                !price ||
                !imageUrl ||
                !description
            ) {

                alert(
                    "Please fill in all fields."
                );

                return;

            }


            try {

                // ================= ADD EVENT =================

                await addDoc(
                    collection(
                        db,
                        "events"
                    ),
                    {

                        eventName:
                            eventName,

                        category:
                            category,

                        price:
                            Number(price),

                        image:
                            imageUrl,

                        description:
                            description,

                        createdAt:
                            new Date()

                    }
                );


                alert(
                    "Event Added Successfully!"
                );


                // Clear form

                eventForm.reset();

            }


            catch (error) {

                console.error(
                    "Add Event Error:",
                    error
                );


                alert(
                    error.message
                );

            }

        }
    );

}