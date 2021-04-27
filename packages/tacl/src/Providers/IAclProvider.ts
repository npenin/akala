import { AccessRule } from '../access-rule.js';

export default interface IAclProvider
{
    GetAcls(resource: string, verb: string): Iterable<AccessRule>;
    GetAclsBySubject(...subjects: string[]): Iterable<AccessRule>;
    SetAcls(...acls: AccessRule[]): IAclProvider;
    DeleteAcls(...acls: AccessRule[]): IAclProvider;
    DeleteAcls(resource: string, ...subjects: string[]): IAclProvider;

    AclChanged: Event<AclChangedHandler>;
}
export type AclChangedHandler = (sender: IAclProvider, resource: string) => void;

export class Event<THandler extends (...args: unknown[]) => void>
{
    private handlers: THandler[] = [];

    public add(...handlers: THandler[]): void
    {
        this.handlers.push(...handlers);
    }

    public remove(...handlers: THandler[]): void
    {
        for (const handler of handlers)
        {
            const indexOfHandler = this.handlers.indexOf(handler);
            if (indexOfHandler > -1)
                this.handlers.splice(indexOfHandler, 1);
        }
    }

    public raise(...args: Parameters<THandler>): void
    {
        for (const handler of this.handlers)
        {
            handler(...args);
        }
    }
}