import { BinaryOperator } from '@akala/core/expressions';
import type { Node, PluginCreator } from 'postcss';
import valueParser from 'postcss-value-parser';

type PluginOptions = {
}

type ColorTuple = [number, number, number]

const valueFunctionName = 'max-contrast';
function srgbToLinear(c)
{
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number)
{
    r = srgbToLinear(r / 255);
    g = srgbToLinear(g / 255);
    b = srgbToLinear(b / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Helper function to calculate contrast ratio
function contrastRatio(l1: number, l2: number)
{
    return (l1 + 0.05) / (l2 + 0.05);
}


// Convert HEX color to RGB
function hexToRgb(hex: string): ColorTuple
{
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3)
    {
        const [r, g, b] = cleanHex.split("").map((ch) => parseInt(ch + ch, 16));
        return [r, g, b];
    } else if (cleanHex.length === 6)
    {
        const r = parseInt(cleanHex.slice(0, 2), 16);
        const g = parseInt(cleanHex.slice(2, 4), 16);
        const b = parseInt(cleanHex.slice(4, 6), 16);
        return [r, g, b];
    }
    throw new Error(`Invalid HEX color: ${hex}`);
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number)
{
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r: number, g: number, b: number;
    if (h < 1 / 6) [r, g, b] = [c, x, 0];
    else if (h < 2 / 6) [r, g, b] = [x, c, 0];
    else if (h < 3 / 6) [r, g, b] = [0, c, x];
    else if (h < 4 / 6) [r, g, b] = [0, x, c];
    else if (h < 5 / 6) [r, g, b] = [x, 0, c];
    else[r, g, b] = [c, 0, x];

    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)] as ColorTuple;
}

function resolveVariable(variable: valueParser.Node, variables: Record<string, valueParser.ParsedValue>)
{
    valueParser.walk([variable], node =>
    {
        if (node.type == 'function' && node.value == 'var')
        {
            if (node.nodes.length == 3 && !(node.nodes[0].value in variables))
            {
                // console.log(node.nodes[2])
                node.value = resolveVariable(node.nodes[2], variables).value
            }
            else if (node.nodes[0].value in variables)
                node.value = resolveVariable(variables[node.nodes[0].value].nodes[0], variables).value
            else
            {
                // console.log(variables[node.nodes[0].value])
                throw new Error(`unknown variable ${JSON.stringify(node.nodes)}`);
            }
            node.type = 'word' as any;
            delete node.nodes;
            return true;
        }
    });
    return variable;
}

// Parse and convert color into RGB
function parseColor(color: valueParser.Node, variables: Record<string, valueParser.ParsedValue>): ColorTuple
{
    if (color.type == 'word' && color.value.startsWith("#"))
    {
        return hexToRgb(color.value);
    }

    if (color.type == 'function')
        if (color.value == 'rgb')
        {
            if (color.nodes[0].type == 'word' && color.nodes[0].value == 'from')
                return resolveRelativeRbg(color.nodes, variables);
            else
                return color.nodes.filter(n => n.type != 'div').map(n => Number(resolveVariable(n, variables).value)) as ColorTuple;
        }
        else if (color.value == 'hsl')
        {

            if (color.nodes[0].type == 'word' && color.nodes[0].value == 'from')
                return resolveRelativeHsl(color.nodes, variables);
            else
                return hslToRgb(...color.nodes.filter(n => n.type != 'div').map(n => Number(resolveVariable(n, variables).value)) as ColorTuple);
        }
    throw new Error(`Unsupported color format: ${color}`);
}

function transform<U extends keyof T, T extends Node & { [key in U]: string }>(variables: Record<string, valueParser.ParsedValue>, item: T, property: U)
{
    if (!item[property].toLowerCase().includes(valueFunctionName))
        return;

    const parsedValue = valueParser(item[property]);
    const modifiedValue = parsedValue.walk(node =>
    {
        if (node.type == 'function' && node.value == valueFunctionName)
        {
            const [base, color1, color2] = node.nodes.filter(n => n.type !== 'div');

            // Resolve variables if needed
            const baseColor = resolveVariable(base, variables);
            const color1Value = resolveVariable({ ...color1 }, variables);
            const color2Value = resolveVariable({ ...color2 }, variables);

            // Parse resolved colors
            const baseRgb = parseColor(baseColor, variables);
            const color1Rgb = parseColor(color1Value, variables);
            const color2Rgb = parseColor(color2Value, variables);

            // Calculate luminance
            const baseLum = relativeLuminance(...baseRgb);
            const lum1 = relativeLuminance(...color1Rgb);
            const lum2 = relativeLuminance(...color2Rgb);

            // Determine the best-contrasted color
            const contrast1 = baseLum > lum1 ? contrastRatio(baseLum, lum1) : contrastRatio(lum1, baseLum);
            const contrast2 = baseLum > lum2 ? contrastRatio(baseLum, lum2) : contrastRatio(lum2, baseLum);

            const newNode = contrast1 > contrast2 ? color1 : color2;
            // console.log(newNode);
            Object.assign(node, newNode);
            return true;
        }
    }).toString()

    if (modifiedValue === item[property])
    {
        return;
    }

    // console.log(`replacing ${item[property]} with ${modifiedValue}`)
    item.assign({ [property]: modifiedValue })
    // item[property] = modifiedValue as T[U];
}

