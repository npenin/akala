import { Container } from '@akala/commands'
import getTarget from "..";
import wait from './wait';

export default function schedule(
    cmdNameToTrigger: string,
    container: Container<void>,
    riseSet?: 'rise' | 'set',
    minutes?: number, hour?: number, day?: number[], date?: number | string, month?: number, lat?: number, lng?: number, tz?: number, recursive?: boolean)
{
    const d = getTarget({ "rise/set": riseSet, minutes, hour, day, date, month, lat, lng, tz });
    wait(riseSet, minutes, hour, day, date, month, lat, lng, tz).then(async () =>
    {
        await container.dispatch(cmdNameToTrigger);
        if (recursive)
            schedule(cmdNameToTrigger, container, riseSet, minutes, hour, day, date, month, lat, lng, tz, recursive);
    });
}