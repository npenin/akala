import { serviceModule, $$injector } from './common'
import { router, Router } from './router'
var exRouter = require('express/lib/router/index.js');
import { LocationService, StartOption } from './locationService'
import { Promisify, Deferred, ObservableArray, Http as IHttp } from 'akala-core';
import { Http } from './http';
import { Interpolate, Template } from './template';
import { Part } from './part';
import { Scope, IScope } from './scope';
import { BaseControl, Control, control } from './controls/controls';


$$injector['router'] = router;
$$injector['BaseControl'] = BaseControl;
$$injector['Control'] = Control;
$$injector['control'] = control;
var mainRouter = router();
mainRouter.use(serviceModule.register('$preRouter', exRouter()));
mainRouter.use(serviceModule.register('$router', exRouter()));
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

$$injector.start(['$location'], function ($location: LocationService)
{
    var started = false;
    $location.on('change', function ()
    {
        if (started)
            mainRouter(location);
    });
    // mainRouter(location);
    $location.start({ hashbang: true })
    started = true;
});

$(function ()
{
    $$injector.start();
});