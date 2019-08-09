// /// <reference types="types-serviceworker" />
/// <reference path="../../serviceworker.d.ts" />

module shell
{
    declare var self: ServiceWorkerGlobalScope;

    self.addEventListener('install', function (evt)
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
}
