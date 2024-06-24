/// <reference types="vite/client" />
import './index.scss'
import { Container, Metadata, StructuredParameters } from '@akala/commands'
import { EventEmitter, isPromiseLike } from '@akala/core';
import { IScope, LocationService, Template, serviceModule, templateCache, templateFunction, FormComposer, bootstrapModule, DataContext, DataBind, OutletService, OutletDefinitionBuilder } from '@akala/client'
import { Processors } from '@akala/commands';

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


bootstrapModule.activate(['$rootScope', 'services.$location', 'services.$outlet'], async (root: IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, [any, StructuredParameters<unknown[]>, Metadata.Command]>> }>, location: LocationService, outlet: OutletService) =>
{
    Template.composers.push(new FormComposer(root.container))
    Template.composers.push(new DataContext(root));
    Template.composers.push(new DataBind(root));

    outlet.use('/', 'main', {
        template: 'test/index.html',
        controller()
        {
            if (!root.$authProcessor.authState)
                location.dispatch('/login');
            else
                root.$setAsync('currentUser', root.container.dispatch('auth.whoami'))
            return {};
        }
    })

    const commandEvents = root.$commandEvents;
    outlet.use('/signup', 'main',
        new OutletDefinitionBuilder(commandEvents).useTemplate('test/signup/signup.html').useCommandResult('auth.user.add-user', (result: any) =>
        {
            if (result.recordsAffected == 1)
                location.dispatch('/login');
        }));

    outlet.use('/login', 'main',
        new OutletDefinitionBuilder(commandEvents).useTemplate('test/login/login.html').useCommandResult('auth.login', (result: any) =>
        {
            root.$set('$authProcessor.authState', result);
            location.dispatch('/');
        }));
})

bootstrapModule.ready(['services.$location', '$rootScope'], async function (location: LocationService, rootScope: IScope<any>)
{
    this.whenDone.then(async () =>
    {
        await Template.composeAll([document.body], rootScope);
        location.start({ dispatch: true, hashbang: false })
    })
});

await bootstrapModule.start();