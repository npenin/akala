// /// <reference types="types-serviceworker" />
/// <reference path="../../serviceworker.d.ts" />

module cache
{
    declare var self: ServiceWorkerGlobalScope;

    self.addEventListener('fetch', function (event)
    {
        event.respondWith(
            caches.match(event.request)
                .then(function (response)
                {
                    // Cache hit - return response
                    if (response)
                    {
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    });
}
