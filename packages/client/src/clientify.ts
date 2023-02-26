import * as common from './common.js'
import * as routing from './router.js'
import * as location from './locationService.js'
import * as core from '@akala/core';
export * from './template.js';
import * as part from './part.js';
import './part';
import * as scope from './scope.js';
import * as controls from './controls/controls.js';
export { Control, BaseControl, control } from './controls/controls.js';

export const loadScript = load;

export type IScope<T> = scope.IScope<T>;
export type PartDefinition<T extends scope.IScope<T>> = part.PartDefinition<T>;
export type Http = core.Http;
export type Part = part.Part;
export const router = routing.router
export type LocationService = location.LocationService;
export type Injector = core.Injector;
export const init = core.Module.prototype.activate;

export { controls };

import HotKeyTrigger from './hotkeytrigger.js'
export { HotKeyTrigger }

common.$$injector['router'] = routing.router
common.$$injector['BaseControl'] = controls.BaseControl
common.$$injector['Control'] = controls.Control
common.$$injector['control'] = controls.control
common.$$injector['load'] = loadScript

const mainRouter = routing.router('mainRouter');
mainRouter.useMiddleware(common.serviceModule.register('$preRouter', routing.router('preRouter')));
mainRouter.useMiddleware(common.serviceModule.register('$router', routing.router('router')));
mainRouter.useError(function (error)
{
    console.error(error);
    return Promise.reject(error);
});
common.serviceModule.register('$location', new location.LocationService());
common.serviceModule.register('promisify', core.Promisify);

// export { Promisify, Deferred };
export const run: typeof common.$$injector.ready = common.$$injector.ready.bind(common.$$injector);

common.$$injector.activate([], function ()
{
    common.$$injector.register('$rootScope', new scope.Scope());

});

export function load(...scripts: string[]): Promise<unknown>
{
    return new Promise((resolve) =>
    {
        const firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
        core.eachAsync(scripts, function (script, i, next)
        {
            const scriptTag = document.createElement('script'); // create a script tag
            firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag); // append the script to the DOM
            scriptTag.addEventListener('load', function ()
            {
                next()
            });
            scriptTag.src = script; // set the source of the script to your script
        }, function ()
        {
            resolve(null);
        });
    });
}

common.serviceModule.ready(['$location'], function ($location: location.LocationService)
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

    // $location.start({ hashbang: false, dispatch: false })
});

// window.addEventListener('load', function ()
// {
//     common.$$injector.start();
// });