import * as akala from '@akala/core'
import { Container } from './container.js';

const triggers: Trigger<unknown[], unknown>[] = akala.module('@akala/commands').register('triggers', [])

export type TriggerArgs<T> = T extends Trigger<infer U, unknown> ? U : never;
export type TriggerReturnType<T> = T extends Trigger<unknown[], infer V> ? V : never;

export class Trigger<U extends unknown[], V>
{
    constructor(public name: string, public register: (container: Container<unknown>, ...args: U) => V)
    {
        Trigger.registerTrigger(this);
    }

    public static registerTrigger<U extends unknown[]>(trigger: Trigger<U, unknown>): void
    {
        triggers.push(trigger);
    }

    public static find<U extends unknown[], V = unknown>(name: string): Trigger<U, V>
    {
        return triggers.find(t => t.name == name) as Trigger<U, V>;
    }
}

