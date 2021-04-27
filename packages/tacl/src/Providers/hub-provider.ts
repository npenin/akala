import { AccessRule } from '../access-rule.js';
import { provider } from '../acl-manager.js';
import IAclProvider, { AclChangedHandler, Event } from './IAclProvider.js';

@provider('hub')
export default class HubSecurityProvider implements IAclProvider
{
    constructor()
    {
        this.provider_AclChanged = this.provider_AclChanged.bind(this);
    }

    public readonly providers: IAclProvider[] = [];

    public push(provider: IAclProvider): void
    {
        this.providers.push(provider);
        provider.AclChanged.add(this.provider_AclChanged);
    }

    public remove(provider: IAclProvider): void
    {
        const indexOfProvider = this.providers.indexOf(provider);
        if (indexOfProvider > -1)
            this.providers.splice(indexOfProvider, 1);
        provider.AclChanged.remove(this.provider_AclChanged);
    }

    provider_AclChanged(_sender: IAclProvider, resource: string): void
    {
        this.AclChanged.raise(this, resource);
    }

    public GetAcls(resource: string, verb: string): Iterable<AccessRule> 
    {
        const acls: AccessRule[] = [];
        for (const provider of this.providers)
        {
            acls.push(...provider.GetAcls(resource, verb));
        }
        return acls;
    }

    public GetAclsBySubject(...subjects: string[]): Iterable<AccessRule> 
    {
        const acls: AccessRule[] = [];
        for (const provider of this.providers)
        {
            acls.push(...provider.GetAclsBySubject(...subjects));
        }
        return acls;
    }

    public SetAcls(...acls: AccessRule[]): IAclProvider
    {
        for (const provider of this.providers)
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
        for (const provider of this.providers)
        {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            provider.DeleteAcls(...acls);
        }
        return this;
    }

    public readonly AclChanged: Event<AclChangedHandler> = new Event();
}
