import * as common from './common'
import * as routing from './router'
import * as location from './locationService'
import * as core from '@akala/core';
import './template';
import * as part from './part';
import './part';
import * as scope from './scope';
import * as controls from './controls/controls';
import { Template, applyTemplate } from './template';
export { Control, BaseControl, control } from './controls/controls';

export var loadScript = load;

export type IScope<T> = scope.IScope<T>;
export type PartDefinition<T extends scope.IScope<T>> = part.PartDefinition<T>;
export type Http = core.Http;
export type Part = part.Part;
export var router: typeof routing.router
export type LocationService = location.LocationService;
export type Injector = core.Injector;
export var init: typeof core.Module.prototype.activate;

export { controls };

common.$$injector['router'] = routing.router
common.$$injector['BaseControl'] = controls.BaseControl
common.$$injector['Control'] = controls.Control
common.$$injector['control'] = controls.control
common.$$injector['load'] = loadScript

var mainRouter = routing.router('mainRouter');
mainRouter.use(common.serviceModule.register('$preRouter', routing.router('preRouter')).router);
mainRouter.use(common.serviceModule.register('$router', routing.router('router')).router);
mainRouter.use(function (error, _req, _next)
{
    console.error(error);
});
common.serviceModule.register('$location', new location.LocationService());
common.serviceModule.register('promisify', core.Promisify);

// export { Promisify, Deferred };
export var run: typeof common.$$injector.ready = common.$$injector.ready.bind(common.$$injector);

common.$$injector.activate([], function ()
{
    common.$$injector.register('$rootScope', new scope.Scope());

});

export { applyTemplate };

export function load(...scripts: string[])
{
    return new Promise((resolve, reject) =>
    {
        var firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
        core.eachAsync(scripts, function (script, i, next)
        {
            var scriptTag = document.createElement('script'); // create a script tag
            firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag); // append the script to the DOM
            scriptTag.addEventListener('load', function (ev)
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
        mainRouter.handle(new Request(path), function (err)
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