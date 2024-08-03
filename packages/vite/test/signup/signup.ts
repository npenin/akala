import { Scope as IScope, ScopeImpl, Page, page, LocationService } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({ template: 'test/signup/signup.html', 'inject': [ScopeImpl.injectionToken, '$modules.akala-services.$location'] })
export class Signup extends Page
{
    constructor(scope: Scope, location: LocationService)
    {
        super();
        this.teardown(scope.$commandEvents.on('auth.user.add-user', (result: any) =>
        {
            if (result.recordsAffected == 1)
                location.dispatch('/login');

        }));
    }
}