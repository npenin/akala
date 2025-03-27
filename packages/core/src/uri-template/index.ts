import { ErrorWithStatus, HttpStatusCode } from "../errorWithStatus.js";

/** 
 * Level 2 operators used in URI templates (RFC 6570).
 */
export type OperatorL2 = '+' | '#';
/** 
 * Level 3 operators used in URI templates (RFC 6570).
 */
export type OperatorL3 = '.' | '/' | ';' | '?' | '&';
/** 
 * Reserved operators used in URI templates (RFC 6570).
 */
export type OperatorReserved = '=' | ',' | '!' | '@' | '|';
/** 
 * Union type combining all URI template operators.
 */
export type Operators = OperatorL2 | OperatorL3 | OperatorReserved;

const first = {
    '': '',
    '+': '',
    '.': '.',
    '/': '/',
    ';': ';',
    '?': '?',
    '&': '&',
    '#': '#',
} as const
const sep = {
    '': ',',
    '+': ',',
    '.': '.',
    '/': '/',
    ';': ';',
    '?': '&',
    '&': '&',
    '#': ',',
} as const
const named = {
    '': false,
    '+': false,
    '.': false,
    '/': false,
    ';': true,
    '?': true,
    '&': true,
    '#': false,
} as const
const ifemp = {
    '': '',
    '+': '',
    '.': '',
    '/': '',
    ';': '',
    '?': '=',
    '&': '=',
    '#': '',
} as const
export const allow = {
    '': ['U'],
    '+': ['U', 'R'],
    '.': ['U'],
    '/': ['U'],
    ';': ['U'],
    '?': ['U'],
    '&': ['U'],
    '#': ['U', 'R'],
} as const
export const restricted = {
    ' ': 1,
    '<': 1,
    '>': 1,
    '{': 1,
    '}': 1,
    '%': 2,
    ':': 2,
    '/': 2,
    '?': 2,
    '#': 2,
    '[': 2,
    ']': 2,
    '@': 2,

    '!': 3,
    '$': 3,
    '&': 3,
    '\'': 3,
    '(': 3,
    ')': 3,
    '*': 3,
    '+': 3,
    ',': 3,
    ';': 3,
    '=': 3,
}

/** 
 * Checks if a character code represents an ASCII alphabetic character (A-Z, a-z).
 * 
 * @param charcode - Unicode code point of the character
 * @returns True if the character is ASCII A-Z or a-z
 */
function isAscii(charcode: number)
{
    return charcode >= 0x41 && charcode <= 0x5a ||
        charcode >= 0x61 && charcode <= 0x7a;
}

function isDigit(charcode: number)
{
    return charcode >= 0x30 && charcode <= 0x39;
}

function isUcschar(charcode: number)
{
    return charcode >= 0xA0 && charcode <= 0xD7FF ||
        charcode >= 0xF900 && charcode <= 0xFDCF ||
        charcode >= 0xFDF0 && charcode <= 0xFFEF ||
        charcode >= 0x10000 && charcode <= 0x1FFFD ||
        charcode >= 0x20000 && charcode <= 0x2FFFD ||
        charcode >= 0x30000 && charcode <= 0x3FFFD ||
        charcode >= 0x40000 && charcode <= 0x4FFFD ||
        charcode >= 0x50000 && charcode <= 0x5FFFD ||
        charcode >= 0x60000 && charcode <= 0x6FFFD ||
        charcode >= 0x70000 && charcode <= 0x7FFFD ||
        charcode >= 0x80000 && charcode <= 0x8FFFD ||
        charcode >= 0x90000 && charcode <= 0x9FFFD ||
        charcode >= 0xa0000 && charcode <= 0xaFFFD ||
        charcode >= 0xb0000 && charcode <= 0xbFFFD ||
        charcode >= 0xc0000 && charcode <= 0xcFFFD ||
        charcode >= 0xd0000 && charcode <= 0xdFFFD ||
        charcode >= 0xe1000 && charcode <= 0xeFFFD;
}

