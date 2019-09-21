import * as akala from '@akala/core'
import { Container } from './container';
import { Command } from './command';

var triggers: Trigger[] = akala.module('@akala/commands').register('triggers', [])
export class Trigger
{
    constructor(public name: string, public register: <T>(container: Container<T>, command: Command<T>, media?: any) => void)
    {
        Trigger.registerTrigger(this);
    }

    public static registerTrigger(trigger: Trigger)
    {
        triggers.push(trigger);
    }

    public static find(name: string)
    {
        return triggers.find(t => t.name == name);
    }
}

