import { AccessRule, AccessRules } from './access-rule.js'

export default class Allow extends AccessRule
{
    constructor(resource: string, verb: string, subject: string)
    {
        super(resource, verb, subject);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public get type() { return AccessRules.Allow; }
}
