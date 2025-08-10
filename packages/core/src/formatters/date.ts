// import { Parser, ParsedString } from '../parser/parser.js';
// import { Formatter, FormatterFactory } from './common.js';
// import { module } from '../helpers.js';

import ErrorWithStatus, { HttpStatusCode } from "../errorWithStatus.js";
import { lazy } from "../helpers.js";
import { StringCursor } from "../parser/parser.js";
import type { Formatter, ReversibleFormatter } from "./common.js";

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
    s: Date.prototype.getUTCSeconds,
    sss: Date.prototype.getUTCMilliseconds,
}

const formatsFormatter = (locale: string | Intl.Locale) => ({
    h: function (this: Date) { return formats.h.call(this).toString() },
    m: function (this: Date) { return formats.m.call(this).toString() },
    M: function (this: Date) { return formats.M.call(this).toString() },
    d: function (this: Date) { return formats.d.call(this).toString() },
    s: function (this: Date) { return formats.s.call(this).toString() },
    sss: function (this: Date) { return formats.sss.call(this).toString() },
    y: function (this: Date)
    {
        const y = formats.y.call(this);
        if (y >= 2000)
            return (y - 2000).toString();
        return (y - 1900).toString();
    },

    hh: function (this: Date) { return formats.h.call(this).toString().padStart(2, '0') },
    mm: function (this: Date) { return formats.m.call(this).toString().padStart(2, '0') },
    MM: function (this: Date) { return formats.M.call(this).toString().padStart(2, '0') },
    dd: function (this: Date) { return formats.d.call(this).toString().padStart(2, '0') },
    ss: function (this: Date) { return formats.s.call(this).toString().padStart(2, '0') },
    yy: function (this: Date)
    {
        return formats.y.call(this).toString().substring(2);
    },
    MMM: function (this: Date) { return new Intl.DateTimeFormat(locale, { month: 'narrow' }).formatToParts(this).find(x => x.type == "month").value },
    MMMM: function (this: Date) { return new Intl.DateTimeFormat(locale, { month: 'long' }).formatToParts(this).find(x => x.type == "month").value },
    ddd: function (this: Date) { return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).formatToParts(this).find(x => x.type == "weekday").value },
    dddd: function (this: Date) { return new Intl.DateTimeFormat(locale, { weekday: 'long' }).formatToParts(this).find(x => x.type == "weekday").value },
    yyy: function (this: Date)
    {
        return formats.y.call(this).toString();
    },
    yyyy: function (this: Date)
    {
        return formats.y.call(this).toString();
    },
    char: function (s: string)
    {
        return function (this: Date)
        {
            return s;
        }
    }
});

function readUpToNDigits(s: StringCursor, n: number)
{

    let value = s.char;
    for (; n >= 0; n--)
    {
        s.offset++;
        if (!isNaN(Number(s.char)))
            value += s.char;
        else
            break;
    }
    const result = Number(value);
    if (isNaN(result))
        throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The provided string does not match the expected format');
    return result;
}

const formatsParser = {
    h: function (s: StringCursor, date: Date) { date.setUTCHours(readUpToNDigits(s, 2)) },
    m: function (s: StringCursor, date: Date) { date.setUTCMinutes(readUpToNDigits(s, 2)) },
    M: function (s: StringCursor, date: Date) { date.setUTCMonth(readUpToNDigits(s, 2) - 1) },
    d: function (s: StringCursor, date: Date) { date.setUTCDate(readUpToNDigits(s, 2)) },
    s: function (s: StringCursor, date: Date) { date.setUTCSeconds(readUpToNDigits(s, 2)) },
    sss: function (s: StringCursor, date: Date) { date.setUTCMilliseconds(readUpToNDigits(s, 8)) },
    y: function (s: StringCursor, date: Date) { const n = readUpToNDigits(s, 2); n >= 50 ? date.setUTCFullYear(n + 1900) : date.setUTCFullYear(n + 2000); },
    hh: function (s: StringCursor, date: Date) { date.setUTCHours(readUpToNDigits(s, 2)) },
    mm: function (s: StringCursor, date: Date) { date.setUTCMinutes(readUpToNDigits(s, 2)) },
    MM: function (s: StringCursor, date: Date) { date.setUTCMonth(readUpToNDigits(s, 2) - 1) },
    dd: function (s: StringCursor, date: Date) { date.setUTCDate(readUpToNDigits(s, 2)) },
    ss: function (s: StringCursor, date: Date) { date.setUTCSeconds(readUpToNDigits(s, 2)) },
    yy: function (s: StringCursor, date: Date) { const n = readUpToNDigits(s, 2); n >= 50 ? date.setUTCFullYear(n + 1900) : date.setUTCFullYear(n + 2000); },
    yyy: function (s: StringCursor, date: Date) { date.setUTCFullYear(readUpToNDigits(s, 4)) },
    yyyy: function (s: StringCursor, date: Date) { date.setUTCFullYear(readUpToNDigits(s, 4)) },
    skip: function (s: StringCursor, date: Date) { s.offset++; }
}

/**
 * Parses and formats dates according to the specified format string.
 * 
 * @param format - The date format string (e.g., 'yyyy-MM-dd').
 * @returns An object with format and parse functions for date conversion.
 */
export function formatParser(format: string, locale: string | Intl.Locale)
{
    if (!format)
        format = 'yyyy-MM-dd';

    const init = lazy(() =>
    {
        const formatters: ((this: Date) => string)[] = [];
        const parsers: ((s: StringCursor, date: Date) => void)[] = [];
        let offset = 0;
        const localeFormatters = formatsFormatter(locale);
        for (let i = offset; i < format.length; i++)
        {
            if (i > 0 && format[i - 1] != format[i] || i == format.length - 1)
            {
                const f = format.substring(offset, i)
                formatters.push(localeFormatters[f] ?? localeFormatters.char(f));
                parsers.push(formatsParser[f] ?? formatsParser.skip);
                offset = i;
            }
        }
        return { formatters, parsers };
    });


    return {
        /**
         * Formats a Date object into a string using the configured format.
         * 
         * @param value - The Date to format.
         * @returns Formatted date string.
         */
        format(value: Date): string
        {
            return init().formatters.reduce((previous, current) => previous + current.call(value), '')
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
            const result = new Date(Date.UTC(0, 0, 0, 0, 0, 0, 0));
            if (typeof value == 'string' && value)
            {
                const s = new StringCursor(value);
                init().parsers.forEach(current => current(s, result))
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
    constructor(dateFormat: string | { format: string, locale: string | Intl.Locale })
    {
        if (typeof dateFormat == 'string')
            this.dateFormat = formatParser(dateFormat, undefined);
        else
            this.dateFormat = formatParser(dateFormat?.format, dateFormat?.locale);
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
