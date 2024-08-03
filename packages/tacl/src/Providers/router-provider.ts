import { AccessRule, AccessRules } from '../access-rule.js';
import AclManager, { provider } from '../acl-manager.js';
import Allow from '../allow.js';
import { AclConfiguration } from '../Configuration/AclConfiguration.js';
import Deny from '../deny.js';
import { OrderedList } from '../ordered-list.js';
import IAclProvider, { AclChangedHandler, Event } from './IAclProvider.js';

@provider('router')
export default class RouterProvider implements IAclProvider
{
    protected routes: { [key: string]: OrderedList<number, IAclProvider> } = {};

    constructor(configSection?: AclConfiguration, parameters?: { [key: string]: string })
    {
        this.provider_AclChanged = this.provider_AclChanged.bind(this);
        let providerNames: string | null = null;
        if (parameters)
            providerNames = parameters.providers;
        if (providerNames !== null && configSection)
        {
            for (const providerName of providerNames.split(','))
            {
                let realProviderName = providerName;

                let provider: (new (...args: unknown[]) => IAclProvider) | null = null;
                while (provider == null)
                {
                    provider = AclManager.registeredProviders[realProviderName];
                    if (provider == null)
                    {
                        realProviderName = providerName.substring(0, providerName.lastIndexOf('/'));
                        if (realProviderName == AclManager.ROOT)
                            throw new Error(`The provider with name '${providerName}' could not be found. Make sure it is registered in your configuration file`);
                    }
                }
                if (realProviderName == providerName && providerName.indexOf("/") == -1)
                    this.Register("/", new provider());
                else
                    this.Register(providerName.substring(realProviderName.length), new provider());

            }
        }
    }



    public Register(resource: string, provider: IAclProvider, priority = 3): RouterProvider
    {
        resource = resource.toLowerCase();
        if (!this.routes[resource])
            this.routes[resource] = new OrderedList<number, IAclProvider>();
        this.routes[resource].push(priority, provider);
        provider.AclChanged.add(this.provider_AclChanged);
        return this;
    }

    private provider_AclChanged(sender: IAclProvider, obj: string): void
    {
        if (this.AclChanged != null)
        {
            for (const resource of Object.keys(this.routes))
            {
                for (const provider of this.routes[resource])
                {
                    if (provider == sender)
                    {
                        this.AclChanged.raise(this, resource + obj);
                    }
                }
            }
        }
    }

    private GetConcernedProviders(resource: string)
    {
        //Ordered list for priority. Values are the provider and the resource it was registered for
        const concernedProviders = new OrderedList<number, { resource: string, provider: IAclProvider }>();
        resource = resource.toLowerCase();
        while (resource !== '')
        {
            if (this.routes[resource])
            {
                for (const providers of this.routes[resource].entries())
                {
                    for (const provider of providers.value)
                        concernedProviders.push(providers.key, { resource, provider: provider });
                }
            }
            const lastIndexOf = resource.lastIndexOf('/');
            if (lastIndexOf > 0)
                resource = resource.substring(0, lastIndexOf);
            else if (lastIndexOf == 0 && resource.length > 1)
                resource = AclManager.ROOT;
            else
                break;

        }
        return concernedProviders;
    }

    public GetAcls(resource: string, verb: string): OrderedList<string, AccessRule>
    {
        const acls = new OrderedList<string, AccessRule>();
        for (const provider of this.GetConcernedProviders(resource))
        {
            for (const acl of provider.provider.GetAcls(provider.resource == AclManager.ROOT ? resource : resource.substring(provider.resource.length), verb))
            {
                let computedAcl: AccessRule | null = null;
                switch (acl.type)
                {
                    case AccessRules.Allow:
                        computedAcl = new Allow(acl.resource == AclManager.ROOT ? provider.resource : provider.resource + acl.resource, acl.verb, acl.subject);
                        break;
                    case AccessRules.Deny:
                        computedAcl = new Deny(acl.resource == AclManager.ROOT ? provider.resource : provider.resource + acl.resource, acl.verb, acl.subject);
                        break;
                }
                if (computedAcl != null)
                    acls.push(computedAcl.resource, computedAcl);
            }
        }
        return acls;
    }

    public GetAclsBySubject(): Iterable<AccessRule>
    {
        throw new Error('Not Implemented');
    }

    public SetAcls(...acls: AccessRule[]): IAclProvider
    {
        if (acls == null || acls.length == 0)
            return this;

        for (const acl of acls)
        {
            for (const provider of this.GetConcernedProviders(acl.resource))
            {
                switch (acl.type)
                {
                    case AccessRules.Allow:
                        provider.provider.SetAcls(new Allow(provider.resource == AclManager.ROOT ? acl.resource : acl.resource.substring(provider.resource.length), acl.verb, acl.subject));
                        break;
                    case AccessRules.Deny:
                        provider.provider.SetAcls(new Deny(provider.resource == AclManager.ROOT ? acl.resource : acl.resource.substring(provider.resource.length), acl.verb, acl.subject));
                        break;
                }
            }
        }

        return this;
    }

    public DeleteAcls(resource: string, ...subjects: string[]): IAclProvider
    public DeleteAcls(...acls: AccessRule[]): IAclProvider
    public DeleteAcls(...acls: (AccessRule | string)[]): IAclProvider
    public DeleteAcls(...acls: (AccessRule | string)[]): IAclProvider
    {
        if (acls == null || acls.length == 0)
            return this;


        const resource = acls[0];
        if (typeof (resource) === 'string')
        {
            acls.shift();
            for (const provider of this.GetConcernedProviders(resource))
            {
                provider.provider.DeleteAcls(resource.substring(provider.resource.length), ...acls.filter(acl => typeof acl === 'string') as string[]);
            }
        }

        for (const acl of (acls.filter(a => typeof a !== 'string') as AccessRule[]))
            for (const provider of this.GetConcernedProviders(acl.resource))
            {
                switch (acl.type)
                {
                    case AccessRules.Allow:
                        provider.provider.DeleteAcls(new Allow(acl.resource.substring(provider.resource.length), acl.verb, acl.subject));
                        break;
                    case AccessRules.Deny:
                        provider.provider.DeleteAcls(new Deny(acl.resource.substring(provider.resource.length), acl.verb, acl.subject));
                        break;
                }
            }

        return this;
    }

    public readonly AclChanged = new Event<AclChangedHandler>();
}
