import { type Scope as IScope, Page, page, LocationService, ScopeImpl, RootElement } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import template from './login.html?raw'

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: Processors.EventProcessor }>;

@page({
    template: template,
    inject: [RootElement, ScopeImpl.injectionToken, '$modules.akala-services.$location']
})
export class Login extends Page
{
    static loadState(scope: Scope)
    {
        const sAuthState = localStorage.getItem('akala.authState');
        if (sAuthState)
            scope.$set('$authProcessor.authState', JSON.parse(sAuthState));
    }

    static clearState(scope: Scope)
    {
        localStorage.removeItem('akala.authState');
        scope.$set('$authProcessor.authState', undefined);
    }

    constructor(el: HTMLElement, scope: Scope, location: LocationService)
    {
        super(el);
        this.teardown(scope.$commandEvents.once('processed.auth.login', (result: any) =>
        {
            if ((document.getElementsByName('remember-me')[0] as HTMLInputElement).checked)
                localStorage.setItem('akala.authState', JSON.stringify(result))
            scope.$set('$authProcessor.authState', result);
            location.dispatch('/');
        }));
    }
}
