import { Container, Processors } from '@akala/commands'
import { Argument0, Event, EventEmitter, Translator } from '@akala/core';
import { Scope as IScope, LocationService, Template, serviceModule, FormComposer, bootstrapModule, DataContext, DataBind, OutletService, EventComposer, I18nComposer, webComponent, Each, CssClassComposer } from '@akala/client'
import { Dropdown, Mark, Popover, Table, TablePager, Tooltip, TooltipComposer, Typeahead } from './index.js';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

export default async function bootstrap(rootElement: string | Element, init?: { rootScope: Scope, i18n?: { tranlate: Translator } })
{
    bootstrapModule.register('services', serviceModule);


    bootstrapModule.activate(['$rootScope', 'services.$outlet'], async (rootScope: Scope, outlet: OutletService) =>
    {
        Template.composers.push(new FormComposer(rootScope.container))
        Template.composers.push(new DataContext());
        Template.composers.push(new DataBind());
        Template.composers.push(new EventComposer());
        Template.composers.push(new CssClassComposer());
        Template.composers.push(new I18nComposer());
        Template.composers.push(new TooltipComposer());
        webComponent('kl-popover')(Popover);
        webComponent('kl-each')(Each);
        webComponent('ul-each', { extends: 'ul' })(Each);
        webComponent('kl-typeahead', { extends: 'input' })(Typeahead);
        webComponent('kl-tooltip')(Tooltip);
        webComponent('kl-dropdown')(Dropdown);
        webComponent('kl-mark')(Mark);
        webComponent('kl-table')(Table);
        webComponent('kl-table-pager')(TablePager);

        serviceModule.register('templateOptions', {
            $rootScope: rootScope, i18n: {
                translate: (obj: Argument0<Translator>) =>
                {
                    let fallback: string;
                    let key: string;
                    if (typeof obj !== 'string')
                    {
                        fallback = obj.fallback;
                        key = obj.key;
                    }
                    else
                        key = fallback = obj;

                    console.log(fallback);
                    return '@@' + key;
                }
            }
            , ...init
        })
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

            Template.composeAll([typeof rootElement == 'string' ? document.querySelector(rootElement) : rootElement], document.body, { $rootScope: rootScope });
            location.start({ dispatch: true, hashbang: false })
        })
    });

    await bootstrapModule.start();
}