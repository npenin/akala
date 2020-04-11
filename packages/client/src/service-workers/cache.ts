import { router } from "./router";

// /// <reference types="types-serviceworker" />

/// <reference path="../../serviceworker.d.ts" />


module cache
{
    declare var self: ServiceWorkerGlobalScope;

    router.use(function (req, event: FetchEvent, next)
    {
        if (req.method == 'install' || req.method == 'push' || req.method == 'updateFound')
            next();
        else
            event.respondWith(
                caches.open('akala').then(function (cache)
                {
                    return cache.match(req).then(response =>
                    {
                        // Cache hit - return response

                        if (response)
                        {
                            // req.headers.append('if-modified-since', response.headers.get('last-modified'))
                            // req.headers.append('if-match', response.headers.get('etag'))

                            fetch(req).then(function (res)
                            {
                                if (res.status == 200)
                                {
                                    caches.open('akala').then(cache => cache.put(req, res.clone()));
                                    self.clients.get(event.clientId).then(cl => cl.postMessage({ type: 'update' }))
                                }

                            })
                            return response;
                        }
                        else
                            return fetch(req).then(response =>
                            {
                                return caches.open('akala').then(cache => cache.put(req, response.clone())).then(() =>
                                {
                                    return response;
                                })
                            });
                    })
                })
            );
    })
}
