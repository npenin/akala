import { eachAsync, map } from "@akala/core";
import { FileGenerator } from "@akala/commands";
import { readFile } from 'fs/promises'
import { fileURLToPath } from "url";
import { CssStyleHandler } from "./css.js";
import { PassThrough, Writable } from "stream";

export type DTCGToken = { $value: string, $type?: string, $description?: string, $extensions?: any, $deprecated?: boolean | string };
export type DTCGTokenGroup<T = Record<string, string | object>> = T extends string ? DTCGToken : { [key in keyof T]: T[key] extends string ? DTCGToken : (DTCGTokenGroup<T[key]> & Omit<DTCGToken, '$value'>) }
// export type DTCGTokenGroup = { [key in string]: key extends keyof Omit<DTCGToken, '$value'> ? DTCGToken[key] : DTCGToken | DTCGTokenGroup | string }
export type DTCG = DTCGTokenGroup<Record<string, string | object>>;

export type WebUI = {
    colors: Record<string, string>,
    breakpoints: Record<string, string>,
    lightnesses: Record<string, Record<string, string>>,
    darknesses: Record<string, Record<string, string>>,
}

export type FlattenDTCG = Record<string, DTCGToken>

export default function flatten(token: DTCG, parentType?: string): FlattenDTCG
{
    return Object.fromEntries(map(token, (el, key: string) =>
    {
        if (typeof el == 'undefined')
            return [];
        if (typeof el == 'string')
            if (['$type', '$description', '$extensions', '$deprecated'].includes(key))
                return [];
            else
                return [[key, el]] as [string, string][];
        if ('$value' in el)
            return [[key, Object.assign({ $type: el.$type || token.$type || parentType }, el) as DTCGToken]] as [string, DTCGToken][]
        return Object.entries(flatten(el as DTCG, el.$type || (token as Omit<DTCGToken, '$value'>).$type || parentType)).map(x => [key + '.' + x[0], x[1]]);
    }, true).flat(1));
}

export function mergeTokens(input: DTCGTokenGroup, ...inputs: DTCGTokenGroup[])
{
    const almostOutput = flatten(input);

    for (const input of inputs)
    {
        const additionalOutput = flatten(input);
        for (const entry in additionalOutput)
            almostOutput[entry] = additionalOutput[entry];
    }

    return almostOutput;
}

export function expandTokens<T>(input: FlattenDTCG): DTCGTokenGroup<T>
{
    const result = {} as DTCGTokenGroup<T>;

    Object.entries(input).forEach(e =>
    {
        e[0].split('.').reduce((previous, current, i, keys) =>
        {
            if (i == keys.length - 1)
                return previous[current] = e[1];
            if (previous[current])
                return previous[current];
            return previous[current] = {} as DTCGTokenGroup;
        }, result);
    })

    return result;
}

export type GenerateCssOptions = Partial<{ customMedia: boolean }>

