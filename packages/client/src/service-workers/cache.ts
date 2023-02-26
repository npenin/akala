import { router } from './router.js';

// /// <reference types="types-serviceworker" />

/// <reference path="../../serviceworker.d.ts" />


// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-namespace
namespace cache
{
    declare const self: ServiceWorkerGlobalScope;

    router.use(async function (req: Request, event: FetchEvent)
    {
        event.respondWith(
            caches.open('akala').then(async function (cache)
            {
                const response = await cache.match(req);
                // Cache hit - return response

                if (response)
                {
                    // req.headers.append('if-modified-since', response.headers.get('last-modified'))
                    // req.headers.append('if-match', response.headers.get('etag'))

                    const res = await fetch(req);
                    if (res.status == 200)
                    {
                        cache.put(req, res.clone());
                        if (event.clientId)
                            self.clients.get(event.clientId).then(cl => cl.postMessage({ type: 'update' }))
                    }

                    return response;
                }
                else
                {
                    const response = await fetch(req);
                    await cache.put(req, response.clone())
                    return response;
                }
            }));
    })
}
