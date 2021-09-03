import { State } from "../state";

export default function list(this: State)
{
    return this.jobs;
}