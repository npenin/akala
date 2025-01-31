import type { AtRule, Node, Plugin, PluginCreator } from 'postcss';
import { DTCGToken, DTCGTokenGroup, GenerateCssOptions, generateCssToString } from './design-tokens.js';
// import { readFile } from 'fs/promises'
import valueParser from 'postcss-value-parser';
import postcssImport from 'postcss-import'


type PluginOptions = {
    importAtRuleName: string,
    valueFunctionName: string,
    tokenPaths?: string[],
    includeDefaultTheme?: boolean,
    generateOptions?: GenerateCssOptions,
    tokens?: DTCGTokenGroup | Promise<DTCGTokenGroup>
}
function transform<U extends keyof T, T extends Node & { [key in U]: string }>(tokens: Record<string, DTCGToken>, valueFunctionName: string, item: T, property: U)
{
    if (!item[property].toLowerCase().includes(valueFunctionName))
    {
        return;
    }

    const parsedValue = valueParser(item[property]);
    const modifiedValue = parsedValue.walk(node =>
    {
        if (node.type == 'function' && node.value == valueFunctionName)
        {
            const updatedNode = node as valueParser.Node;
            updatedNode.type = 'word';
            updatedNode.value = tokens[node[0].value].$value;
            return false;
        }
    }).toString()

    if (modifiedValue === item[property])
    {
        return;
    }

    console.log(`replacing ${item[property]} with ${modifiedValue}`)
    item.assign({ [property]: modifiedValue })
    // item[property] = modifiedValue as T[U];
}

const pluginName = '@akala/web-ui/postcss'

const creator: PluginCreator<PluginOptions> = (options?: Partial<PluginOptions>) =>
{
    if (!options)
        options = {};
    if (!options.importAtRuleName)
        options.importAtRuleName = 'import-tokens';
    if (!options.valueFunctionName)
        options.valueFunctionName = 'dtcg'

    // const options = parsePluginOptions(opts);

    return {
        postcssPlugin: pluginName,
        prepare(): Plugin
        {
            let tokens: Record<string, DTCGToken> = {};
            let importedFiles = new Set<string>();

            const importer = postcssImport({
                async load(fileName, importOptions)
                {
                    // console.log(importOptions)
                    // if (fileName == '@akala/web-ui/dtcg')
                    // {
                    //     return await generateCssFromTokensToString(expandTokens<WebUI>(mergeTokens(await options?.tokens ?? {}, ...(await Promise.all(options.tokenPaths?.map(p => this.load({ id: p }).then(mi => JSON.parse(mi.code))) ?? [])))), options.generateOptions)
                    // }
                    if (fileName.endsWith('.json'))
                    {
                        // console.log('loading ' + fileName)
                        // console.log(options.generateOptions)
                        return await generateCssToString(fileName, options.generateOptions)
                    }
                }
            })

            return {
                postcssPlugin: pluginName,
                OnceExit(): void
                {
                    tokens = null
                    importedFiles.clear();
                },
                async Once(root, postcssHelpers): Promise<void>
                {
                    if (options.includeDefaultTheme)
                    {
                        root.prepend(postcssHelpers.atRule({
                            name: 'import',
                            params: '"@akala/web-ui/default-theme.tokens.json"'
                        }))
                    }
                    // root.prepend(postcssHelpers.atRule({
                    //     name: options.importAtRuleName,
                    //     params: '"@akala/web-ui/dtcg"'
                    // }))

                    const designTokenAtRules: Array<{ filePath: string, params: string, node: AtRule }> = [];
                    root.walkAtRules((atRule) =>
                    {
                        if (atRule.name.toLowerCase() !== options.importAtRuleName)
                        {
                            return;
                        }

                        if (!atRule?.source?.input?.file)
                        {
                            return;
                        }

                        const filePath = atRule.source.input.file;
                        const params = unquote(atRule.params);
                        atRule.assign({ 'name': 'import' }).remove();

                        designTokenAtRules.push({
                            filePath: filePath,
                            params: params,
                            node: atRule,
                        });
                    });


                    for (const atRule of designTokenAtRules.values())
                    {
                        root.prepend(atRule.node)
                    }

                    await importer.Once(root, postcssHelpers);

                },
                Declaration(decl, { result }): void
                {
                    try
                    {
                        transform(tokens, options.valueFunctionName, decl, 'value');
                    }
                    catch
                    {
                        decl.warn(result, `Failed to parse and transform "${decl.value}"`);
                    }
                },
                // AtRule: {
                //     async [options.importAtRuleName](atRule, helper)
                //     {
                //         console.log('pwet')
                //         postcssImport({
                //             async load(fileName, importOptions)
                //             {
                //                 console.log(fileName)
                //                 console.log(importOptions)
                //                 if (fileName == 'virtual:dtcg')
                //                 {
                //                     return await generateCssFromTokensToString(expandTokens<WebUI>(mergeTokens(await options?.tokens ?? {}, ...(await Promise.all(options.tokenPaths?.map(p => this.load({ id: p }).then(mi => JSON.parse(mi.code))) ?? [])))), options.generateOptions)
                //                 }
                //                 if (fileName.endsWith('.json'))
                //                 {
                //                     return await generateCssToString(fileName, options.generateOptions)
                //                 }
                //             }
                //         }).Once(atRule, helper);
                //     },
                // },
            };
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