export async function generateCssToString(inputFile: string, options?: GenerateCssOptions)
{
    const pt = new PassThrough();
    const chunks = [];
    const result = new Promise<string>((resolve, reject) =>
    {
        pt.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        pt.on('error', (err) => reject(err));
        pt.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
    await generateCss(inputFile, pt, options);
    return await result;
}


export async function generateCssFromTokensToString(tokens: DTCGTokenGroup<WebUI>, options?: GenerateCssOptions)
{
    const pt = new PassThrough();
    const chunks = [];
    const result = new Promise<string>((resolve, reject) =>
    {
        pt.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        pt.on('error', (err) => reject(err));
        pt.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
    await generateCssFromTokens(tokens, pt, options);
    return await result;
}
export async function generateCss(inputFile: string, outputFile?: string | Writable, options?: GenerateCssOptions)
{
    const tokens = JSON.parse(await readFile(inputFile, 'utf-8')) as DTCGTokenGroup<WebUI>;

    return generateCssFromTokens(tokens, outputFile, options);
}

export async function generateCssFromTokens(tokens: DTCGTokenGroup<WebUI>, outputFile?: string | Writable, options?: GenerateCssOptions)
{
    const errors: Error[] = [];
    if (!isValidDesignFile(tokens, errors))
    {
        throw new Error('invalid token file:\n -' + errors.map(e => e.message).join('\n -'))
    }
    const flattened = flatten({ ...tokens, lightnesses: undefined, darknesses: undefined });
    const generator = await FileGenerator.outputHelper(outputFile, 'variables.css', true);

    if (options?.customMedia)
    {
        await eachAsync(tokens.breakpoints, async (breakpoint, name) =>
        {
            if (name[0] != '$')
                await FileGenerator.write(generator.output, `@custom-media --breakpoints-${CssStyleHandler.normalize(name)} (max-width:${breakpoint.$value});`);
        });
    }

    await FileGenerator.write(generator.output, ':root{\n');
    await eachAsync(flattened, async (value, key) =>
    {
        key = CssStyleHandler.normalize(key);
        await FileGenerator.write(generator.output, `\t--${key}: ${value.$value};\n`);
        if (value.$type == 'color' && key != 'colors-light' && key != 'colors-dark')
        {
            if ('lightnesses' in tokens)
            {
                await eachAsync(tokens.lightnesses[key] || tokens.lightnesses.default, async (l, variant) =>
                {
                    await FileGenerator.write(generator.output, `\t--${key}-${CssStyleHandler.normalize(variant)}: hsl(from var(--${key}) h s ${l.$value});\n`);
                })
            }
            if ('darknesses' in tokens)
            {
                await eachAsync(tokens.darknesses[key] || tokens.darknesses.default, async (l, variant) =>
                {
                    await FileGenerator.write(generator.output, `\t--${key}-${CssStyleHandler.normalize(variant)}: hsl(from var(--${key}) h s ${l.$value});\n`);
                })
            }
        }
    })
    await FileGenerator.write(generator.output, '}\n\n');

    await eachAsync(tokens.colors, async (value, key) =>
    {
        key = CssStyleHandler.normalize(key);
        if (['$type', '$description', '$extensions', '$deprecated'].includes(key))
            return;
        await FileGenerator.write(generator.output, `.text-${key} { color:var(--${key}); }\n`);
        await FileGenerator.write(generator.output, `.bg-${key} { background-color:var(--${key}); }\n`);

        if ('lightnesses' in tokens)
        {
            await eachAsync(tokens.lightnesses[key] || tokens.lightnesses.default, async (l, variant) =>
            {
                variant = CssStyleHandler.normalize(variant);
                await FileGenerator.write(generator.output, `.text-${key}-${variant} { color:var(--${key}-${variant}); }\n`);
                await FileGenerator.write(generator.output, `.bg-${key}-${variant} { background-color:var(--${key}-${variant}); }\n`);
            })
        }
        if ('darknesses' in tokens)
        {
            await eachAsync(tokens.darknesses[key] || tokens.darknesses.default, async (l, variant) =>
            {
                variant = CssStyleHandler.normalize(variant);
                await FileGenerator.write(generator.output, `.text-${key}-${variant} { color:var(--${key}-${variant}); }\n`);
                await FileGenerator.write(generator.output, `.bg-${key}-${variant} { background-color:var(--${key}-${variant}); }\n`);
            })
        }
    })



    await new Promise(resolve => generator.output.end(resolve));
}

await generateCss(fileURLToPath(import.meta.resolve('../../default-theme.tokens.json')), 'variables.css');

function isValidDesignFile(tokens: DTCGTokenGroup, errors: Error[] = []): tokens is DTCGTokenGroup<WebUI>
{
    if (!('breakpoints' in tokens))
        errors.push(new Error('missing breakpoints'));
    if (!('colors' in tokens))
        errors.push(new Error('missing colors'));
    if (!('accent' in tokens.colors))
        errors.push(new Error('missing accent color'));
    if (!('lightnesses' in tokens))
        errors.push(new Error('missing lightnesses'));
    if (!('default' in tokens.lightnesses))
        errors.push(new Error('missing default lightnesses'));
    if (!('darknesses' in tokens))
        errors.push(new Error('missing darknesses'));
    if (!('default' in tokens.darknesses))
        errors.push(new Error('missing default darknesses'));

    return !errors.length;
}
