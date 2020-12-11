import { AccessRule, AccessRules } from "./access-rule"

export default class Allow extends AccessRule
{
    constructor(resource: string, verb: string, subject: string)
    {
        super(resource, verb, subject);
    }

    public get type() { return AccessRules.Allow; }
}
