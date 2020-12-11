import { AccessRule } from "../access-rule";
import { provider } from "../acl-manager";
import IAclProvider, { AclChangedHandler, Event } from "./IAclProvider";

@provider('hub')
export default class HubSecurityProvider implements IAclProvider
{
    constructor()
    {
        this.provider_AclChanged = this.provider_AclChanged.bind(this);
    }

    public readonly providers: IAclProvider[] = [];

    public push(provider: IAclProvider)
    {
        this.providers.push(provider);
        provider.AclChanged.add(this.provider_AclChanged);
    }

    public remove(provider: IAclProvider)
    {
        var indexOfProvider = this.providers.indexOf(provider);
        if (indexOfProvider > -1)
            this.providers.splice(indexOfProvider, 1);
        provider.AclChanged.remove(this.provider_AclChanged);
    }

    provider_AclChanged(_sender: IAclProvider, resource: string)
    {
        this.AclChanged.raise(this, resource);
    }

    public GetAcls(resource: string, verb: string): Iterable<AccessRule> 
    {
        var acls: AccessRule[] = [];
        for (var provider of this.providers)
        {
            acls.push(...provider.GetAcls(resource, verb));
        }
        return acls;
    }

    public GetAclsBySubject(...subjects: string[]): Iterable<AccessRule> 
    {
        var acls: AccessRule[] = [];
        for (var provider of this.providers)
        {
            acls.push(...provider.GetAclsBySubject(...subjects));
        }
        return acls;
    }

    public SetAcls(...acls: AccessRule[]): IAclProvider
    {
        for (var provider of this.providers)
        {
            provider.SetAcls(...acls);
        }
        return this;
    }

    public DeleteAcls(resource: string, ...subjects: string[]): IAclProvider
    public DeleteAcls(...acls: AccessRule[]): IAclProvider
    public DeleteAcls(...acls: (AccessRule | string)[]): IAclProvider
    public DeleteAcls(...acls: (AccessRule | string)[]): IAclProvider
    // public DeleteAcls<T extends AccessRule | string>(...acls: T[]): IAclProvider
    {
        for (var provider of this.providers)
        {
            //@ts-ignore
            provider.DeleteAcls(...acls);
        }
        return this;
    }

    public readonly AclChanged: Event<AclChangedHandler> = new Event();
}
