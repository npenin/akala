// /// <reference types="types-serviceworker" />
import "../../serviceworker.d.ts"

declare var self: ServiceWorkerGlobalScope;

self.addEventListener('install', function ()
{
    caches.open('akala').then(cache => cache.add('/'));
})

self.addEventListener('fetch', function (event)
{
    if (event.request.mode == "navigate")
    {
        event.respondWith(caches.open('akala').then(cache => cache.match('/')))
        return;
    }
});
