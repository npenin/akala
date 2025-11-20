import type { Loader, LoaderResult, Resolver } from '../../index.js';
import fs from 'node:fs'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import { protocolParser } from '../protocol/multi-protocol.js'
import { logger as coreLogger } from '@akala/core'
import { inspectOpts } from 'debug'


inspectOpts.colors = true;

const logger = coreLogger.use('hook:ts')

type CacheItem = {
    source: string,
    sourceFile: ts.SourceFile,
    imports: ts.ImportDeclaration[],
    exports: (ts.ExportDeclaration | ts.FunctionDeclaration | ts.VariableStatement)[]
    resources: string[];
    modules: string[];
    content: string
}

const cache: Record<string, Promise<CacheItem>> = {};

const printer = ts.createPrinter();

export const resolve: Resolver = async function (specifier: string, context, nextResolve)
{
    const parseResult = protocolParser.exec(specifier);
    if (parseResult)
    {
        const protocols = parseResult[1].split('+')
        const depTreeIndex = protocols.indexOf('dependency-tree');
        if (depTreeIndex > -1)
        {
            if (!context.importAttributes)
                context.importAttributes = {};
            if (context.importAttributes.type)
                throw new Error('there is already a type ' + context.importAttributes.type);
            context.importAttributes.type = 'dependency-tree';
            if (protocols.length == 1)
                specifier = parseResult[2];
            else
            {
                protocols.splice(depTreeIndex, 1)
                specifier = protocols.join('+') + ':' + parseResult[2];
            }
            logger.debug(`resolving ${specifier} for ${context.importAttributes.type}`)
            const resolved = await resolve(specifier, context, nextResolve);
            logger.silly({ ...resolved, importAttributes: context.importAttributes });
            return { ...resolved, importAttributes: context.importAttributes };
        }
    }

    if (context.parentURL && context.parentURL in cache)
    {
        if (specifier.endsWith('.js'))
            try
            {
                const url = new URL(specifier, context.parentURL);
                if (url.protocol == 'file:')
                    await fs.promises.access(fileURLToPath(url));
                return nextResolve(specifier, context);
            }
            catch (e)
            {
                if (e.code !== 'ENOENT')
                    throw e;

                return nextResolve(specifier.replace('.js', '.ts'), context)
            }
    }

    return nextResolve(specifier, context);
}

export async function parse(pathOrSpecifier: { path?: string, specifier: string }, content?: string, callback?: (x: CacheItem) => Promise<void> | void)
{
    if (cache[pathOrSpecifier.specifier] && (!content || (await cache[pathOrSpecifier.specifier]).content == content))
        return cache[pathOrSpecifier.specifier];

    if (cache[pathOrSpecifier.specifier] && content)
        console.warn('The file content has changed. Caching new content for further loads...', pathOrSpecifier)

    return cache[pathOrSpecifier.specifier] = parseWithoutCache(pathOrSpecifier, content).then(async x =>
    {
        if (callback)
            await callback(x);
        return x;
    });
}

export async function parseWithoutCache(pathOrSpecifier: { path?: string, specifier: string }, content?: string)
{
    logger.debug(pathOrSpecifier)
    if (!pathOrSpecifier.path)
        pathOrSpecifier.path = fileURLToPath(pathOrSpecifier.specifier);

    const path = pathOrSpecifier.path;

    if (!content)
        content = await fs.promises.readFile(path, 'utf-8');

    const program = ts.createSourceFile(
        path,
        content,
        { languageVersion: ts.ScriptTarget.Latest }
    );

    const imports: ts.ImportDeclaration[] = [];
    const exports: (ts.ExportDeclaration | ts.FunctionDeclaration | ts.VariableStatement)[] = [];

    const resources: string[] = [];


    program.forEachChild(n =>
    {
        ts.visitNode(n, function (node: ts.Node): ts.VisitResult<ts.Node>
        {
            switch (true)
            {
                case ts.isImportDeclaration(node):
                    imports.push(node);
                    resources.push(JSON.parse(printer.printNode(ts.EmitHint.Expression, node.moduleSpecifier, program)));
                    break;
                case ts.isExportDeclaration(node):
                    exports.push(node);
                    if (node.moduleSpecifier)
                        resources.push(JSON.parse(printer.printNode(ts.EmitHint.Expression, node.moduleSpecifier, program)));
                    break;
                case ts.isFunctionDeclaration(node):

                    if (node.modifiers && node.modifiers.find(x => x.kind == ts.SyntaxKind.ExportKeyword))
                        exports.push({ ...node, parameters: Object.assign(node.parameters.map(p => ({ ...p, type: undefined } as ts.ParameterDeclaration)), { end: node.parameters.end, hasTrailingComma: node.parameters.hasTrailingComma, pos: node.parameters.pos }) });

                    break;
                case ts.isVariableStatement(node):

                    if (node.modifiers && node.modifiers.find(x => x.kind == ts.SyntaxKind.ExportKeyword))
                        exports.push({ ...node, declarationList: { ...node.declarationList, declarations: Object.assign(node.declarationList.declarations.map(d => ({ ...d, type: undefined })), { end: node.declarationList.declarations.end, hasTrailingComma: node.declarationList.declarations.hasTrailingComma, pos: node.declarationList.declarations.pos }) } });

                    break;

                default:
                    // console.log(ts.SyntaxKind[node.kind])
                    // console.log(printer.printNode(ts.EmitHint.Unspecified, node, program));
                    break;
            }
            return node;
        }
        )
    })

    // console.log(imports);
    // console.log(exports);



    const source = imports.map(i => printer.printNode(ts.EmitHint.Unspecified, i, program)).join('\n') + `

    ${exports.map(i => printer.printNode(ts.EmitHint.Unspecified, i, program)).join('\n')};

    export const modules = ${JSON.stringify(resources)};`;
    // console.log(source)
    return { source, sourceFile: program, imports, exports, resources, modules: resources, content }

    // maps[url] = { program, emittedFile: pathToFileURL(path.join(filePath, path.basename(specifier, ext) + '.js')) };
    // maps[maps[url].emittedFile.toString()] = { program, emittedFile: maps[url].emittedFile };
}

