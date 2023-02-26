import { DateRequest, parseCronSyntax } from "../index.js";
import { Schedule, State } from "../state.js";

export default function add(this: State, name: string, request?: DateRequest | string)
{
    if (typeof this.schedules[name] !== 'undefined')
        throw new Error(`a schedule with ${name} already exists`)
    if (typeof (request) == 'string')
        this.schedules[name] = (new Schedule(name || request, parseCronSyntax(name || request)));
    else
        this.schedules[name] = (new Schedule(name, [request]));
}