function isiPrivate(charcode: number)
{
    return charcode >= 0xe0000 && charcode <= 0xeF8FF ||
        charcode >= 0xf0000 && charcode <= 0xfFFFD ||
        charcode >= 0x100000 && charcode <= 0x10FFFD;
}

function encodeURIComponent(value: string | number | bigint | boolean, operator: Operators, sub: number | undefined): string
{
    let lastOffset = 0;
    let result: string[] = [];
    switch (typeof value)
    {
        case 'undefined':
            return undefined;
        case 'bigint':
        case 'boolean':
        case 'number':
            return encodeURIComponent(value.toString(), operator, sub);
        case 'string':
            if (sub)
                value = value.substring(0, sub);
            for (let i = 0; i < value.length; i++)
            {
                switch (restricted[value[i]])
                {
                    case 1:
                        result.push(value.substring(lastOffset, i), '%' + value.charCodeAt(i).toString(16).toUpperCase());
                        lastOffset = i + 1;
                        break;
                    case 2:
                    case 3:
                        if ((value[i] == '%' && (i > value.length - 2 || !isHex(value.substring(i + 1, i + 3)))) || !allow[operator || '']?.includes('R'))
                        {
                            result.push(value.substring(lastOffset, i), '%' + value.charCodeAt(i).toString(16).toUpperCase());
                            lastOffset = i + 1;
                        }
                        break;
                    default:
                        const charCode = value.charCodeAt(i);
                        if (isAscii(charCode) || isDigit(charCode) || charCode == 0x5f || charCode == 0x7e || charCode == 0x2d || charCode == 0x2e)
                            break;
                        if (charCode == 0x21 || charCode == 0x23 || charCode == 0x24 || charCode == 0x26 || charCode == 0x28 && charCode < 0x3b ||
                            charCode == 0x3d || charCode == 0x3f && charCode < 0x5b || charCode == 0x5d || charCode == 0x5f || charCode == 0x61 && charCode < 0x7a || charCode == 0x7e ||
                            isUcschar(charCode) || isiPrivate(charCode)
                        )
                        {
                            const chars: number[] = [];
                            if (charCode < 0x80)
                                chars.push(charCode);
                            else if (charCode < 0x800)
                            {
                                chars.push(0xc0 | (charCode >> 6))
                                chars.push(0x80 | (charCode & 0b00111111))
                            }
                            else if (charCode < 0x10000)
                            {
                                chars.push(0xe0 | (charCode >> 12))
                                chars.push(0x80 | ((charCode >> 6) & 0b00111111))
                                chars.push(0x80 | (charCode & 0b00111111))
                            }
                            else
                            {
                                chars.push(0b1111000 | (charCode >> 18))
                                chars.push(0x80 | ((charCode >> 12) & 0b00111111))
                                chars.push(0x80 | ((charCode >> 6) & 0b00111111))
                                chars.push(0x80 | (charCode & 0b00111111))
                            }
                            result.push(value.substring(lastOffset, i), '%' + chars.map(n => n.toString(16)).join('%').toUpperCase());
                            lastOffset = i + 1;
                        }
                }
            }

            if (lastOffset < value.length && result.length)
                result.push(value.substring(lastOffset));

            // if (value.length > 0 && operator == '#')
            //     if (result.length)
            //         result.unshift('#');
            //     else
            //         value = '#' + value;


            if (result.length)
                return result.join('');
            return value;

        // case 'object':
        //     if (Array.isArray(value))
        //         return encodeURIComponents(value, operator, sub, explode).join(joinOperator(operator, false));

        //     if (explode)
        //         return Object.entries(value).map(v => encodeURIComponent(v[0], subOperator(operator, false), undefined, false) + (v[1] ? '=' + encodeURIComponent(v[1], subOperator(operator, false), undefined, false) : '')).join(joinOperator(operator, false));
        //     return Object.entries(value).flatMap(v => encodeURIComponent(v, subOperator(operator, false), undefined, false)).join(',');
        default:
            throw new Error('unsupported value type ' + typeof value);
    }
}

