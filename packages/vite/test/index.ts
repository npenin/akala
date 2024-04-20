/// <reference types="vite/client" />
import './index.scss'
import { CommandProcessor, Container, ICommandProcessor, Metadata, StructuredParameters, registerCommands } from '@akala/commands'
import { Deferred, Event, EventEmitter, Injectable, InjectableAsync, InjectableConstructor, Injected, InjectedParameter, Injector, MiddlewarePromise, MiddlewareResult, SpecialNextParam, isPromiseLike, module } from '@akala/core';
import { IScope, LocationService, Template, serviceModule, Router, composer, Composer, IControlInstance, templateCache, templateFunction, LocalAfterRemoteProcessor, FormComposer, bootstrapModule } from '@akala/client'
import { Processors } from '@akala/commands';
import { SocketAdapter, SocketAdapterEventMap } from '@akala/json-rpc-ws';

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


bootstrapModule.activate(['services.$router', 'services.$template', '$rootScope', 'services.$location'], async (router: Router, template: Template, root: IScope<{ $commandEvents: EventEmitter<Record<string, [any, StructuredParameters<unknown[]>, Metadata.Command]>> }>, location: LocationService) =>
{
    Template.composers.push(new FormComposer())

    router.use('/', async (req) =>
    {
        if (!root['currentUser'])
            location.dispatch('/login');
        else
            document.getElementById('app').replaceChildren();
        const templateFunction = await template.get('test/index.html');
        // import.meta.hot.accept('/test/index.html', m => templateFunction.hotReplace(m.text))
        templateFunction(root, document.getElementById('app'));
    })

    const commandEvents = root.$commandEvents;
    router.use('/signup', async (req) =>
    {
        document.getElementById('app').replaceChildren();
        (await template.get('test/signup/signup.html'))(root, document.getElementById('app'));
        commandEvents.once('auth.user.add-user', (result) =>
        {
            if (result.recordsAffected == 1)
                location.dispatch('/login');
        })
    })

    router.use('/login', async (req) =>
    {
        document.getElementById('app').replaceChildren();
        (await template.get('test/login/login.html'))(root, document.getElementById('app'));
        commandEvents.once('auth.login', (result) =>
        {
            root.$set('currentUser', result);
            location.dispatch('/');
        })
    })
})

bootstrapModule.ready(['services.$location', 'akala.$rootScope'], async function (location: LocationService, rootScope: IScope<any>)
{
    this.whenDone.then(async () =>
    {
        await Template.composeAll([document.body], rootScope);
        location.start({ dispatch: true, hashbang: false })
    })
});

await bootstrapModule.start();