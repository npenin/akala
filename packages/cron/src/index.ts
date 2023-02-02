import commands from './container.js';
import suncalc from 'suncalc'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SidecarMap } from '@akala/pm';

export function isDST(day, month, dayOfWeek)
{
    //January, february, and december are out.
    if (month < 3 || month > 11)
        return false;
    //April to October are in
    if (month > 3 && month < 11)
        return true;

    var previousSunday = day - dayOfWeek;
    //In march, we are DST if our previous sunday was on or after the 8th.
    if (month == 3)
        return previousSunday >= 8;
    //In november we must be before the first sunday to be dst.
    //That means the previous sunday must be before the 1st.
    return previousSunday <= 0;
}

export type DateRequest = {
    'rise/set'?: 'rise' | 'set',
    minutes?: number,
    hour?: number,
    day?: number[],
    date?: number | 'last',
    month?: number,
    lat?: number,
    lng?: number,
    tz?: number
};

export default function getTarget(config: DateRequest, target?: Date): Date
{

    var now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    if (typeof (target) == 'undefined')
    {
        target = new Date();
        target.setSeconds(0);
        target.setMilliseconds(0);
    }

    if (typeof (config.minutes) != 'undefined')
    {
        target.setMinutes(config.minutes);
        if (target <= now)
            target.setHours(target.getHours() + 1);
    }
    if (typeof (config.hour) != 'undefined')
    {
        target.setHours(config.hour);
        if (target <= now)
            target.setDate(target.getDate() + 1);
    }
    else if (typeof (config.minutes) != 'undefined' && target <= now)
        target.setHours(target.getHours() + 1);
    if (typeof (config.day) != 'undefined')
    {
        while ((config.day || [0, 1, 2, 3, 4, 5, 6]).filter(function (element) { return element == target.getDay() }).length === 0)
        {
            target.setDate(target.getDate() + 1);
        }
    }
    else if (typeof (config.hour) != 'undefined' && target <= now)
        target.setDate(target.getDate() + 1);
    if (typeof (config.date) != 'undefined')
    {
        if (typeof config.date == 'number' && config.date <= 28)
            target.setDate(config.date);
        else if (config.date == 'last')
        {
            var lastDay = new Date(target.getTime());
            lastDay.setDate(1);
            lastDay.setMonth(lastDay.getMonth() + 1);
            lastDay.setDate(0);
            target.setDate(lastDay.getDate());
        }
        if (target <= now)
        {
            target.setMonth(target.getMonth() + 1);
            target.setDate(1);
            return getTarget(config, target);
        }
    }
    if (typeof (config.month) != 'undefined')
    {
        target.setMonth(config.month);
        if (target <= now)
            target.setFullYear(target.getFullYear() + 1);
    }
    else if (typeof (config.date) != 'undefined' && target <= now)
        target.setMonth(target.getMonth() + 1);

    if (typeof (config['rise/set']) != 'undefined')
    {
        const times = suncalc.getTimes(target, config.lat, config.lng);
        if (config['rise/set'] === 'rise')
            target = times.sunriseEnd;
        else
            target = times.sunset;

        if (target <= now)
        {
            target.setDate(target.getDate() + 1);
            return getTarget(config, target);
        }
    }

    return target;
}

export const cronRegex = /^(\d+(?:-\d+)?|\*(?:\/\d+)?) +(\d+(?:-\d+)?|\*(?:\/\d+)?) +(\d+(?:-\d+)?|\*(?:\/\d+)?) +(\d+(?:-\d+)?|\*(?:\/\d+)?) +(\d+(?:-\d+)?|\*(?:\/\d+)?)$/g
export const cronPartRegex = /(\d+(?:-(\d+))?)|(\*(?:\/(\d+))?)/;


export function parseCronSyntax(cron: string): DateRequest[]
{
    switch (cron)
    {
        case '@hourly':
            return [{ minutes: 0 }]
        case '@daily':
            return [{ minutes: 0, hour: 0 }]
        case '@weekly':
            return [{ minutes: 0, hour: 0, day: [0] }]
        case '@monthly':
            return [{ minutes: 0, hour: 0, date: 1 }];
        case '@yearly':
        case '@annually':
            return [{ minutes: 0, hour: 0, date: 1, month: 1 }];
    }

    const cronRegexResult = cronRegex.exec(cron);
    const minute = cronRegexResult[1],
        hours = cronRegexResult[2],
        dayOfMonth = cronRegexResult[3],
        month = cronRegexResult[4],
        dayOfWeek = cronRegexResult[5];

    const combination = {
        minutes: parseCronPart(minute, 60),
        hour: parseCronPart(hours, 24),
        date: parseCronPart(dayOfMonth, 31),
        month: parseCronPart(month, 12),
        day: parseCronPart(dayOfWeek, 7),
    };

    return combination.minutes.map(minute =>
        combination.hour.map(hour =>
            combination.date.map(date =>
                combination.month.map(month =>
                    ({ minutes: minute, hour, date: date + 1, month, day: combination.day, lat: null, lng: null, tz: null } as DateRequest)
                )
            )
        )
    ).flat(3);
}

export function parseCronPart(value: string, steps: number): number[] 
{
    if (value == null || value === '*')
        return undefined;
    return value.split(',').map(value =>
    {
        const part = cronPartRegex.exec(value);
        if (part[1])
            if (part[2])
            {
                const length = Number(part[2]) - Number(part[1]);
                return new Array(length).fill(0, 0, length).map((v, i) => Number(part[1]) + i);
            }
            else
                return [Number(part[1])];
        else if (part[4])
        {
            const part4 = Number(part[4]);
            return new Array(Math.floor(steps / part4)).fill(0, 0, steps / part4).map((v, i) => i * part4);
        }
        throw new Error('invalid parsing ' + value)
    }).flat(2);
}

type container = commands.container;
export { container };

// declare module '@akala/pm'
// {
//     export interface SidecarMap
//     {
//         '@akala/cron': container
//     }
// }

export function getTargets(requests: DateRequest[], startDate?: Date)
{
    return requests.map(d => ({ request: d, target: getTarget(d, startDate) })).sort((a, b) => a.target.valueOf() - b.target.valueOf())
}

export * from './state.js'