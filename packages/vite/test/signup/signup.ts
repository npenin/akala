import { type Scope as IScope, ScopeImpl, Page, page, LocationService, RootElement } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

@page({ template: 'test/signup/signup.html', 'inject': [RootElement, ScopeImpl.injectionToken, '$modules.akala-services.$location'] })
export class Signup extends Page
{
    constructor(el: HTMLElement, scope: Scope, location: LocationService)
    {
        super(el);
        this.teardown(scope.$commandEvents.on('processed.auth.user.add-user', (result: any) =>
        {
            if (result.recordsAffected == 1)
                location.dispatch('/login');

        }));
    }
}
