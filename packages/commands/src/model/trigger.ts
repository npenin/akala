import * as akala from '@akala/core'
import { Container } from './container';

const triggers: Trigger<unknown>[] = akala.module('@akala/commands').register('triggers', [])
export class Trigger<U>
{
    constructor(public name: string, public register: <T>(container: Container<T>, media?: U) => unknown)
    {
        Trigger.registerTrigger(this);
    }

    public static registerTrigger<U>(trigger: Trigger<U>): void
    {
        triggers.push(trigger);
    }

    public static find<U>(name: string): Trigger<U>
    {
        return triggers.find(t => t.name == name);
    }
}

