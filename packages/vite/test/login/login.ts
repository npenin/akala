import { Scope as IScope, Page, page, LocationService, ScopeImpl } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({
    template: 'test/login/login.html',
    inject: [ScopeImpl.injectionToken, '$modules.akala-services.$location']
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

    constructor(scope: Scope, location: LocationService)
    {
        super();
        this.teardown(scope.$commandEvents.on('auth.login', (result: any) =>
        {
            if ((document.getElementsByName('remember-me')[0] as HTMLInputElement).checked)
                localStorage.setItem('akala.authState', JSON.stringify(result))
            scope.$set('$authProcessor.authState', result);
            location.dispatch('/');
        }));
    }
}