function decodeURIComponent(value: string | number | bigint | boolean): string
{
    // let lastOffset = 0;
    // let result: string[] = [];
    switch (typeof value)
    {
        case 'undefined':
            return undefined;
        case 'bigint':
        case 'boolean':
        case 'number':
            return value.toString();
        case 'string':
            return globalThis.decodeURIComponent(value);
        // for (let i = 0; i < value.length; i++)
        // {
        //     const charCode = value.charCodeAt(i);

        //     if (charCode == 37) //%
        //     {
        //         const chars: number[] = [];
        //         if (charCode < 0x80)
        //             chars.push(charCode);
        //         else if (charCode < 0x800)
        //         {
        //             chars.push(0xc0 | (charCode >> 6))
        //             chars.push(0x80 | (charCode & 0b00111111))
        //         }
        //         else if (charCode < 0x10000)
        //         {
        //             chars.push(0xe0 | (charCode >> 12))
        //             chars.push(0x80 | ((charCode >> 6) & 0b00111111))
        //             chars.push(0x80 | (charCode & 0b00111111))
        //         }
        //         else
        //         {
        //             chars.push(0b1111000 | (charCode >> 18))
        //             chars.push(0x80 | ((charCode >> 12) & 0b00111111))
        //             chars.push(0x80 | ((charCode >> 6) & 0b00111111))
        //             chars.push(0x80 | (charCode & 0b00111111))
        //         }
        //         result.push(value.substring(lastOffset, i), String.fromCharCode(...chars));
        //         lastOffset = i + 1;
        //     }
        // }

        // if (lastOffset < value.length && result.length)
        //     result.push(value.substring(lastOffset));

        // if (result.length)
        //     return result.join('');
        // return value;

        default:
            throw new Error('unsupported value type ' + typeof value);
    }
}

enum Lexer
{
    Literal,
    VariableExpansion,
    Sub
}

export type UriTemplate = (string | UriTemplateExpansion)[];
export type UriTemplateExpansion = { ref: string | UriTemplateExpansion[], sub?: number, operator?: Operators, explode?: boolean };

function isL2Operator(operator: string): operator is OperatorL2
{
    return operator == '+' || operator == '#'
}

function isL3Operator(operator: string): operator is OperatorL3
{
    return operator == '.' || operator == '/' || operator == ';' || operator == '?' || operator == '&'
}

function isReservedOperator(operator: string): operator is OperatorReserved
{
    return operator == '=' || operator == ',' || operator == '!' || operator == '@' || operator == '|'
}

function isOperator(operator: string): operator is Operators
{
    return isL2Operator(operator) || isL3Operator(operator) || isReservedOperator(operator);
}

export function subOperatorx(operator: Operators | undefined, isMulti: boolean): Operators | undefined
{
    switch (operator)
    {
        case "#":
            return '+';
        case undefined:
        case ",":
        case ".":
        case "/":
            if (isMulti)
                return operator;
            return undefined;
        case "&":
        case ";":
        case "+":
        case "?":
        case "=":
        case "!":
        case "@":
        case "|":
            return operator;
    }
}

export function joinOperator(operator: Operators | undefined, isMulti: boolean): Operators | undefined
{

    switch (operator)
    {
        case "?":
            return '&';
        case ".":
        case "/":
            return isMulti ? undefined : operator;
        case "&":
        case ";":
            return undefined;
        default:
        case ",":
        case undefined:
            return ','
    }
}

export function prefixOperator(operator: Operators | undefined, isMulti: boolean): Operators | undefined
{

    switch (operator)
    {
        case ";":
        case "&":
        case ".":
        case "/":
            if (isMulti)
                return undefined;
            return operator;
        case "#":
        case "?":
            return operator;
        default:
        case ",":
        case undefined:
            return undefined;
    }
}

