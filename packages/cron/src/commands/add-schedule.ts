import { DateRequest, parseCronSyntax } from "..";
import { Schedule, State } from "../state";

export default function add(this: State, request: DateRequest | string)
{
    if (typeof (request) == 'string')
        this.schedules.push(new Schedule(parseCronSyntax(request)));
    else
        this.schedules.push(new Schedule([request]));
}