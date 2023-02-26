import { State } from '../state.js'

export default async function (this: State)
{
    this.jobs = {};
    this.schedules = {};
}