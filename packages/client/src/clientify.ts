import { serviceModule, $$injector } from './common'
import { router, Router, Request } from './router'
import { LocationService, StartOption } from './locationService'
import { Promisify, Deferred, ObservableArray, Http as IHttp, eachAsync } from '@akala/core';
import { Http } from './http';
import { Interpolate, Template } from './template';
import { Part } from './part';
import { Scope, IScope } from './scope';
import { BaseControl, Control, control } from './controls/controls';


$$injector['router'] = router;
$$injector['BaseControl'] = BaseControl;
$$injector['Control'] = Control;
$$injector['control'] = control;
$$injector['load'] = load;
var mainRouter = router();
mainRouter.use(serviceModule.register('$preRouter', router()).router);
mainRouter.use(serviceModule.register('$router', router()).router);
mainRouter.use(function (error)
{
    console.error(error);
});
serviceModule.register('$http', new Http());
serviceModule.register('$location', new LocationService());
serviceModule.register('promisify', Promisify);
serviceModule.register('$defer', Deferred);


export { serviceModule };
export { Router };
export { LocationService, StartOption as LocationServiceStartOption };
export { ObservableArray };
export { IHttp as Http };
export { Template };
export { Part };
export { IScope };
export { BaseControl, Control, control };
// export { Promisify, Deferred };
export var run: (toInject: string[], f: Function) => void = $$injector.run.bind($$injector);

$$injector.init([], function ()
{
    var rootScope = $$injector.register('$rootScope', new Scope());

    $(document).applyTemplate(rootScope);
});

export function load(...scripts: string[])
{
    var defer = new Deferred();
    var firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
    eachAsync(scripts, function (script, i, next)
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
            defer.resolve(null);
        });
    return defer;
}

$$injector.start(['$location'], function ($location: LocationService)
{
    var started = false;
    $location.on('change', function ()
    {
        if (started)
            mainRouter.handle(new Request(location), function (err)
            {
                if (err)
                    console.error(err);
                else
                    console.warn('deadend');
            });
    });

    $location.start({ hashbang: true })
    started = true;
});

$(function ()
{
    $$injector.start();
});

$(document).on('click', '.tabs > ul > li', function ()
{

    $(this).siblings('.active').add($(this).closest('.tabs').find('.tab')).removeClass('active');
    $(this).add($(this).closest('.tabs').find($(this).find('a').attr('href'))).addClass('active');
    return false;
})