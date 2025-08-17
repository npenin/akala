import { type Scope as IScope, Page, LocationService, ScopeImpl, page, RootElement } from '@akala/client'
import { Container, Metadata, Processors } from '@akala/commands';
import { ObservableObject, Parser } from '@akala/core';
import { Login } from './login/login.js';

type Scope = IScope<{ $authProcessor: Processors.AuthPreProcessor, container: Container<void>, $commandEvents: Processors.EventProcessor }>;

class HomePage extends Page
{
    constructor(element: HTMLElement, root: Scope, location: LocationService)
    {
        super(element);
        Login.loadState(root);
        if (!root.$authProcessor.authState)
            location.dispatch('/login');
        else
            root.$setAsync('currentUser', root.container.dispatch('auth.whoami').catch(e => { if (e.status == 401) Login.clearState(root); location.dispatch('/login') }))
        this.commands = root.container.dispatch('$metadata', true).then(c => c.commands);
    }

    public readonly commands: Promise<Metadata.Command[]>;

    public coco: boolean = true;

    public toggleCoco()
    {
        ObservableObject.setValue(this, Parser.parameterLess.parse('coco'), !this.coco);
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
        inject: [RootElement, ScopeImpl.injectionToken, '$modules.akala-services.$location']
    })(HomePage);

export default Home;
