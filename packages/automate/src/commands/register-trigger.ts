import { container } from '@akala/pubsub'
import State from '../state'

export default async function registerTrigger(this: State, triggerName: string, trigger: container)
{
    this.triggers[triggerName] = trigger;
}