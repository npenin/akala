import { AnyNode, AtRule, Declaration, Helpers, Node, Plugin, PluginCreator, Root, Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser'
import { readFile } from 'fs/promises'
import postcss from 'postcss';
import { unquote } from './postcss-dtcg.js';
import { lazy, sequencify, Task } from '@akala/core';
import { dirname, resolve } from 'path/posix';
import { fileURLToPath } from 'url';

const selectorProcessor = selectorParser();

type ComposableClasses = Record<string, Record<string, LocalComposableClass> | Promise<Record<string, LocalComposableClass>>>;
type LocalComposableClass = Record<string, { taskId: string, main: Rule, sub: Rule[], composedBy: Rule[] }>;

const creator: PluginCreator<{ composableClasses: ComposableClasses }> = (options?: { composableClasses?: ComposableClasses, tasks?: Record<string, Task & { rule: LocalComposableClass[''] }> }) =>
{
    const composableClasses: ComposableClasses = options?.composableClasses || {};
    const pluginName = 'postcss-composer-full';
    const nonLoadedFiles: Record<string, { selector: string, loadedBy: string[] }[]> = {};
    const tasks: Record<string, Task & { rule: LocalComposableClass[''] }> = options?.tasks || {}

    const plugin: Plugin = {
        postcssPlugin: pluginName,
        Once(root: Root, helper: Helpers)
        {
            const composableRules: LocalComposableClass[''][] = [];
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
                        if (!composableClasses[rule.source?.input.from ?? '']['.' + selector.first.first.value])
                            composableClasses[rule.source?.input.from ?? '']['.' + selector.first.first.value] = {};

                        const privateRule = composableClasses[rule.source?.input.from ?? '']['.' + selector.first.first.value][getMediaQuery(rule)] = {
                            main: rule,
                            sub: [],
                            composedBy: [],
                            taskId: getTaskId(rule)
                        }
                        composableRules.push(privateRule);

                        tasks[privateRule.taskId] = {
                            dep: privateRule.sub.map(getTaskId),
                            rule: privateRule
                        };
                    }
                }
                else
                {
                    let parentRule = getParentOfType(rule, 'rule', parentRule => !!composableRules.find(cr => cr.main === parentRule))
                    if (parentRule)
                    {
                        const composableRule = composableRules.find(cr => cr.main === parentRule);
                        composableRule.sub.push(rule);

                        // console.log(rule.source.input.from)
                        const selectors = buildSelectors(rule);

                        const privateRule = {
                            main: rule,
                            sub: [],
                            composedBy: [],
                            taskId: getTaskId(rule)
                        }
                        // if (!tasks[privateRule.taskId])
                        //     tasks[privateRule.taskId] = { dep: [composableRule.taskId], rule: privateRule }
                        // tasks[composableRule.taskId].dep.push(privateRule.taskId);

                        selectors.push(selectors.join(','))
                        selectors.forEach(selector =>
                        {
                            if (!composableClasses[rule.source.input.from ?? ''][selector])
                                composableClasses[rule.source.input.from ?? ''][selector] = {};

                            composableClasses[rule.source?.input.from ?? ''][selector][getMediaQuery(rule)] = privateRule

                            tasks[privateRule.taskId] = {
                                dep: [composableRule.taskId],
                                rule: privateRule
                            };


                        })
                    }
                }
            })

            // console.log(Object.entries(composableClasses[root.source.input.from]).filter(e => Object.entries(e[1]).find(e => !Array.isArray(e[1]))))
        },
        Rule(rule: Rule)
        {
            const taskId = getTaskId(rule);
            if (tasks[taskId])
            {
                let parentRule = rule;
                const taskList = lazy(() => Object.values(tasks))

                while ((parentRule = getParentOfType(parentRule, 'rule')))
                {
                    const parentTask = taskList().find(t => t.rule.main == parentRule);
                    if (!parentTask)
                    {
                        // console.log('There is no such task for %o', parentRule)
                        continue;
                    }
                    if (!tasks[taskId].dep.includes(parentTask.rule.taskId))
                    {
                        // console.log(`adding ${parentTask.rule.taskId} as dependent on ${taskId}`)
                        tasks[taskId].dep.push(parentTask.rule.taskId);
                    }
                    // tasks[taskId].dep.push(parentTask.rule.taskId)
                    // tasks[parentTask.rule.taskId].dep.push(taskId);
                }
            }
            //     if (rule.selectors.length == 1)
            //     {
            //         const selector = selectorProcessor.astSync(rule.selector, { lossless: true });
            //         if (selector.nodes.length == 1 && selector.first.length == 1 && selector.first.first.type == 'class')
            //         {
            //             // console.log({ from: rule.source.input.from, mapFile: rule.source.input.map?.file, file: rule.source.input.file });
            //             if (!composableClasses[rule.source?.input.from ?? ''])
            //                 composableClasses[rule.source?.input.from ?? ''] = {};
            //             if (!composableClasses[rule.source?.input.from ?? ''][selector.first.first.value])
            //                 composableClasses[rule.source?.input.from ?? ''][selector.first.first.value] = {};

            //             composableClasses[rule.source?.input.from ?? ''][selector.first.first.value][getMediaQuery(rule)] = [rule];
            //         }
            //     }
            //     // },
            //     // AtRule: {
            //     //     async import(rule: AtRule, helper: Helpers)
            //     //     {
            //     //         console.log(rule);
            //     //     }
        },
        Declaration: {
            async composes(decl: Declaration, helper: Helpers)
            {
                let externalFile: RegExpExecArray;
                const composeRE = /([\w-]+)(?:\s+from\s+((?:'[^\']+')|(?:"[^\"]+")|(?:global)))?/g;
                const mediaQuery = getMediaQuery(decl.parent)
                const selectors = buildSelectors(decl.parent);
                const taskId = [decl.source.input.file, selectors.join(','), mediaQuery].join(':')
                // const topMostContainingRule = topMost<Rule>(decl, 'rule');
                // const topMostTask = Object.values(tasks).find(task => task.rule.main == topMostContainingRule);

                let firstRun = true;
                do
                {
                    externalFile = composeRE.exec(decl.value);
                    if (firstRun && externalFile?.index > 0)
                        decl.warn(helper.result, `invalid value ${decl.value} before ${externalFile[0]}`)
                    firstRun = false;

                    // console.log(externalFile);
                    // console.log(composableClasses)
                    // let composableLocalClasses: LocalComposableClass;

                    if (!externalFile)
                    {
                        decl.error('invalid composition');
                        continue;
                    }

                    const selector = '.' + externalFile[1];
                    const unquoted = externalFile[2] && unquote(externalFile[2])

                    const filePath = externalFile[2] ? externalFile[2] == 'global' ? 'global' : unquoted.startsWith('.') ? resolve(dirname(decl.source.input.from), unquoted) : fileURLToPath(import.meta.resolve(unquoted)) : decl.source.input.from;
                    const refTaskIds = [[filePath, selector, ''].join(':')]

                    if (filePath == 'global')
                    {
                        decl.warn(helper.result, 'compose from global not yet supported');
                        continue;
                    }

                    if (!composableClasses[filePath])
                    {
                        nonLoadedFiles[filePath] = [];
                        await (composableClasses[filePath] = new Promise(async resolve =>
                        {
                            const innerOptions = { composableClasses: { ...composableClasses, [filePath]: null }, tasks };
                            // const externalRoot = 
                            // console.log(decl.source.input.from);
                            // console.log(filePath);
                            (await (postcss(creator(innerOptions)).process(await readFile(filePath), { from: filePath })).async());
                            // externalRoot.root.walkRules(rule => plugin.Rule(rule, helper));
                            Object.assign(composableClasses, innerOptions.composableClasses);

                            helper.result.messages.push({
                                type: 'dependency',
                                plugin: pluginName,
                                file: filePath,
                                parent: helper.result.opts.from
                            })

                            resolve(innerOptions.composableClasses[filePath]);
                        }));
                    }

                    if (!tasks[taskId])
                        tasks[taskId] = { dep: refTaskIds, rule: { main: getParentOfType(decl, 'rule'), composedBy: [], sub: [], taskId: taskId } }
                    else
                        tasks[taskId].dep.push(...refTaskIds.filter(refTaskId => !tasks[taskId].dep.includes(refTaskId)))

                    refTaskIds.forEach(refTaskId => tasks[refTaskId].rule.composedBy.push(tasks[taskId].rule.main));

                    // let parentRule = getParentOfType<Rule>(decl, 'rule');
                    // const taskList = lazy(() => Object.values(tasks))

                    // if (!parentRule)
                    // {
                    //     console.error(decl)
                    //     throw new Error('weird')
                    // }
                    // while ((parentRule = getParentOfType(parentRule, 'rule')))
                    // {
                    //     const parentTask = taskList().find(t => t.rule.main == parentRule);
                    //     if (!parentTask)
                    //     {
                    //         console.log('There is no such task for %o', parentRule)
                    //         continue;
                    //     }
                    //     console.log(`adding ${taskId} as dependent on ${parentTask.rule.taskId}`)
                    //     parentTask.dep.push(taskId);
                    //     // tasks[taskId].dep.push(parentTask.rule.taskId)
                    //     // tasks[parentTask.rule.taskId].dep.push(taskId);
                    // }

                    // composableLocalClasses = (composableClasses[filePath])[selector];

                    // if (composableLocalClasses)
                    // {
                    //     if (composableLocalClasses[mediaQuery])
                    //     {
                    //         // console.log(composableClasses[filePath])
                    //         composableLocalClasses[mediaQuery].main.assign({
                    //             selectors: [composableLocalClasses[mediaQuery].main.selectors].concat(selectors),
                    //         })
                    //         // composableLocalClasses[mediaQuery].push(decl.parent as Rule);
                    //         selectors.forEach(s =>
                    //         {
                    //             if (composableClasses[decl.source.input.file][s]?.[mediaQuery])
                    //                 composableClasses[decl.source.input.file][s][mediaQuery].dependents.push(composableLocalClasses[mediaQuery].main, ...composableLocalClasses[mediaQuery].sub)
                    //             if (mediaQuery !== '' && composableClasses[decl.source.input.file][s]?.[''])
                    //                 composableClasses[decl.source.input.file][s][''].dependents.push(composableLocalClasses[mediaQuery].main, ...composableLocalClasses[mediaQuery].sub)
                    //         });

                    //         let parent: Node = decl;
                    //         while (parent = parent.parent)
                    //         {
                    //             if (parent.type == 'rule')
                    //                 buildSelectors(parent).forEach(s =>
                    //                 {

                    //                     if (composableClasses[filePath][s])
                    //                         Object.entries(composableClasses[filePath][s]).forEach(([mediaQuery, rule]: [string, LocalComposableClass['']]) =>
                    //                         {
                    //                             if (composableLocalClasses[mediaQuery])
                    //                                 composableLocalClasses[mediaQuery].dependents.push(rule.main)
                    //                         });
                    //                 });
                    //         }
                    //     }
                    //     else //edge case and loop over all media queries to extend each
                    //     {
                    //         Object.entries(composableLocalClasses).forEach(e =>
                    //         {
                    //             e[1].main.assign({
                    //                 selectors: [e[1].main.selectors].concat(selectors),
                    //             })
                    //             // e[1].push(decl.parent as Rule);
                    //         });

                    //         selectors.forEach(s =>
                    //         {
                    //             if (composableClasses[filePath][s])
                    //                 Object.values(composableClasses[filePath][s]).forEach(([mediaQuery, rule]: [string, LocalComposableClass['']]) =>
                    //                 {
                    //                     if (composableLocalClasses[mediaQuery])
                    //                         composableLocalClasses[mediaQuery].dependents.push(rule.main)
                    //                 });
                    //         })

                    //         let parent: Node = decl;
                    //         while (parent = parent.parent)
                    //         {
                    //             if (parent.type == 'rule')
                    //                 buildSelectors(parent).forEach(s =>
                    //                 {
                    //                     if (composableClasses[filePath][s])
                    //                         Object.values(composableClasses[filePath][s]).forEach(([mediaQuery, rule]: [string, LocalComposableClass['']]) =>
                    //                         {
                    //                             if (composableLocalClasses[mediaQuery])
                    //                                 composableLocalClasses[mediaQuery].dependents.push(rule.main)
                    //                         });
                    //                 });
                    //         }
                    //     }
                    // }
                    // else
                    //     decl.warn(helper.result, 'There is no such composable class ' + selector)
                }
                while (externalFile.index + externalFile[0].length < decl.value.length);
                // const { sequence, missingTasks, recursiveDependencies } = sequencify(tasks, [taskId]);

                // console.log(tasks)
                // console.log(sequence)
                // if (!sequence.length)
                // {
                //     console.log(taskId);
                //     console.log(tasks[taskId])
                //     console.log(missingTasks)
                //     console.log(recursiveDependencies)
                //     // console.log(Object.keys(tasks).filter(t => !t.startsWith('/home/nicolas/dev/akala/packages/web-ui/default-theme.tokens.json')))
                //     // console.log(Object.keys(tasks).filter(t => !t.startsWith('/home/nicolas/dev/akala/packages/web-ui/default-theme.tokens.json')))
                // }
                // sequence.forEach(subTaskId =>
                // {
                //     if (subTaskId == taskId)
                //         return;
                //     tasks[subTaskId].rule.dependents.push(tasks[taskId].rule.main, ...tasks[taskId].rule.dependents)
                //     tasks[subTaskId].rule.dependents.push(tasks[taskId].rule.main, ...tasks[taskId].rule.dependents)
                //     // if (!isNested(tasks[subTaskId].rule.main))
                //     // tasks[subTaskId].rule.main.assign({ selectors: tasks[subTaskId].rule.main.selectors.concat(selectors) })
                // })
                decl.remove();
            }
        },
        OnceExit(root: Root, helpers)
        {
            const { sequence } = sequencify(tasks, Object.keys(tasks).filter(t => tasks[t].dep.length));
            // const buttonTask = tasks['/home/nicolas/dev/akala/packages/web-ui/css/buttons.module.css:.button:hover:not(.disabled, :disabled),.button.hovered:not(.disabled):'];
            // console.log({ taskId: buttonTask.rule.taskId, dep: buttonTask.dep });

            //flatten dependcy hierarchy
            // for (let i = 0; i < sequence.length; i++)
            // const taskSequence = sequence.map(taskId => tasks[taskId]);
            // console.log(taskSequence.map(t => ({ id: t.rule.taskId, dep: t.dep })));
            for (let i = sequence.length - 1; i >= 0; i--)
            {
                const taskId = sequence[i];
                // input -> button -> button:hover -> button-hovered
                // console.log(taskId);

                // tasks[taskId].dep.forEach(dep => tasks[dep].dep.push(...tasks[dep].dep));
                tasks[taskId].rule.composedBy = tasks[taskId].rule.composedBy.map(rule => Object.values(tasks).filter(t2 => t2.rule.main == rule).map(t => [rule, ...t.rule.composedBy])).flat(2)
            }

            sequence.forEach(taskId =>
            {
                const selectors = tasks[taskId].rule.composedBy.map(r => buildSelectors(r)).flat();
                // const selectors = buildSelectors(tasks[taskId].rule.main);
                // if (taskId.includes('button') && taskId.includes('hover'))
                //     console.log(`### adding ${selectors} to ${taskId}`)
                try
                {
                    // tasks[taskId].rule.composedBy.forEach(rule =>
                    // {
                    //     rule.assign({ selectors: rule.selectors.concat(buildSelectors(tasks[taskId].rule.main)) });
                    // });
                    tasks[taskId].rule.main.assign({ selectors: tasks[taskId].rule.main.selectors.concat(selectors) });
                }
                catch (e)
                {
                    console.error(taskId);
                    console.error(e);
                    // console.log(taskId);

                    throw e;
                }
            })

            // console.log({ taskId: buttonTask.rule.taskId, dep: buttonTask.dep });
            // console.log(Object.entries(tasks).map(e => ({ id: e[0], dep: e[1].dep })).filter(t => t.id.includes('button')));


            //     console.log('root exit');
            //     debugger;
            //     for (let i = sequence.length - 1; i >= 0; i--)
            //     {
            //         const task = sequence[i];
            //         if (!tasks[task].rule)
            //             console.log(task), console.log(tasks[task]);
            //         else
            //         {
            //             tasks[task].rule.dependents.push(...tasks[task].dep.map(dep => tasks[dep].rule.main));
            //             tasks[task].dep.forEach(dep =>
            //             {
            //                 console.log(task)
            //                 console.log(dep)
            //                 if (!isNested(tasks[dep].rule.main))
            //                     tasks[dep].rule.main.assign({ selectors: tasks[dep].rule.main.selectors.concat(tasks[task].rule.main.selectors.map(s => buildSelectors(tasks[task].rule.main)).flat()) })
            //                 tasks[dep].rule.dependents.push(tasks[task].rule.main, ...tasks[task].rule.dependents);
            //             });
            //         }
            //     }

            const movedRules: Rule[] = []
            Object.entries(nonLoadedFiles).map(([filePath, file]) =>
            {
                Object.values(composableClasses[filePath]).forEach((localComposableClass: LocalComposableClass) =>
                {
                    Object.values(localComposableClass).forEach(r =>
                    {
                        if (tasks[r.taskId] && !isNested(r.main) && r.main.root().source.input.file !== root.source.input.file)
                        {
                            if (movedRules.includes(r.main))
                                return;
                            movedRules.push(r.main)
                            // console.log(`moving ${r.main.selector} from ${r.main.source.input.file} to ${root.source.input.file}`)
                            root.prepend(r.main);

                            tasks[r.taskId].dep.forEach(r =>
                            {
                                const subtask = tasks[r];
                                if (movedRules.includes(subtask.rule.main))
                                    return;
                                if (isNested(subtask.rule.main))
                                    return;
                                if (subtask.rule.main.root().source.input.file === root.source.input.file)
                                {
                                    // console.log('not moving ' + subtask.rule.taskId);
                                    // console.log(getParentOfType(subtask.rule.main, 'rule'))
                                    // console.log(subtask.rule.main.root().source.input.file, root.source.input.file)
                                    return;
                                }
                                movedRules.push(subtask.rule.main)
                                // console.log(`moving ${subtask.rule.main.selector} from ${subtask.rule.main.source.input.file} to ${root.source.input.file}`)
                                root.append(subtask.rule.main);

                            })
                            // if (tasks[r.taskId] && !isNested(r.main) && r.main.root().source.input.file !== root.source.input.file)
                            // {
                            // }
                        }
                    })
                });
            });

            // console.log(composableClasses['/home/nicolas/dev/akala/packages/web-ui/css/buttons.module.css']['.button']['']);
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
            const parentSelectors = buildSelectors(item.parent);
            return item.selectors.map(x => parentSelectors.map(parentSelector => x[0] == '&' ? parentSelector.includes('::') ? parentSelector.substring(0, parentSelector.indexOf('::')) + x.substring(1) + parentSelector.substring(parentSelector.indexOf('::')) : parentSelector + x.substring(1) : parentSelector ? parentSelector + ' ' + x : x)).flat(1);
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

function isNested(node: AnyNode): boolean
{
    return !!getParentOfType(node, 'rule');
}
function getTaskId(rule: Rule)
{
    return [rule.source.input.from, buildSelectors(rule).join(','), getMediaQuery(rule)].join(':')
}

function getParentOfType<T extends AnyNode>(rule: AnyNode, expectedType: T['type'], additionalFilter?: (node: T) => boolean): T
{
    let parent = rule.parent as T
    while (parent.type != expectedType || additionalFilter && !additionalFilter(parent as T))
    {
        if (!parent.parent || parent.parent.type == 'root')
            return null;
        parent = parent.parent as T;
    }

    return parent;
}


export function topMost<T extends AnyNode>(rule: AnyNode, expectedType: T['type'], additionalFilter?: (node: T) => boolean)
{
    let parent = rule.parent as AnyNode
    let lastMatch: T
    while (true)
    {
        if (parent.type != expectedType || !additionalFilter || !additionalFilter(parent as T))
            lastMatch = parent as T;
        if (!parent.parent || parent.parent.type == 'root')
            break;
        parent = parent.parent as AnyNode;
    }

    return lastMatch;
}