type ArrayItemType<T> = T extends ArrayLike<infer X> ? X : never;

export const supportedFormats: Record<string, (item: CacheItem) => LoaderResult | Promise<LoaderResult>> = {
    'module': (item: CacheItem) => ({
        format: 'module',
        shortCircuit: true,
        source: item.source
    }),
    'ast': (item: CacheItem) => ({
        format: 'json',
        shortCircuit: true,
        source: JSON.stringify(item.sourceFile.getChildren())
    }),
    'imports': (item: CacheItem) => ({
        format: 'json',
        shortCircuit: true,
        source: JSON.stringify(item.imports)
    }),
    'dependency-tree': async (item: CacheItem) =>
    {
        function getImportFruits(importDeclaration: ArrayItemType<CacheItem['imports']>)
        {
            const result = {};
            // console.log(importDeclaration)
            const importClause = importDeclaration.importClause;
            if (!importClause)
                return result;

            if (importClause.name)
                result['default'] = importClause.name.text;

            if (importClause.namedBindings)
                if (ts.isNamespaceImport(importClause.namedBindings))
                {
                    result['*'] = importClause.namedBindings.name.text;
                }
                else
                {
                    importClause.namedBindings.elements.forEach(impspec =>
                    {
                        result[impspec.propertyName?.text || impspec.name.text] = impspec.name.text;
                    })
                }
            return result;
        }

        function getExportFruits(exportDeclaration: ArrayItemType<CacheItem['exports']>)
        {
            const result = {};
            switch (true)
            {
                case ts.isExportDeclaration(exportDeclaration):
                    if (!exportDeclaration.exportClause)
                        result['*'] = '*';
                    if (ts.isNamespaceExport(exportDeclaration.exportClause))
                        result['*'] = exportDeclaration.exportClause.name.text;
                    else
                        exportDeclaration.exportClause.elements.forEach(expspec =>
                        {
                            result[expspec.propertyName?.text || expspec.name.text] = expspec.name.text;
                        })
                    break;
            }
            return result;
        }

        const source = item.modules.map((m, i) =>
        {
            try
            {
                const url = new URL(m);
                return `import deps${i} from ${JSON.stringify("dependency-tree+" + url.toString())}`;
            }
            catch (e)
            {
            }

            return `import deps${i} from ${JSON.stringify("dependency-tree:" + m)}`;
        }).join(';\n') + `
        
        const deps = {${item.modules.map((m, i) =>
            `${JSON.stringify(m)}:{
                deps:deps${i}, 
                fruits:${i < item.imports.length ? JSON.stringify(getImportFruits(item.imports[i])) : JSON.stringify(getExportFruits(item.exports[i - item.imports.length]))}
            }`)}};
        export default deps;`
        logger.data(source);
        return ({
            format: 'module',
            shortCircuit: true,
            source: source
        })
    },
}

export const load: Loader = async function (specifier, context, nextLoad)
{
    logger.debug(specifier, context)

    if (cache[specifier])
        return cache[specifier].then(x => supportedFormats[context.importAttributes?.type as string || 'module'](x));

    if (context.importAttributes?.type && !(context.importAttributes.type as string in supportedFormats))
        return nextLoad(specifier, context);

    const path = fileURLToPath(specifier);
    const x = await parse({ specifier, path });

    return supportedFormats[context.importAttributes?.type as string || 'module'](x);
}

// export const load: Loader = async function (url, context, nextLoad)
// {
//     if (context.format === 'ts')
//     {

//         return {
//             format: 'module',
//             shortCircuit: true,
//             source: program.emit()
//         }
//     }

// return nextLoad(url, context);
// }
