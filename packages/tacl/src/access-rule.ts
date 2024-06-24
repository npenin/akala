export enum AccessRules
{
    Allow,
    Deny
}

export abstract class AccessRule 
{
    constructor(public resource: string, public verb: string, public subject: string)
    {
    }

    public abstract get type(): AccessRules;

    public compare(other: AccessRule): boolean
    {
        return other.type == this.type && other.resource == this.resource && other.subject == this.subject && other.verb == this.verb;
    }
}