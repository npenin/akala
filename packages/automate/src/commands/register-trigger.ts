import { Container } from '@akala/pubsub'
import State from '../state'

export default async function registerTrigger(this: State, triggerName: string, trigger: Container)
{
    this.triggers[triggerName] = trigger;
}