export function match(s: string, template: UriTemplate): null | { remainder: string, variables: Record<string, unknown> }
{
    let lastOffset = 0;
    const result = {};
    for (let i = 0; i < template.length; i++)
    {
        const t = template[i];
        switch (typeof t)
        {
            case 'string':
                if (s.indexOf(t, lastOffset) != lastOffset)
                    return null;
                lastOffset += t.length;
                break;
            case 'object':
                let indexOfSep: number = -1;

                if (typeof t.ref !== 'string')
                {
                    if ((first[t.operator || ''] || ''))
                        lastOffset += (first[t.operator || ''] || '').length;

                    for (let j = 0; j < t.ref.length; j++)
                    {
                        const subT = t.ref[j];
                        let keepSep = 1;
                        if (j < t.ref.length - 1)
                            indexOfSep = s.indexOf(sep[subT.operator || ''] || sep[''], lastOffset);
                        else if (i < template.length - 1 && typeof template[i + 1] == 'string')
                        {
                            indexOfSep = s.indexOf(template[i + 1] as string, lastOffset);
                            keepSep = 0;
                        }
                        else
                            indexOfSep = s.indexOf('/', lastOffset);
                        if (typeof subT.ref !== 'string')
                            throw new Error('invalid template');
                        if (!result[subT.ref] || typeof result[subT.ref] == 'string' && !t.sub)
                        {
                            if (i == template.length - 1 && j == t.ref.length - 1)
                            {
                                if (indexOfSep == -1)
                                {
                                    result[subT.ref] = decodeURIComponent(s.substring(lastOffset));
                                    lastOffset = s.length;
                                }
                                else
                                {
                                    result[subT.ref] = decodeURIComponent(s.substring(lastOffset, indexOfSep));
                                    lastOffset = indexOfSep + keepSep;
                                }
                            }
                            else
                            {
                                if (indexOfSep == -1)
                                    return null;
                                result[subT.ref] = decodeURIComponent(s.substring(lastOffset, indexOfSep));
                                lastOffset = indexOfSep + keepSep;
                            }
                            if (named[t.operator || ''])
                            {
                                const ifempty = ifemp[t.operator || ''] || '';
                                const namePrefix = subT.ref + ifempty;
                                if (result[subT.ref].startsWith(namePrefix))
                                    if (result[subT.ref].length > namePrefix.length)
                                        result[subT.ref] = result[subT.ref].substring(namePrefix.length - ifempty.length + 1)
                                    else
                                        result[subT.ref] = '';
                            }
                        }
                    }
                }
                else
                {

                    if ((first[t.operator || ''] || ''))
                        lastOffset += (first[t.operator || ''] || '').length;

                    if (!result[t.ref] || typeof result[t.ref] == 'string' && !t.sub)
                    {
                        if (i < template.length - 1 && typeof template[i + 1] == 'string')
                        {
                            indexOfSep = s.indexOf(template[i + 1] as string, lastOffset);
                            if (indexOfSep > -1)
                            {
                                result[t.ref] = decodeURIComponent(s.substring(lastOffset, indexOfSep));
                                lastOffset = indexOfSep;
                            }
                        }
                        else // if (i < template.length - 1)
                        {
                            for (let j = lastOffset; j < s.length; j++)
                            {
                                if (s[j] == sep[t.explode ? t.operator || '' : ''])
                                {
                                    if (!result[t.ref])
                                        result[t.ref] = decodeURIComponent(s.substring(lastOffset, j));
                                    else if (Array.isArray(result[t.ref]))
                                        result[t.ref].push(decodeURIComponent(s.substring(lastOffset, j)));
                                    else
                                        result[t.ref] = [result[t.ref], decodeURIComponent(s.substring(lastOffset, j))]
                                    lastOffset = j + 1;
                                }
                                // else
                                // {
                                //     throw new Error('je sias pas comment gerer ce cas')
                                // }
                            }
                            // else
                            //     indexOfSep = s.length;
                            // // else
                            // //     indexOfSep = s.indexOf('/', lastOffset);

                            // if (i == template.length - 1)
                            // {
                            if (lastOffset < s.length)
                            {
                                if (!result[t.ref])
                                    result[t.ref] = decodeURIComponent(s.substring(lastOffset));
                                else if (Array.isArray(result[t.ref]))
                                    result[t.ref].push(decodeURIComponent(s.substring(lastOffset)));
                                else
                                    result[t.ref] = [result[t.ref], decodeURIComponent(s.substring(lastOffset))]
                                lastOffset = s.length;
                            }
                        }
                        // }
                        // else
                        //     switch (typeof template[i + 1])
                        //     {
                        //         case 'string':
                        //             const indexOfSep = s.indexOf(template[i + 1] as string, lastOffset);
                        //             if (indexOfSep == -1)
                        //                 return null;
                        //             result[t.ref] = decodeURIComponent(s.substring(lastOffset, indexOfSep));
                        //             lastOffset = indexOfSep;

                        //             break;
                        //         default:
                        //             break;
                        //     }

                        if (named[t.operator || ''])
                        {
                            const ifempty = ifemp[t.operator || ''] || '';
                            const namePrefix = t.ref + ifempty;
                            if (typeof result[t.ref] == 'string')
                            {
                                if (result[t.ref].startsWith(namePrefix))
                                    if (result[t.ref].length > namePrefix.length)
                                        result[t.ref] = result[t.ref].substring(namePrefix.length - ifempty.length + 1)
                                    else
                                        result[t.ref] = '';
                            }
                            else
                            {
                                let caseHandled = true;
                                if (!t.explode)
                                {
                                    if (result[t.ref][0].startsWith(namePrefix))
                                        if (result[t.ref][0].length > namePrefix.length)
                                            result[t.ref][0] = result[t.ref][0].substring(namePrefix.length - ifempty.length + 1)
                                        else if (result[t.ref].length == 0)
                                            result[t.ref][0] = '';
                                        else
                                            caseHandled = false;
                                    else
                                        caseHandled = false;
                                }
                                else
                                {
                                    if (Array.isArray(result[t.ref]))
                                        result[t.ref] = result[t.ref].map(v => v !== namePrefix ? v.startsWith(namePrefix) ? v.substring(namePrefix.length - ifempty.length + 1) : v : '');
                                    else
                                        caseHandled = false;
                                }
                                if (!caseHandled)
                                    throw new Error(`${JSON.stringify(result[t.ref])} is not a string`);
                            }
                        }

                        if (t.explode)
                        {
                            let allValid = true;
                            const objEntries = result[t.ref].map((x, i) =>
                            {
                                if (!allValid)
                                    return null;
                                const indexOfEqual = x.indexOf('=');
                                if (indexOfEqual > -1)
                                    return [x.substring(0, indexOfEqual), x.substring(indexOfEqual + 1)];
                                allValid = false;
                                return null;
                            });
                            if (allValid)
                                result[t.ref] = Object.fromEntries(objEntries);
                        }
                    }
                }

        }
    }
    if (lastOffset !== s.length)
        return { remainder: s.substring(lastOffset), variables: result };
    return { remainder: '', variables: result };
}

