const CACHE_NAME = "eventsphere-v1";

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/css/style.css"
];


self.addEventListener("install", (event) => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then((cache) => {

                return cache.addAll(
                    FILES_TO_CACHE
                );

            })

    );

    self.skipWaiting();

});


self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys().then((cacheNames) => {

            return Promise.all(

                cacheNames.map((cacheName) => {

                    if (
                        cacheName !== CACHE_NAME
                    ) {

                        return caches.delete(
                            cacheName
                        );

                    }

                })

            );

        })

    );

    self.clients.claim();

});


self.addEventListener("fetch", (event) => {

    event.respondWith(

        fetch(event.request)
            .catch(() => {

                return caches.match(
                    event.request
                );

            })

    );

});