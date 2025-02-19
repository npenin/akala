import { Module, Subscription, eachAsync } from '@akala/core';
import * as common from './common.js'
import * as routing from './router.js'
import { LocationService } from './locationService.js'
export * from './template.js';
export * from './outlet.js';
// import './outlet.js';
import { ScopeImpl } from './scope.js';

export const loadScript = load;

export * from './scope.js'

export const router = routing.router
export { Router } from './router.js'
export { LocationService };
export const init = Module.prototype.activate;

import './controlsv2/outlet.js'
export * from './controlsv2/page.js'
export * from './controlsv2/shared.js'
export * from './controlsv2/each.js'
export * from './controlsv2/eachAsTemplate.js'

import HotKeyTrigger from './hotkeytrigger.js'
export { HotKeyTrigger }

const mainRouter = routing.router('mainRouter');
mainRouter.useMiddleware(common.serviceModule.register('$preRouter', routing.router('preRouter')));
mainRouter.useMiddleware(common.serviceModule.register('$router', routing.router('router')));
mainRouter.useError(function (error)
{
    console.error(error);
    return Promise.reject(error);
});
common.serviceModule.register('$location', new LocationService());

export const run: typeof common.bootstrapModule.ready = common.bootstrapModule.ready.bind(common.bootstrapModule);

common.bootstrapModule.activate([], function ()
{
    common.bootstrapModule.register('$rootScope', new ScopeImpl());

});

export function subscribe<T extends Partial<{ [key in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[key]) => void }>>(item: HTMLElement, eventHandlers: T): Record<keyof T, Subscription>
export function subscribe<T extends keyof HTMLElementEventMap>(item: HTMLElement, eventName: T, handler: (ev: HTMLElementEventMap[T]) => void): Subscription
export function subscribe<T extends keyof HTMLElementEventMap>(item: HTMLElement, eventName: T | { [key in T]: (ev: HTMLElementEventMap[key]) => void }, handler?: (ev: HTMLElementEventMap[T]) => void): Subscription | Record<T, Subscription>
{
    if (typeof (eventName) == 'string' && handler)
    {
        item.addEventListener(eventName, handler);
        let removed = false;
        return () => { if (removed) return false; removed = true; item.removeEventListener(eventName, handler) };
    }
    else if (typeof (eventName) == 'object')
    {
        return Object.fromEntries(Object.entries(eventName).map(([eventName, handler]) =>
        {
            return [eventName, subscribe(item, eventName as T, handler as (ev: HTMLElementEventMap[T]) => void) as Subscription]
        })) as Record<T, Subscription>;
    }
}

export function load(...scripts: string[]): Promise<unknown>
{
    const firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
    return eachAsync(scripts, function (script, i)
    {
        const scriptTag = document.createElement('script'); // create a script tag
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag); // append the script to the DOM
        const result = new Promise<void>(resolve => scriptTag.addEventListener('load', function ()
        {
            resolve();
        }));
        scriptTag.src = script; // set the source of the script to your script
        return result;
    })
}

common.serviceModule.ready(['$location'], function ($location: LocationService)
{
    $location.on('change', function (path: string)
    {
        mainRouter.process(new routing.RouterRequest(path)).catch(function (err)
        {
            if (err)
                console.error(err);
            else
                console.warn('deadend');
        });
    });
});