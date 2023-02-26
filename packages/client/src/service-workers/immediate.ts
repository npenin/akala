// /// <reference types="types-serviceworker" />
import "../../serviceworker.d.ts";

declare var self: ServiceWorkerGlobalScope;

self.addEventListener('install', function (evt)
{
    evt.waitUntil(self.skipWaiting());
})

self.addEventListener('activate', function ()
{
    self.clients.claim();
})
