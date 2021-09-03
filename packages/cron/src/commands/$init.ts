import { sidecar } from '@akala/pm'
import PubSubContainer from '@akala/pubsub'
import { State } from '../state'

export default async function (this: State)
{
    this.jobs = [];
    this.schedules = [];
}