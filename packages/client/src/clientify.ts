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
export var init: typeof core.Module.prototype.init;

export { controls };

common.$$injector['router'] = routing.router
common.$$injector['BaseControl'] = controls.BaseControl
common.$$injector['Control'] = controls.Control
common.$$injector['control'] = controls.control
common.$$injector['load'] = loadScript

var mainRouter = routing.router();
mainRouter.use(common.serviceModule.register('$preRouter', routing.router()).router);
mainRouter.use(common.serviceModule.register('$router', routing.router()).router);
mainRouter.use(function (error)
{
    console.error(error);
});
common.serviceModule.register('$location', new location.LocationService());
common.serviceModule.register('promisify', core.Promisify);


// export { Promisify, Deferred };
export var run: (toInject: string[], f: Function) => void = common.$$injector.run.bind(common.$$injector);

common.$$injector.init([], function ()
{
    var rootScope = common.$$injector.register('$rootScope', new scope.Scope());

    applyTemplate([document.body], rootScope);
});

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

common.$$injector.start(['$location'], function ($location: location.LocationService)
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

    $location.start({ hashbang: false })
});

window.addEventListener('load', function ()
{
    common.$$injector.start();
});