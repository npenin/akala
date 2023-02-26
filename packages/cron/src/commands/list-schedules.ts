import { State } from "../state.js";

export default function list(this: State)
{
    return this.schedules;
}