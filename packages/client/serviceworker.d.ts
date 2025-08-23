/* eslint-disable @typescript-eslint/no-explicit-any */
// ///<reference types="lib.dom.d.ts" />

/**
 * Copyright (c) 2018, Tiernan Cridland
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby
 * granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER
 * IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 *
 * Service Worker Typings to supplement lib.webworker.ts
 * @author Tiernan Cridland
 * @email tiernanc@gmail.com
 * @license: ISC
 *
 * lib.webworker.d.ts as well as an es5+ library (es5, es2015, etc) are required.
 * Recommended to be used with a triple slash directive in the files requiring the typings only.
 * e.g. your-service-worker.js, register-service-worker.js
 * e.g. /// <reference path="path/to/serviceworker.d.ts" />
 */

// Registration

interface WorkerNavigator
{
    readonly serviceWorker: ServiceWorkerContainer;
}

interface ServiceWorkerContainer
{
    readonly controller: ServiceWorker;
    readonly ready: Promise<ServiceWorkerRegistration>;
    onerror?(this: ServiceWorkerContainer, event?: Event): any
    getRegistration(scope?: string): Promise<ServiceWorkerRegistration>;
    getRegistrations(): Promise<ServiceWorkerRegistration[]>;
    register(url: string, options?: ServiceWorkerRegistrationOptions): Promise<ServiceWorkerRegistration>;
}

interface ServiceWorkerMessageEvent extends Event
{
    readonly data: any;
    readonly lastEventId: string;
    readonly origin: string;
    readonly ports: ReadonlyArray<MessagePort> | null;
    readonly source: ServiceWorker | MessagePort | null;
}

interface ServiceWorkerRegistrationOptions
{
    scope?: string;
}

// Client API

interface Client
{
    postMessage(message, transfer?): void
    id: string;
    type: ClientType;
    url: string;

}

type ClientFrameType = "auxiliary" | "top-level" | "nested" | "none";

// Events

interface InstallEvent
{
    readonly activeWorker: ServiceWorker;
}

// Fetch API

interface Body
{
    readonly body: ReadableStream<Uint8Array<ArrayBuffer>>;
}

interface Headers
{
    entries(): string[][];
    keys(): string[];
    values(): string[];
}

interface Response extends Body
{
    readonly useFinalURL: boolean;
    clone(): Response;
    error(): Response;
    redirect(): Response;
}

// Notification API
//eslint-disable-next-line @typescript-eslint/no-empty-interface
interface NotificationAction
{
}

declare type ClientType = 'window' | 'worker' | 'sharedworker';

interface WindowClient extends Client
{
    focus(): PromiseLike<this>;
    navigate(url: string): PromiseLike<this>;
}

interface Clients
{
    get(id: string): PromiseLike<Client>;
    matchAll(options?: { includeUncontrolled?: boolean, type?: ClientType | 'all' }): PromiseLike<Client>
    openWindow(url: string): PromiseLike<WindowClient>
    claim(): Promise<void>
}

// ServiceWorkerGlobalScope

interface ExtendableEvent extends Event
{
    waitUntil(f: Promise<any>): void;
}

interface PushEvent extends ExtendableEvent
{
    data: PushData;
}

interface PushData
{
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    json(): Promise<any>;
    text(): Promise<string>;
}


interface FetchEvent extends ExtendableEvent
{
    readonly clientId: string;
    readonly preloadResponse: Promise<any>;
    readonly request: Request;
    readonly resultingClientId: string;
    readonly targetClientId: string;
    respondWith(r: Promise<Response>): void;
}

declare var FetchEvent: {
    prototype: FetchEvent;
    new(type: string, eventInitDict: FetchEventInit): FetchEvent;
};


type ExtendableEventInit = EventInit

interface FetchEventInit extends ExtendableEventInit
{
    clientId?: string;
    preloadResponse?: Promise<any>;
    request: Request;
    resultingClientId?: string;
    targetClientId?: string;
}


interface ServiceWorkerRegistrationEventMap
{
    'push': PushEvent
    'fetch': FetchEvent
    'install': InstallEvent & ExtendableEvent
}

interface ServiceWorkerGlobalScope extends WindowOrWorkerGlobalScope
{
    clients: Clients;
    registration: ServiceWorkerRegistration;
    addEventListener<K extends keyof ServiceWorkerRegistrationEventMap>(type: K, listener: (this: ServiceWorkerRegistration, ev: ServiceWorkerRegistrationEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof ServiceWorkerRegistrationEventMap>(type: K, listener: (this: ServiceWorkerRegistration, ev: ServiceWorkerRegistrationEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    skipWaiting(): Promise<void>
}

declare function skipWaiting(): void;
