// /// <reference types="types-serviceworker" />
/// <reference path="../../serviceworker.d.ts" />

module immediate
{
    declare var self: ServiceWorkerGlobalScope;

    self.addEventListener('install', function (evt)
    {
        evt.waitUntil(self.skipWaiting());
    })

    self.addEventListener('activate', function (evt)
    {
        self.clients.claim();
    })
}
