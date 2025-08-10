import { type Container } from '@akala/pubsub'
import type State from '../state.js'

export default async function registerTrigger(this: State, triggerName: string, trigger: Container)
{
    this.triggers[triggerName] = trigger;
}
