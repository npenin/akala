// /// <reference types="types-serviceworker" />

/// <reference path="../../serviceworker.d.ts" />

module cache
{
    declare var self: ServiceWorkerGlobalScope;

    self.addEventListener('fetch', function (event)
    {
        event.respondWith(
            caches.open('akala').then(function (cache)
            {
                return cache.match(event.request).then(response =>
                {
                    // Cache hit - return response

                    if (response)
                    {
                        event.request.headers.append('if-modified-since', response.headers.get('last-modified'))
                        event.request.headers.append('if-match', response.headers.get('etag'))

                        fetch(event.request).then(function (res)
                        {
                            if (res.status == 200)
                            {
                                caches.open('akala').then(cache => cache.put(event.request, response.clone()))
                                self.clients.matchAll().then(c => c.postMessage)
                            }

                        })
                        return response;
                    }
                    else
                        return fetch(event.request).then(response =>
                        {
                            return caches.open('akala').then(cache => cache.put(event.request, response.clone())).then(() =>
                            {
                                return response;
                            })
                        });
                })
            })
        );
    });
}