const pluginName = '@akala/web-ui/postcss'

const creator: PluginCreator<PluginOptions> = (options?: Partial<PluginOptions>) =>
{
    const variables: Record<string, valueParser.ParsedValue> = {};

    return {
        postcssPlugin: pluginName,
        async Once(root, postcssHelpers): Promise<void>
        {
            root.walkDecls((decl) =>
            {
                if (decl.prop.startsWith("--"))
                {
                    variables[decl.prop] = valueParser(decl.value);
                }
            });

        },
        Declaration(decl, { result }): void
        {
            if (decl.value.includes(`${valueFunctionName}(`))
            {
                transform(variables, decl, 'value')
            }
        },
    };
};

creator.postcss = true;

export default creator;

export function unquote(params: string): string
{
    if (params[0] == params[params.length - 1])
        return params.slice(1, params.length - 1).replaceAll('\\' + params[0], params[0]);
}

function resolveRelativeRbg(values: valueParser.Node[], variables: Record<string, valueParser.ParsedValue>): ColorTuple
{
    if (values[0].type == 'word' && values[0].value !== 'from')
        throw new Error('Invalid relgative RGB: ' + JSON.stringify(values, null, 4));

    const baseColor = parseColor(resolveVariable(values[1], variables), variables);

    var rgb: ColorTuple = [0, 0, 0];
    var index = 0;
    const colorIndexes = 'rgb'

    valueParser.walk(values.slice(2), node =>
    {
        if (values.indexOf(node) > -1)
            index = values.indexOf(node);

        if (node.type == 'word')
            if (colorIndexes[index] == node.value)
                rgb[index] = baseColor[index]
            else
                throw new Error('unknown word ' + node.value);
        else throw new Error('not implemented yet ' + JSON.stringify(node, null, 4));
    })

    return rgb;

}

function resolveRelativeHsl(values: valueParser.Node[], variables: Record<string, valueParser.ParsedValue>): ColorTuple
{
    if (values[0].type == 'word' && values[0].value !== 'from')
        throw new Error('Invalid relgative HSL: ' + JSON.stringify(values, null, 4));

    const baseColor = rgbToHsl(...parseColor(resolveVariable(values[1], variables), variables));


    var hsl: ColorTuple = [0, 0, 0];
    var index = 0;
    const colorIndexes = 'hsl'

    valueParser.walk(values.slice(2), node =>
    {
        if (values.indexOf(node) > -1)
            index = values.indexOf(node);

        if (node.type == 'word')
            if (colorIndexes[index] == node.value)
                hsl[index] = baseColor[index]
            else
                throw new Error('unknown word ' + node.value);
        else throw new Error('not implemented yet ' + JSON.stringify(node, null, 4));
    })

    const adjustedH = (hsl[0] + 360) % 360; // Normalize to 0-360
    const adjustedS = Math.min(100, Math.max(0, hsl[1])); // Clamp to 0-100
    const adjustedL = Math.min(100, Math.max(0, hsl[2])); // Clamp to 0-100

    return hslToRgb(adjustedH, adjustedS, adjustedL);
}


// Convert RGB to HSL
function rgbToHsl(...[r, g, b]: ColorTuple)
{
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0)
    {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h *= 60;
    }
    if (h < 0) h += 360;

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

// Evaluate `calc()` expressions
export function evaluateCalc(expression: valueParser.FunctionNode, indices: 'rgb' | 'hsl', baseValues: ColorTuple, variables: Record<string, valueParser.ParsedValue>)
{
    let result = 0;
    let op: BinaryOperator;
    for (let i = 0; i < expression.nodes.length; i++)
    {
        const n = expression.nodes[i];
        if (n.type == 'word')
            if (indices.indexOf(n.value) > -1)
                if (typeof op == 'undefined')
                    result = baseValues[indices.indexOf(n.value)];
                else
                    switch (op)
                    {
                        case BinaryOperator.Minus:
                            result -= baseValues[indices.indexOf(n.value)];
                            break;
                        case BinaryOperator.Plus:
                            result += baseValues[indices.indexOf(n.value)];
                            break;
                        case BinaryOperator.Modulo:
                            result %= baseValues[indices.indexOf(n.value)];
                            break;
                        case BinaryOperator.Div:
                            result /= baseValues[indices.indexOf(n.value)];
                            break;
                        case BinaryOperator.Times:
                            result *= baseValues[indices.indexOf(n.value)];
                            break;
                        case BinaryOperator.Pow:
                            result ^= baseValues[indices.indexOf(n.value)];
                            break;
                        default:
                            throw new Error('Not supported operator: ' + BinaryOperator[op]);
                    }
            else
            {
                throw new Error('Not supported operand: ' + n.value);
            }
        else
        {
            throw new Error('Not supported type: ' + n.value);
        }
    }
    return result;
}
