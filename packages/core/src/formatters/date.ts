import { Parser, ParsedString } from '../parser/parser';
import { Formatter, FormatterFactory } from './common';
import { module } from '../helpers';

export interface DateFormatterSettings
{
    format: string;
}

const formats = {
    h: Date.prototype.getUTCHours,
    m: Date.prototype.getUTCMinutes,
    y: Date.prototype.getUTCFullYear,
    M: function (this: Date)
    {
        return this.getUTCMonth() + 1;
    },
    d: Date.prototype.getDate,
    s: Date.prototype.getUTCSeconds
}

export function formatParser(format: string)
{
    return {
        format: function (value: Date)
        {
            let result = '';
            let offset = 0;
            let currentFormat: string;
            for (let i = offset; i < format.length; i++)
            {
                if (i == offset)
                    currentFormat = format[i];

                if (currentFormat == format[i])
                    continue;
                else
                {
                    if (currentFormat in formats)
                    {
                        let tmp = formats[currentFormat].call(value);
                        switch (i - offset)
                        {
                            case 1:
                                if (currentFormat == 'y')
                                    tmp = tmp % 100;
                                result += tmp;
                                break;
                            case 2:
                                if (currentFormat == 'y')
                                    tmp = tmp % 100;
                                if (tmp < 10)
                                    result += '0' + tmp;
                                else
                                    result += tmp;
                                break;
                            case 4:
                                if (currentFormat == 'y')
                                    result += tmp;
                                else
                                    throw new Error(`Unsupported format ${format.substring(0, i)}`);
                                break;
                            case 3:
                            default:
                                throw new Error(`Unsupported format ${format.substring(0, i)}`);
                        }
                    }
                    else
                    {
                        result += format.substr(offset, i);
                    }
                    offset = i + 1;
                }
            }
            return result;
        },
        parse: function (value: string)
        {
            const result = new Date(0, 0, 0, 0, 0, 0, 0);
            let formatOffset = 0;
            let valueOffset = 0;
            let currentFormat: string;
            for (let i = formatOffset; i <= format.length; i++)
            {
                if (i == formatOffset)
                    currentFormat = format[i];

                if (currentFormat == format[i] && currentFormat in formats)
                    continue;
                else
                {
                    if (currentFormat in formats)
                    {
                        let tmp: number;
                        if (i == format.length)
                            tmp = Number(value.substring(valueOffset));
                        else
                        {
                            tmp = Number(value.substring(valueOffset, value.indexOf(format[i], valueOffset)));
                            valueOffset = value.indexOf(format[i], valueOffset) + 1;
                        }
                        if (isNaN(tmp))
                            throw new Error(`${value} (${value.substring(valueOffset, i)}) does not match ${format}`);
                        if (currentFormat == 'M')
                            tmp--;

                        switch (i - formatOffset)
                        {
                            case 1:
                            case 2:
                            case 4:
                                if (currentFormat == 'y' && tmp < 100)
                                    if (tmp < 75)
                                        tmp = tmp + 2000;
                                    else
                                        tmp = tmp + 1900;

                                switch (currentFormat)
                                {
                                    case 'h':
                                        result.setUTCHours(tmp);
                                        break;
                                    case 'm':
                                        result.setUTCMinutes(tmp);
                                        break;
                                    case 'y':
                                        result.setUTCFullYear(tmp);
                                        break;
                                    case 'M':
                                        result.setUTCMonth(tmp);
                                        break;
                                    case 'd':
                                        result.setUTCDate(tmp);
                                        break;
                                    case 's':
                                        result.setUTCSeconds(tmp);
                                        break;
                                }
                                break;
                            case 3:
                            default:
                                throw new Error(`Unsupported format ${format.substring(0, i)}`);
                        }
                    }
                    formatOffset = i + 1;
                }
            }
            return result;
        }
    }
}

export class DateFormatter implements FormatterFactory<Date, DateFormatterSettings>
{
    public parse(expression: string): DateFormatterSettings
    {
        // console.log(expression);
        const settings = new Parser().parse(expression);
        if (settings instanceof ParsedString)
            return { format: settings.value };
        return settings as unknown as DateFormatterSettings;
    }
    public build(settings: DateFormatterSettings): Formatter<Date>
    {
        const parser = formatParser(settings && settings.format || 'yyyy-MM-dd');
        return function (value)
        {
            if (value instanceof Date)
                return value;
            if (typeof value != 'string')
                value = value.toString();
            return parser.parse(value as string);
        }
    }
}


module('$formatters').register('#date', new DateFormatter());
