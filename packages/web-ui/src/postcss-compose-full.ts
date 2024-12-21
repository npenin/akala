import { AtRule, Declaration, Helpers, Node, Plugin, PluginCreator, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser'
import { readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import postcss from 'postcss';

const selectorProcessor = selectorParser();

const creator: PluginCreator<{ composableClasses: Record<string, Record<string, Record<string, Rule>> | Promise<Record<string, Record<string, Rule>>>> }> = (options?: { composableClasses?: Record<string, Record<string, Record<string, Rule>> | Promise<Record<string, Record<string, Rule>>>> }) =>
{
    const composableClasses: Record<string, Record<string, Record<string, Rule>> | Promise<Record<string, Record<string, Rule>>>> = options?.composableClasses || {};
    const pluginName = 'postcss-composer-full';

    const plugin: Plugin = {
        postcssPlugin: pluginName,
        Once(root, helper)
        {
            root.walkRules(rule =>
            {
                if (rule.selectors.length == 1)
                {
                    const selector = selectorProcessor.astSync(rule.selector, { lossless: true });
                    if (selector.nodes.length == 1 && selector.first.length == 1 && selector.first.first.type == 'class')
                    {
                        // console.log({ from: rule.source.input.from, mapFile: rule.source.input.map?.file, file: rule.source.input.file });
                        if (!composableClasses[rule.source?.input.from ?? ''])
                            composableClasses[rule.source?.input.from ?? ''] = {};
                        if (!composableClasses[rule.source?.input.from ?? ''][selector.first.first.value])
                            composableClasses[rule.source?.input.from ?? ''][selector.first.first.value] = {};

                        composableClasses[rule.source?.input.from ?? ''][selector.first.first.value][getMediaQuery(rule)] = rule;
                    }
                }
            });
        },
        Rule(rule, helper)
        {
            if (rule.selectors.length == 1)
            {
                const selector = selectorProcessor.astSync(rule.selector, { lossless: true });
                if (selector.nodes.length == 1 && selector.first.length == 1 && selector.first.first.type == 'class')
                {
                    // console.log({ from: rule.source.input.from, mapFile: rule.source.input.map?.file, file: rule.source.input.file });
                    if (!composableClasses[rule.source?.input.from ?? ''])
                        composableClasses[rule.source?.input.from ?? ''] = {};
                    if (!composableClasses[rule.source?.input.from ?? ''][selector.first.first.value])
                        composableClasses[rule.source?.input.from ?? ''][selector.first.first.value] = {};

                    composableClasses[rule.source?.input.from ?? ''][selector.first.first.value][getMediaQuery(rule)] = rule;
                }
            }
            // },
            // AtRule: {
            //     async import(rule: AtRule, helper: Helpers)
            //     {
            //         console.log(rule);
            //     }
        },
        Declaration: {
            async composes(decl: Declaration, helper: Helpers)
            {
                const externalFile = decl.value.match(/([\w-]+) from ((?:'[^\']+')|(?:"[^\"]+"))/);
                // console.log(composableClasses)
                let composableLocalClasses: Record<string, Rule>;

                if (externalFile)
                {
                    externalFile[2] = externalFile[2].replaceAll(externalFile[2][0], '');
                    externalFile[2] = resolve(dirname(decl.source.input.from), externalFile[2]);
                    if (!composableClasses[externalFile[2]])
                    {

                        await (composableClasses[externalFile[2]] = new Promise(async resolve =>
                        {
                            const innerOptions = { composableClasses: { ...composableClasses, [externalFile[2]]: null } };
                            // const externalRoot = 
                            (await (postcss(creator(innerOptions)).process(await readFile(externalFile[2]), { from: externalFile[2] })).async());
                            // externalRoot.root.walkRules(rule => plugin.Rule(rule, helper));
                            Object.assign(composableClasses, innerOptions.composableClasses);

                            resolve(innerOptions.composableClasses[externalFile[2]]);

                            helper.result.messages.push({
                                type: 'dependency',
                                plugin: pluginName,
                                file: externalFile[2],
                                parent: helper.result.opts.from
                            })

                        }));
                        composableLocalClasses = composableClasses[externalFile[2]][externalFile[1]]
                        Object.entries(composableLocalClasses).forEach(([mediaQuery, rule]) =>
                        {
                            if (!mediaQuery)
                                decl.root().append(rule);
                            else
                            {
                                decl.root().append(helper.atRule({
                                    name: 'media',
                                    params: mediaQuery,
                                    nodes: [rule]
                                }))
                            }
                        })
                    }
                    else
                        composableLocalClasses = (composableClasses[externalFile[2]])[externalFile[1]]
                }
                else
                    composableLocalClasses = composableClasses[decl.source?.input.file ?? ''][decl.value]
                if (composableLocalClasses)
                {
                    const mediaQuery = getMediaQuery(decl.parent)
                    if (composableLocalClasses[mediaQuery])
                    {
                        composableLocalClasses[mediaQuery].assign({
                            selectors: [composableLocalClasses[mediaQuery].selectors].concat(buildSelectors(decl.parent)),
                        });
                    }
                    else //edge case and loop over all media queries to extend each
                    {
                        Object.entries(composableLocalClasses).forEach(e =>
                        {
                            e[1].assign({
                                selectors: [e[1].selectors].concat(buildSelectors(decl.parent)),
                            });
                        })
                    }
                    decl.remove();
                }
            }
        }
    };

    return plugin;
}

creator.postcss = true;

export default creator;

function getMediaQuery(item: Node): string
{
    if (isRule(item))
    {
        if (isRule(item.parent) || isAtRule(item.parent))
            return getMediaQuery(item.parent);
        else
            return '';
    }
    if (isAtRule(item))
    {
        if (isRule(item.parent) || isAtRule(item.parent))
        {
            const parentParams = getMediaQuery(item.parent);
            if (parentParams)
                return item.params + ' and ' + parentParams;
            return item.params;
        }
        return item.params;
    }
}

function buildSelectors(item: Node): string[]
{
    if (isRule(item))
    {
        if (isRule(item.parent) || isAtRule(item.parent))
        {
            const parentSelecors = buildSelectors(item.parent);
            return item.selectors.map(x => parentSelecors + ' ' + x);
        }
        else
            return item.selectors;
    }
    if (isAtRule(item))
    {
        if (isRule(item.parent))
            return buildSelectors(item.parent);
        if (isAtRule(item.parent))
            return buildSelectors(item.parent);
        return [''];
    }
}


function isRule(node: Node): node is Rule
{
    return node.type == 'rule';
}
function isAtRule(node: Node): node is AtRule
{
    return node.type == 'atrule';
}