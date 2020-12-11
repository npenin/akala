import { AccessRule, AccessRules } from "../access-rule";
import AclManager, { provider } from "../acl-manager";
import Allow from "../allow";
import { AclConfiguration } from "../Configuration/AclConfiguration";
import Deny from "../deny";
import { OrderedList } from "../ordered-list";
import IAclProvider, { AclChangedHandler, Event } from "./IAclProvider";

@provider('router')
export default class RouterProvider implements IAclProvider
{
    protected routes: { [key: string]: OrderedList<number, IAclProvider> } = {};

    constructor(configSection?: AclConfiguration, parameters?: { [key: string]: string })
    {
        this.provider_AclChanged = this.provider_AclChanged.bind(this);
        var providerNames: string | null = null;
        if (parameters)
            providerNames = parameters.providers;
        if (providerNames !== null && configSection)
        {
            for (var providerName of providerNames.split(','))
            {
                var realProviderName = providerName;

                var provider: (new (...args: any[]) => IAclProvider) | null = null;
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



    public Register(resource: string, provider: IAclProvider, priority: number = 3): RouterProvider
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
            for (var resource of Object.keys(this.routes))
            {
                for (var provider of this.routes[resource])
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
        var concernedProviders = new OrderedList<number, { resource: string, provider: IAclProvider }>();
        resource = resource.toLowerCase();
        while (resource !== '')
        {
            if (this.routes[resource])
            {
                for (var providers of this.routes[resource].entries())
                {
                    for (var provider of providers.value)
                        concernedProviders.push(providers.key, { resource, provider: provider });
                }
            }
            var lastIndexOf = resource.lastIndexOf('/');
            if (lastIndexOf > 0)
                resource = resource.substring(0, lastIndexOf);
            else if (lastIndexOf == 0 && resource.length > 1)
                resource = AclManager.ROOT;
            else
                break;

        }
        return concernedProviders;
    }

    public GetAcls(resource: string, verb: string)
    {
        var acls = new OrderedList<string, AccessRule>();
        for (var provider of this.GetConcernedProviders(resource))
        {
            for (var acl of provider.provider.GetAcls(provider.resource == AclManager.ROOT ? resource : resource.substring(provider.resource.length), verb))
            {
                var computedAcl: AccessRule | null = null;
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

    public GetAclsBySubject(...subjects: string[]): Iterable<AccessRule>
    {
        throw new Error('Not Implemented');
    }

    public SetAcls(...acls: AccessRule[]): IAclProvider
    {
        if (acls == null || acls.length == 0)
            return this;

        for (var acl of acls)
        {
            for (var provider of this.GetConcernedProviders(acl.resource))
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


        var resource = acls[0];
        if (typeof (resource) === 'string')
        {
            acls.shift();
            for (var provider of this.GetConcernedProviders(resource))
            {
                provider.provider.DeleteAcls(resource.substring(provider.resource.length), ...acls.filter(acl => typeof acl === 'string') as string[]);
            }
        }

        for (var acl of (acls.filter(a => typeof a !== 'string') as AccessRule[]))
            for (var provider of this.GetConcernedProviders(acl.resource))
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
