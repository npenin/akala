/// <reference types="vite/client" />
import './index.scss'
import { Container } from '@akala/commands'
import { Event, EventEmitter, isPromiseLike } from '@akala/core';
import { Scope as IScope, LocationService, Template, serviceModule, templateCache, templateFunction, FormComposer, bootstrapModule, DataContext, DataBind, OutletService, outletDefinition, EventComposer, I18nComposer } from '@akala/client'
import { Processors } from '@akala/commands';
import { Signup } from './signup/signup.js';
import { Login } from './login/login.js';
import Home from './home.js';

bootstrapModule.register('services', serviceModule);

import.meta.hot.on('template-reload', (data) =>
{
    const f = templateCache.resolve<Promise<templateFunction> | templateFunction>(data.path);
    if (f)
        if (isPromiseLike(f))
            f.then(template => template.hotReplace(data.content));
        else
            f.hotReplace(data.content);
});

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

bootstrapModule.activate(['$rootScope', '$rootScope', 'services.$outlet'], async (root: Scope, rootScope: IScope<any>, outlet: OutletService) =>
{
    Template.composers.push(new FormComposer(root.container))
    Template.composers.push(new DataContext(root));
    Template.composers.push(new DataBind(root));
    Template.composers.push(new EventComposer());
    Template.composers.push(new I18nComposer());
    serviceModule.register('templateOptions', {
        $rootScope: rootScope, i18n: {
            translate: (key: string, currentValue: string) =>
            {
                console.log(currentValue);
                return '@@' + key;
            }
        }
    })


    outlet.use('/', 'main', Home);

    outlet.use('/signup', 'main', Signup[outletDefinition]);
    outlet.use('/login', 'main', Login[outletDefinition]);
})

bootstrapModule.ready(['services.$location', '$rootScope'], async function (location: LocationService, rootScope: IScope<any>)
{
    this.whenDone.then(async () =>
    {
        Template.composeAll([document.getElementById('app')], document.body, { $rootScope: rootScope });
        location.start({ dispatch: true, hashbang: false })
    })
});

await bootstrapModule.start();