export function expand(template: UriTemplate, variables: Record<string, unknown>): string
{
    return expandInternal(template, variables).join('');
}

function expandInternal(template: UriTemplate, variables: Record<string, unknown>): string[]
{

    return template.flatMap((t, i) =>
    {
        let isFirst = true;
        function result(v: string, prefix?: string)
        {
            if (isFirst && !!v)
            {
                isFirst = false;
                if (prefix)
                    return prefix + v;
            }
            return v;
        }
        if (typeof t == 'string')
            return encodeURIComponent(t, '+', undefined);

        const refs = Array.isArray(t.ref) ? t.ref : [t]
        // if (Array.isArray(t.ref))
        // {
        //     const expansions = expandInternal(t.ref, variables);
        //     if (expansions.length)
        //         return (first[t.operator || ''] || '') + expansions.join(sep[t.operator || ''] || ',')
        //     return undefined;
        // }
        // else
        return refs.flatMap(subT =>
        {
            if (typeof subT.ref !== 'string')
                throw new Error('invalid template');

            let value = variables[subT.ref];
            if (!subT.explode)
            {
                switch (typeof value)
                {
                    case "undefined":
                        return undefined;
                    case "string":
                    case "number":
                    case "bigint":
                    case "boolean":
                        if (named[subT.operator || ''])
                            if (!value)
                                return result(encodeURIComponent(subT.ref, '+', undefined) + (ifemp[subT.operator || ''] || ''), first[subT.operator || ''] || '');
                            else
                                return result(encodeURIComponent(subT.ref, '+', undefined) + '=' + encodeURIComponent(value, subT.operator, subT.sub), first[subT.operator || ''] || '');
                        return result(encodeURIComponent(value, subT.operator, subT.sub), first[subT.operator || ''] || '');
                    case "object":
                        if (subT.sub)
                            throw new Error('cannot apply sub on composite values');
                        if (named[subT.operator || ''])
                            if ((value && Array.isArray(value) ? !value.length : !value || !Object.keys(value).length))
                                return undefined;
                            else
                            {
                                if (Array.isArray(value))
                                    value = value.map(v => encodeURIComponent(v, subT.operator, subT.sub)).filter(v => v).join(',');
                                else
                                    value = Object.entries(value).flatMap(e => e.map(v => encodeURIComponent(v, subT.operator, subT.sub))).join(',');
                                if (!value)
                                    return result(encodeURIComponent(subT.ref, '+', undefined) + (ifemp[subT.operator || ''] || ''), first[subT.operator || ''] || '');
                                else
                                    return result(encodeURIComponent(subT.ref, '+', undefined) + '=' + value, first[subT.operator || ''] || '');
                            }
                        if (Array.isArray(value))
                            return result(value.map(v => encodeURIComponent(v, subT.operator, subT.sub)).filter(v => v).join(','), first[subT.operator || ''] || '')

                        // else if (t.explode)
                        //     return encodeURIComponent(t.ref, '+', undefined, undefined) + '=' + encodeURIComponent(value, t.operator, t.sub, t.explode);
                        return result(Object.entries(value).flatMap(e => e.map(v => encodeURIComponent(v, subT.operator, subT.sub))).join(','), first[subT.operator || ''] || '');
                    case "symbol":
                    case "function":
                        throw new ErrorWithStatus(HttpStatusCode.NotImplemented)
                }
            }
            else
            {
                switch (typeof value)
                {
                    case "string":
                    case "number":
                    case "undefined":
                    case "bigint":
                    case "boolean":
                        if (named[subT.operator || ''])
                            if (!value)
                                return result(encodeURIComponent(subT.ref, '+', undefined) + (ifemp[subT.operator || ''] || ''), first[subT.operator || ''] || '');
                            else
                                return result(encodeURIComponent(subT.ref, '+', undefined) + '=' + encodeURIComponent(value, subT.operator, subT.sub), first[subT.operator || ''] || '');
                        return result(encodeURIComponent(value, subT.operator, subT.sub), first[subT.operator || ''] || '');
                    case "object":
                        if (named[subT.operator || ''])
                            if ((value && Array.isArray(value) ? !value.length : !value || !Object.keys(value).length))
                                return undefined;
                            // return result(encodeURIComponent(subT.ref, '+', undefined) + (ifemp[subT.operator || ''] || ''), first[subT.operator || ''] || '');
                            else
                                if (Array.isArray(value))
                                    return result(encodeURIComponent(subT.ref, '+', undefined) + '=' + value.map(v => encodeURIComponent(v, undefined, undefined)).filter(x => x).join((sep[subT.operator || ''] || ',') + encodeURIComponent(subT.ref, '+', undefined) + '='), first[subT.operator || ''] || '')
                                else
                                    return result(Object.entries(value).map(v => encodeURIComponent(v[0], '+', undefined) + '=' + encodeURIComponent(v[1], subT.operator, subT.sub)).filter(x => x).join((sep[subT.operator || ''] || ',')), first[subT.operator || ''] || '')
                        else if (Array.isArray(value))
                            return result(value.map(v => encodeURIComponent(v, undefined, undefined)).filter(x => x).join((sep[subT.operator || ''] || ',')), first[subT.operator || ''] || '')
                        else
                            return result(Object.entries(value).map(v => encodeURIComponent(v[0], '+', undefined) + '=' + encodeURIComponent(v[1], subT.operator, subT.sub)).join((sep[subT.operator || ''] || ',')), first[subT.operator || ''] || '')

                    // else if (t.explode)
                    //     return encodeURIComponent(t.ref, '+', undefined, undefined) + '=' + encodeURIComponent(value, t.operator, t.sub, t.explode);

                    case "symbol":
                    case "function":
                        throw new ErrorWithStatus(HttpStatusCode.NotImplemented)
                }
            }
            // if (varia)

            // const preOperator = prefixOperator(t.operator, false);
            // if (Array.isArray(variables[t.ref]))
            // {
            //     const values = encodeURIComponents(variables[t.ref] as unknown[], t.operator, t.sub, t.explode);

            //     if (typeof preOperator !== 'undefined')
            //         if (preOperator == '&' || preOperator == '?' || preOperator == ';')
            //         {
            //             return values.map(value =>
            //             {
            //                 if (!value && t.operator == ';')
            //                     return preOperator + t.ref;
            //                 else
            //                     return `${preOperator}${t.ref}=${value}`;
            //             }).join(joinOperator(t.operator, true));
            //         }
            //         else
            //             return preOperator + values.join(joinOperator(t.operator, !t.explode));
            //     return values.join(joinOperator(t.operator, !t.explode));
            // }
            // else
            //     value = encodeURIComponent(variables[t.ref], t.operator, t.sub, t.explode);

            // if (typeof preOperator !== 'undefined' && typeof value !== 'undefined')
            //     if (preOperator == '&' || preOperator == '?' || preOperator == ';')
            //     {
            //         if (!value && t.operator == ';')
            //             return preOperator + t.ref;
            //         else
            //             return `${preOperator}${t.ref}=${value}`;
            //     }
            //     else
            //         return preOperator + value;
            // return value;
        }).filter(x => x).join(sep[t.operator || ''] || '');
    }).filter(x => x)
}

