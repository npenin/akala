import { AccessRule, AccessRules } from "../access-rule";
import AclManager, { provider } from "../acl-manager";
import { OrderedList } from "../ordered-list";
import IAclProvider, { AclChangedHandler, Event } from "./IAclProvider";

@provider('memory')
export default class MemoryProvider implements IAclProvider
{
    public readonly allowed: OrderedList<string, AccessRule> = new OrderedList<string, AccessRule>();
    public readonly denied: OrderedList<string, AccessRule> = new OrderedList<string, AccessRule>();

    constructor()
    {
    }

    public GetAcls(resource: string, verb: string)
    {
        resource = this.GetAbsoluteResourcePath(verb, resource);

        var acls = new OrderedList<string, AccessRule>();

        while (resource !== '')
        {
            var localAcls: AccessRule[];
            if (localAcls = this.denied.tryGetValue(resource))
            {
                for (var acl of localAcls)
                {
                    acls.push(acl.resource, acl);
                }
            }
            if (localAcls = this.allowed.tryGetValue(resource))
            {
                for (var acl of localAcls)
                {
                    acls.push(acl.resource, acl);
                }
            }
            if (resource == AclManager.ROOT)
                break;

            resource = resource.lastIndexOf(AclManager.ROOT) <= 0 ? AclManager.ROOT : resource.substring(0, resource.lastIndexOf(AclManager.ROOT));

        }
        return acls;
    }

    public GetAclsBySubject(...subjects: string[]): Iterable<AccessRule>
    {
        throw new Error('Not Implemented');
    }

    public SetAcls(...acls: AccessRule[])
    {
        for (var acl of acls)
        {
            switch (acl.type)
            {
                case AccessRules.Allow:
                    this.allowed.push(this.GetAbsoluteResourcePath(acl), acl);
                    break;
                case AccessRules.Deny:
                    this.denied.push(this.GetAbsoluteResourcePath(acl), acl);
                    break;
            }
            this.AclChanged.raise(this, acl.resource);
        }
        return this;
    }

    public DeleteAcls(resource: string, ...subjects: string[]): IAclProvider
    public DeleteAcls(...acls: AccessRule[]): IAclProvider
    public DeleteAcls(...acls: (string | AccessRule)[]): IAclProvider
    {
        if (!acls || acls.length == 0)
            return this;
        for (var acl of acls)
        {
            if (typeof acl === 'string')
                throw new Error('Not Implemented');

            let localAcls: AccessRule[];
            switch (acl.type)
            {
                case AccessRules.Allow:
                    if (localAcls = this.allowed.tryGetValue(this.GetAbsoluteResourcePath(acl)))
                    {
                        var index = localAcls.findIndex(a => a.compare(acl as AccessRule));
                        if (index > -1)
                            localAcls.splice(index, 1);
                    }
                    break;
                case AccessRules.Deny:
                    if (localAcls = this.denied.tryGetValue(this.GetAbsoluteResourcePath(acl)))
                    {
                        var index = localAcls.findIndex(a => a.compare(acl as AccessRule));
                        if (index > -1)
                            localAcls.splice(index, 1);
                    }
                    break;
            }

            this.AclChanged.raise(this, acl.resource);
        }
        return this;
    }

    private GetAbsoluteResourcePath(acl: AccessRule): string
    private GetAbsoluteResourcePath(verb: string, resource: string): string
    private GetAbsoluteResourcePath(verb: string | AccessRule, resource?: string): string
    {
        if (typeof verb != 'string')
        {
            resource = verb.resource;
            verb = verb.verb;
        }
        if (verb == "*")
            return resource || AclManager.ROOT;

        if (resource == "/")
            return verb;

        return verb + resource;
    }

    public AclChanged = new Event<AclChangedHandler>();
}
