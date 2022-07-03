import { DateRequest, parseCronSyntax } from "..";
import { Schedule } from '../state';

export default function wait(date: DateRequest | string)
{
    if (typeof date === 'string')
        return Schedule.wait(parseCronSyntax(date)).promise;
    else
        return Schedule.wait([date]).promise;
}