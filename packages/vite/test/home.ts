import { Scope as IScope, Page, LocationService, ScopeImpl, page } from '@akala/client'
import { Container, Processors } from '@akala/commands';
import { EventEmitter, Event } from '@akala/core';
import { Login } from './login/login.js';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: EventEmitter<Record<string, Event<[unknown]>>> }>;

class HomePage extends Page
{
    constructor(root: Scope, location: LocationService)
    {
        super();
        Login.loadState(root);
        if (!root.$authProcessor.authState)
            location.dispatch('/login');
        else
            root.$setAsync('currentUser', root.container.dispatch('auth.whoami'))
    }

    public test()
    {
        alert('click works')
    }

    public test2()
    {
        alert('click2 works')
    }
}

export const Home =
    page({
        template: 'test/index.html',
        inject: [ScopeImpl.injectionToken, '$modules.akala-services.$location']
    })(HomePage);

export default Home;