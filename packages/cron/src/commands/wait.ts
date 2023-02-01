import { DateRequest, parseCronSyntax } from "../index.js";
import { Schedule } from '../state.js';

export default function wait(date: DateRequest | string)
{
    if (typeof date === 'string')
        return Schedule.wait(parseCronSyntax(date)).promise;
    else
        return Schedule.wait([date]).promise;
}