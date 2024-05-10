import * as common from './common.js'
import * as routing from './router.js'
import { LocationService } from './locationService.js'
import * as core from '@akala/core';
export * from './template.js';
import { OutletService, PartDefinition } from './part.js';
import './part.js';
import * as scope from './scope.js';
import * as controls from './controls/controls.js';
export { Control, BaseControl, control } from './controls/controls.js';

export const loadScript = load;

export type IScope<T extends object> = scope.IScope<T> & T;
export type Http = core.Http;
export { OutletService as Part, PartDefinition };
export const router = routing.router
export { Router } from './router.js'
export { LocationService };
export type Injector = core.Injector;
export const init = core.Module.prototype.activate;

export { controls };

import HotKeyTrigger from './hotkeytrigger.js'
export { HotKeyTrigger }

common.bootstrapModule['router'] = routing.router
common.bootstrapModule['BaseControl'] = controls.BaseControl
common.bootstrapModule['Control'] = controls.Control
common.bootstrapModule['control'] = controls.control
common.bootstrapModule['load'] = loadScript

const mainRouter = routing.router('mainRouter');
mainRouter.useMiddleware(common.serviceModule.register('$preRouter', routing.router('preRouter')));
mainRouter.useMiddleware(common.serviceModule.register('$router', routing.router('router')));
mainRouter.useError(function (error)
{
    console.error(error);
    return Promise.reject(error);
});
common.serviceModule.register('$location', new LocationService());

// export { Promisify, Deferred };
export const run: typeof common.bootstrapModule.ready = common.bootstrapModule.ready.bind(common.bootstrapModule);

common.bootstrapModule.activate([], function ()
{
    common.bootstrapModule.register('$rootScope', new scope.Scope());

});

export function load(...scripts: string[]): Promise<unknown>
{
    const firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
    return core.eachAsync(scripts, function (script, i)
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

    // $location.start({ hashbang: false, dispatch: false })
});

// window.addEventListener('load', function ()
// {
//     common.$$injector.start();
// });