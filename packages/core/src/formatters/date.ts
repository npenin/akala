// import { Parser, ParsedString } from '../parser/parser.js';
// import { Formatter, FormatterFactory } from './common.js';
// import { module } from '../helpers.js';

import { Formatter, ReversibleFormatter } from "./common.js";

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

/**
 * Parses and formats dates according to the specified format string.
 * 
 * @param format - The date format string (e.g., 'yyyy-MM-dd').
 * @returns An object with format and parse functions for date conversion.
 */
export function formatParser(format: string)
{
    if (!format)
        format = 'yyyy-MM-dd';
    return {
        /**
         * Formats a Date object into a string using the configured format.
         * 
         * @param value - The Date to format.
         * @returns Formatted date string.
         */
        format(value: Date): string
        {
            let result = '';
            let offset = 0;
            let currentFormat: string;
            for (let i = offset; i < format.length; i++)
            {
                if (i === offset)
                    currentFormat = format[i];

                if (currentFormat === format[i])
                    continue;

                if (currentFormat in formats)
                {
                    let tmp = formats[currentFormat].call(value);
                    switch (i - offset)
                    {
                        case 1:
                            if (currentFormat === 'y')
                                tmp %= 100;
                            result += tmp;
                            break;
                        case 2:
                            if (currentFormat === 'y')
                                tmp %= 100;
                            result += tmp.toString().padStart(2, '0');
                            break;
                        case 4:
                            if (currentFormat !== 'y')
                                throw new Error(`Unsupported format ${format.substring(0, i)}`);
                            result += tmp;
                            break;
                        default:
                            throw new Error(`Unsupported format ${format.substring(0, i)}`);
                    }
                }
                else
                {
                    result += format.substring(offset, i);
                }
                offset = i + 1;
            }
            return result;
        },

        /**
         * Parses a date string into a Date object using the configured format.
         * 
         * @param value - The date string to parse.
         * @returns Parsed Date object.
         * @throws {Error} If the input doesn't match the format.
         */
        parse(value: string): Date
        {
            const result = new Date(0, 0, 0, 0, 0, 0, 0);
            let formatOffset = 0;
            let valueOffset = 0;
            let currentFormat: string;
            for (let i = formatOffset; i <= format.length; i++)
            {
                if (i === formatOffset)
                    currentFormat = format[i];

                if (currentFormat === format[i] && currentFormat in formats)
                    continue;

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
                        throw new Error(`Invalid date value: ${value} (${value.substring(valueOffset, i)}) in format ${format}`);

                    if (currentFormat === 'M')
                        tmp--;

                    switch (i - formatOffset)
                    {
                        case 1:
                        case 2:
                        case 4:
                            if (currentFormat === 'y' && tmp < 100)
                                if (tmp < 75)
                                    tmp = tmp + 2000;
                                else
                                    tmp = tmp + 1900;

                            switch (currentFormat)
                            {
                                case 'h':
                                    result.setHours(tmp);
                                    break;
                                case 'm':
                                    result.setMinutes(tmp);
                                    break;
                                case 'y':
                                    result.setFullYear(tmp);
                                    break;
                                case 'M':
                                    result.setMonth(tmp);
                                    break;
                                case 'd':
                                    result.setDate(tmp);
                                    break;
                                case 's':
                                    result.setSeconds(tmp);
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
            return result;
        }
    };
}

/**
 * Formatter for converting dates to strings and vice versa.
 */
export default class DateFormatter implements Formatter<string>, ReversibleFormatter<string, Date>
{
    public readonly dateFormat: ReturnType<typeof formatParser>;

    /**
     * Creates a date formatter with the specified format.
     * 
     * @param dateFormat - The format string (e.g., 'yyyy-MM-dd').
     */
    constructor(dateFormat: string)
    {
        this.dateFormat = formatParser(dateFormat);
    }

    /**
     * Parses a formatted date string back into a Date object.
     * 
     * @param {string} value - The date string to parse.
     * @returns {Date} The parsed date.
     */
    unformat(value: string): Date
    {
        return this.dateFormat.parse(value);
    }

    /**
     * Converts a Date object to a formatted string.
     * 
     * @param {Date} value - The Date to format.
     * @returns {string} Formatted date string.
     */
    format(value: Date): string
    {
        return this.dateFormat.format(value);
    }
}
