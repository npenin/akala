import { Container } from '@akala/commands'
import getTarget from "..";

export default function wait(
    riseSet?: 'rise' | 'set',
    minutes?: number, hour?: number, day?: number[], date?: number | string, month?: number, lat?: number, lng?: number, tz?: number)
{
    const d = getTarget({ "rise/set": riseSet, minutes, hour, day, date, month, lat, lng, tz });
    return new Promise<void>((resolve) =>
    {
        setTimeout(async () =>
        {
            resolve();
        }, d.valueOf() - new Date().valueOf())
    })
}