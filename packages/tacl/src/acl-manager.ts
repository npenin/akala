import { AccessRule, AccessRules } from "./access-rule";
import { OrderedList } from "./ordered-list";
import IAclProvider, { AclChangedHandler, Event } from "./Providers/IAclProvider";
import Allow from "./allow";
import Deny from "./deny";
import { AclConfiguration } from "./Configuration/AclConfiguration";

export function provider(name: string)
{
    return function (ctor: new (...args: any[]) => IAclProvider)
    {
        AclManager.registeredProviders[name] = ctor;
    }
}

type Action<T> = (a: T) => void;

export default class AclManager
{
    static readonly registeredProviders: { [key: string]: new (...args: any[]) => IAclProvider } = {};
    readonly providers: { [key: string]: IAclProvider } = {};
    public defaultProvider: IAclProvider;
    AclChanged = new Event<AclChangedHandler>();

    constructor(configuration?: AclConfiguration)
    {
        this.DefaultProvider_AclChanged = this.DefaultProvider_AclChanged.bind(this);
        if (configuration && configuration.providers)
            for (var provider of configuration.providers)
            {
                var securityProvider = new (AclManager.registeredProviders[provider.name])();
                this.providers[provider.name] = securityProvider;
                if (provider.name == configuration.defaultProvider)
                    this.defaultProvider = securityProvider;
            }
        //@ts-ignore 2565
        if (typeof this.defaultProvider == 'undefined')
            this.defaultProvider = this.defaultProvider = new AclManager.registeredProviders.memory();
        if (configuration && configuration.rights)
            for (var ace of configuration.rights)
            {
                var privilege: AccessRule | null = null;
                switch (ace.type)
                {
                    case AccessRules.Allow:
                        privilege = new Allow(ace.resource, ace.verb, ace.subject);
                        break;
                    case AccessRules.Deny:
                        privilege = new Deny(ace.resource, ace.verb, ace.subject);
                        break;
                }

                if (ace.targetProvider)
                    this.providers[ace.targetProvider].SetAcls(privilege);
                else
                    this.defaultProvider.SetAcls(privilege);
            }
    }

    public allow(resource: string, verb: string, ...subjects: string[])
    {
        var acls: AccessRule[] = [];
        resource = resource.toLowerCase();
        verb = verb.toLowerCase();
        for (var subject of subjects)
        {
            acls.push(new Allow(resource, verb, subject.toLowerCase()));
        }
        return this.defaultProvider.SetAcls(...acls);
    }

    public deny(resource: string, verb: string, ...subjects: string[])
    {
        var acls: AccessRule[] = [];
        resource = resource.toLowerCase();
        verb = verb.toLowerCase();
        for (var subject of subjects)
        {
            acls.push(new Deny(resource, verb, subject.toLowerCase()));
        }
        return this.defaultProvider.SetAcls(...acls);
    }

    /// <summary>
    /// 
    /// </summary>
    /// <param name="resource"></param>
    /// <param name="subjects"></param>
    /// <returns><see cref="true"/> if the <paramref name="subjects"/> specified have at least one rule that allow them to do something within the resource hierarchy</returns>
    public canBrowse(resource: string, ...subjects: string[])
    {
        resource = resource.toLowerCase();
        for (let acl of this.defaultProvider.GetAcls(resource, "*"))
            if (acl.type == AccessRules.Allow)
                return true;

        return false;
    }

    public isAllowed(resource: string, verb: string, ...subjects: string[]): boolean
    {
        var acls = new OrderedList<string, AccessRule>();
        //OrderedList<string, Acl> denied = new OrderedList<string, Acl>(new ReverseComparer<string>());
        var subjectList: string[] = [];
        for (var subject of subjects)
            subjectList.push(subject.toLowerCase());
        resource = resource.toLowerCase();
        verb = verb.toLowerCase();
        for (var acl of this.defaultProvider.GetAcls(resource, verb))
            acls.push(acl.resource, acl);

        var isExplicit = false;
        var aclType = AccessRules.Deny;
        var set = false;
        var mostAppropriateResourcePath = resource;

        var isFirst = true;

        for (var acl of acls)
        {
            if (isFirst)
            {
                mostAppropriateResourcePath = acl.resource;
                isFirst = false;
            }

            if (set && mostAppropriateResourcePath != acl.resource)
                return aclType == AccessRules.Allow;

            if (acl.subject == "*")
            {
                set = true;
                aclType = acl.type;
            }
            if (subjectList.indexOf(acl.subject) > -1)
            {
                set = true;
                isExplicit = true;
                aclType = acl.type;
            }

            if (isExplicit)
                return aclType == AccessRules.Allow;
        }

        return aclType == AccessRules.Allow;



        // Search for explicit rule or inherit for parent at each level
        // If two explicit rules are found, Deny has the priority
        //bool isDenied = false;
        //while (resource != string.Empty)
        //{
        //    //foreach (string verb in verbs)
        //    //{
        //    if (denied.ContainsKey(resource))
        //    {
        //        foreach (Acl acl in denied[resource])
        //        {
        //            if (verbList.Contains(acl.verb))
        //                return false;
        //        }

        //        // if global rule, allow only if there is a specific user's rule for the current path
        //        if (denied[resource].Contains(new Deny(resource, "*")))
        //            isDenied = allowed.ContainsKey(resource) && allowed[resource].Contains(verb);
        //    }


        //    if (allowed.ContainsKey(resource) && (allowed[resource].Contains(verb) || (!isDenied && allowed[resource].Contains("*"))))
        //        return true;
        //}

        //if (isDenied)
        //    return false;

        //if (resource == ROOT)
        //    return false;

        //resource = resource.LastIndexOf(ROOT) <= 0 ? ROOT : resource.Substring(0, resource.LastIndexOf(ROOT));


        //return false;
    }

    public static readonly ROOT = "/";

    aclChangedHandlers = new OrderedList<string, Action<string>>();

    public UnregisterForRuleChange(resource: string, handler: Action<string>)
    {
        this.aclChangedHandlers.remove(resource, handler);
        if (this.aclChangedHandlers.length == 0)
            this.defaultProvider.AclChanged.remove(this.DefaultProvider_AclChanged);
    }

    public RegisterForRuleChange(resource: string, handler: Action<string>)
    {
        if (this.aclChangedHandlers.length == 0)
            this.defaultProvider.AclChanged.add(this.DefaultProvider_AclChanged);
        this.aclChangedHandlers.push(resource, handler);
    }

    private DefaultProvider_AclChanged(sender: IAclProvider, resource: string)
    {
        var currentResource = resource;
        var lastIndexOfSlash = resource.length;
        var handlers = [];
        do
        {
            currentResource = currentResource.substring(0, lastIndexOfSlash);
            if (handlers = this.aclChangedHandlers.tryGetValue(currentResource))
            {
                for (var handler of handlers)
                {
                    handler(resource);
                }
            }
            if (lastIndexOfSlash == 0)
                break;
            lastIndexOfSlash = currentResource.lastIndexOf('/');
        }
        while (true);

        if (handlers = this.aclChangedHandlers.tryGetValue("*"))
        {
            for (var handler of handlers)
            {
                handler(resource);
            }
        }
    }
}
