import { AccessRule } from "../access-rule";

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

export class Event<THandler extends (...args: any[]) => void>
{
    private handlers: THandler[] = [];

    public add(...handlers: THandler[])
    {
        this.handlers.push(...handlers);
    }

    public remove(...handlers: THandler[])
    {
        for (let handler of handlers)
        {
            let indexOfHandler = this.handlers.indexOf(handler);
            if (indexOfHandler > -1)
                this.handlers.splice(indexOfHandler, 1);
        }
    }

    public raise(...args: Parameters<THandler>)
    {
        for (var handler of this.handlers)
        {
            handler(...args);
        }
    }
}