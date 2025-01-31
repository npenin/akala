/// <reference types="vite/client" />
import './index.css'
import { Container } from '@akala/commands'
import { Event, EventEmitter, isPromiseLike } from '@akala/core';
import { Scope as IScope, LocationService, Template, serviceModule, templateCache, templateFunction, FormComposer, bootstrapModule, DataContext, DataBind, OutletService, outletDefinition, EventComposer, I18nComposer, webComponent, Each } from '@akala/client'
import { Processors } from '@akala/commands';
import { Signup } from './signup/signup.js';
import { Login } from './login/login.js';
import Home from './home.js';
import { Popover } from '@akala/web-ui';
import { DesignKit } from './design-kit/index.js';
// import weather from './weather.js';



bootstrapModule.register('services', serviceModule);

import.meta.hot?.on('template-reload', (data) =>
{
    const f = templateCache.resolve<Promise<templateFunction> | templateFunction>(data.path);
    if (f)
        if (isPromiseLike(f))
            f.then(template => template.hotReplace(data.content));
        else
            f.hotReplace(data.content);
});

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

bootstrapModule.activate(['$rootScope', 'services.$outlet'], async (rootScope: Scope, outlet: OutletService) =>
{
    Template.composers.push(new FormComposer(rootScope.container))
    Template.composers.push(new DataContext());
    Template.composers.push(new DataBind());
    Template.composers.push(new EventComposer());
    Template.composers.push(new I18nComposer());
    webComponent('kl-popover')(Popover);
    webComponent('kl-each')(Each);
    webComponent('ul-each', { extends: 'ul' })(Each);

    serviceModule.register('templateOptions', {
        $rootScope: rootScope, i18n: {
            translate: (key: string, currentValue: string) =>
            {
                console.log(currentValue);
                return '@@' + key;
            }
        }
    })



    outlet.use('/signup', 'main', Signup[outletDefinition]);
    outlet.use('/design-kit', 'main', DesignKit[outletDefinition]);
    outlet.use('/login', 'main', Login[outletDefinition]);
    outlet.use('/', 'main', Home);
})

bootstrapModule.ready(['services.$location', '$rootScope'], async function (location: LocationService, rootScope: IScope<any>)
{
    this.whenDone.then(async () =>
    {

        // const auth = new Processors.AuthPreProcessor(Processors.HttpClient.fromUrl('https://api.weatherapi.com/v1/'));
        // const weatherContainer = weather.connect(auth);
        // auth.authState = 'xxxx';
        // const result = (await weatherContainer.dispatch('realtime-weather', 'Mulhouse', 'fr')).current.condition.icon;
        // rootScope['icon'] = result;

        Template.composeAll([document.getElementById('app')], document.body, { $rootScope: rootScope });
        location.start({ dispatch: true, hashbang: false })
    })
});

await bootstrapModule.start();