export function parse(s: string): UriTemplate
{
    const result = tryParse(s);
    if (result.warnings.length)
        throw result.warnings[0]
    return result.template;
}

export function tryParse(s: string): { template: UriTemplate, warnings: Error[] }
{
    const template: UriTemplate = [];
    const warnings: Error[] = [];
    let lastOffset = 0;
    let state: Lexer;
    state = Lexer.Literal;
    let expansion: UriTemplateExpansion = null;
    for (let i = 0; i < s.length; i++)
    {
        const char = s[i];
        switch (state as Lexer)
        {
            case Lexer.Literal:
                if (char == '}')
                    warnings.push(new Error('found closing brace without a matching open brace'))

                if (char == '{')        
                {
                    if (lastOffset < i)
                        template.push(s.substring(lastOffset, i));
                    state = Lexer.VariableExpansion;
                }
                break;

            case Lexer.VariableExpansion:
                if (isOperator(char))
                {
                    if (char == ',')
                    {
                        if (lastOffset < i)
                        {
                            if (!Array.isArray(expansion.ref))
                                expansion.ref = [{ ref: s.substring(lastOffset, i), operator: expansion.operator, sub: expansion.sub, explode: expansion.explode }];
                            else
                                expansion.ref.push({ ref: s.substring(lastOffset, i), operator: expansion.operator });
                        }
                        else if (!Array.isArray(expansion.ref))
                            expansion.ref = [{ ref: expansion.ref, operator: expansion.operator, sub: expansion.sub, explode: expansion.explode }];

                        lastOffset = i + 1;
                    }
                    else
                    {
                        if (expansion === null)
                        {
                            if (isReservedOperator(char))
                                warnings.push(new Error(`${char} is a reserved operator, for which the operation is not defined yet`))
                            expansion = { ref: '', operator: char };
                            lastOffset = i + 1;
                        }
                        else if (!expansion.ref)
                            warnings.push(new Error(`found 2 operators (${expansion.operator},${char}) in the same variable expansion expression`))
                    }
                }
                else
                {
                    if (expansion == null)
                    {
                        expansion = { ref: '' };
                        lastOffset = i;
                    }
                    if (/[^a-z0-9_\}\*\:%]/i.test(char))
                        warnings.push(new Error(`an invalid character (${char}) war found`));
                }

                if (char == ':' || char == '*')
                {
                    if (expansion == null)
                        warnings.push(new Error('invalid url template: empty variable name (' + s + ')'));
                    if (Array.isArray(expansion.ref))
                        expansion.ref.push({ ref: s.substring(lastOffset, i), operator: expansion.operator });
                    else
                        expansion.ref = s.substring(lastOffset, i);
                    if (char == ':')
                        state = Lexer.Sub;
                    else
                        if (Array.isArray(expansion.ref))
                            expansion.ref[expansion.ref.length - 1].explode = true;
                        else
                            expansion.explode = true;
                    lastOffset = i + 1;

                }
                else if (char == '}')
                {
                    if (expansion == null)
                        throw new Error('invalid url template: empty variable name (' + s + ')');
                    state = Lexer.Literal;
                    if (lastOffset < i)
                    {
                        if (Array.isArray(expansion.ref))
                            expansion.ref.push({ ref: s.substring(lastOffset, i), operator: expansion.operator });
                        else
                            expansion.ref = s.substring(lastOffset, i);
                    }
                    lastOffset = i + 1;
                    template.push(expansion);
                    expansion = null;
                }
                break;
            case Lexer.Sub:
                if (char == ',')
                {
                    if (!Array.isArray(expansion.ref))
                        expansion.ref = [{ ref: expansion.ref, operator: expansion.operator, sub: Number(s.substring(lastOffset, i)) }];
                    else
                        expansion.ref[expansion.ref.length - 1].sub = Number(s.substring(lastOffset, i));

                    lastOffset = i + 1;
                    state = Lexer.VariableExpansion;
                }
                else if (char == '}')
                {
                    if (expansion == null)
                        warnings.push(new Error('invalid url template: empty variable name (' + s + ')'));
                    state = Lexer.Literal;
                    if (lastOffset < i)
                    {
                        if (!Array.isArray(expansion.ref))
                            expansion.sub = Number(s.substring(lastOffset, i))
                        else
                            expansion.ref[expansion.ref.length - 1].sub = Number(s.substring(lastOffset, i));
                    }
                    lastOffset = i + 1;
                    template.push(expansion);
                    expansion = null;

                }
                else if (isNaN(Number(char)))
                    warnings.push(new Error('sub can only contain numbers'));
        }
    }
    if (state != Lexer.Literal)
        warnings.push(new Error('Invalid lexer state after parsing (' + s + ')'));

    if (lastOffset < s.length)
        template.push(s.substring(lastOffset));

    if (state !== Lexer.Literal)
        warnings.push(new Error('template is not terminated'));

    return { template, warnings };
}

function isHex(arg0: string): boolean
{
    for (let i = 0; i < arg0.length; i++)
    {
        switch (arg0[i])
        {
            case 'a':
            case 'b':
            case 'c':
            case 'd':
            case 'e':
            case 'f':
            case 'A':
            case 'B':
            case 'C':
            case 'D':
            case 'E':
            case 'F':
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                continue;
            default:
                return false;
        }
    }
    return !!arg0.length;
}
