import { IScope, Scope, Page, page, LocationService } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({ template: 'test/login/login.html', 'inject': [Scope.injectionToken, '$modules.akala-services.$location'] })
export class Login extends Page
{
    constructor(scope: Scope, location: LocationService)
    {
        super();
        this.subscribe(scope.$commandEvents.on('auth.login', (result: any) =>
        {
            scope.$set('$authProcessor.authState', result);
            location.dispatch('/');
        }));
    }
}