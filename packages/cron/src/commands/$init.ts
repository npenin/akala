import { State } from '../state'

export default async function (this: State)
{
    this.jobs = {};
    this.schedules = {};
}