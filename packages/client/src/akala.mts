import { NamespaceMiddleware, xpm } from "@akala/cli";
import { FileGenerator } from "@akala/commands";
import { ErrorWithStatus, HttpStatusCode, toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from "@akala/core";
import { mkdir } from 'fs/promises';
import { join } from "path";

interface ClientState
{
    client: { preferredCase: keyof typeof caseConverters }
}

const caseConverters = { camel: toCamelCase, kebab: toKebabCase, pascal: toPascalCase, snake: toSnakeCase };

/**
 * Akala client module.
 * @module akala/client
 */
export default function (_, program: NamespaceMiddleware)
{
    const sdk = program.command('sdk client');

    /**
     * Configures preferred casing for generated files
     */
    sdk.
        command<{ case: string }>('set-preferred-case <case>', 'Set preferred casing for generated files (options: camel, pascal, kebab, snake)').
        state<ClientState>().
        action(context =>
        {
            switch (context.options.case)
            {
                case 'camel':
                case 'pascal':
                case 'kebab':
                case 'snake':
                    context.state.client.preferredCase = context.options.case;
                    break;
                default:
                    throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Unsupported case format. Use --help for valid options.');
            }
        });

    const generators = program.command('sdk new');

    /**
     * Creates new client pages
     */
    generators.command<{ name: string, path?: string }>('page <name> [path]', 'Create new client page with specified name and optional path').
        state<Partial<ClientState>>().
        action(async context =>
        {
            const caseConverter: (s: string) => string = context.state?.client?.preferredCase in caseConverters ? caseConverters[context.state.client.preferredCase] : caseConverters.kebab;
            const folder = context.options.path ? join(context.options.path, caseConverter(context.options.name)) : caseConverter(context.options.name);

            const html = await generatePage(context.options.name, folder);
            await html.output.write(`<p>This is the content of your ${context.options.name} page</p>`);
            await html.output.close();
        });

    /**
     * Initializes new Akala client project
     */
    generators.command<{ name?: string }>('client [name]', 'Initialize new Akala client project').
        state<Partial<ClientState>>().
        action(async context =>
        {
            const caseConverter: (s: string) => string = context.state?.client?.preferredCase in caseConverters ? caseConverters[context.state.client.preferredCase] : caseConverters.kebab;

            const folder = context.currentWorkingDirectory;

            await mkdir(folder, { recursive: true });

            const packagejson = await FileGenerator.outputHelper(folder, 'package.json', false, exists => !exists);
            if (!packagejson.exists)
            {
                context.logger.help(`Creating package.json file`);
                await packagejson.output.write(JSON.stringify({
                    name: context.options.name
                }));
                await packagejson.output.close();
            }

            const postcssrc = await FileGenerator.outputHelper(folder, '.postcssrc.mjs', false, exists => !exists);
            if (!postcssrc.exists)
            {
                context.logger.help(`Creating .postcssrc.mjs file`);
                await postcssrc.output.write(`import akala from "@akala/web-ui/postcss";
import fullCompose from "@akala/web-ui/postcss-full-compose";
import contrast from "@akala/web-ui/postcss-contrast";
import customMedia from "postcss-custom-media";

const config = {
    "plugins": [
        akala({ includeDefaultTheme: true, generateOptions: { customMedia: true } }),
        fullCompose(),
        contrast(),
        customMedia(),
    ]
}

export default config;`);
                await postcssrc.output.close();
            }

            const indexHtml = await FileGenerator.outputHelper(folder, 'index.html', false, (exists) =>
            {
                if (exists)
                    throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.html file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
            });

            context.logger.help(`Creating index.html file`);
            await indexHtml.output.write(`<!doctype html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Akala</title>
        <base href="/" />
    </head>
    
    <body>
        <kl-outlet data-context id="app">Splash screen</kl-outlet>
        <script type="module" src="/index.ts"></script>
    </body>
    
    </html>`);
            await indexHtml.output.close();

            const indexTs = await FileGenerator.outputHelper(folder, 'index.ts', true, (exists) =>
            {
                if (exists)
                    throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.ts file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
            });

            context.logger.help(`Creating index.ts file`);
            await indexTs.output.write(`
            /// <reference types="vite/client" />
import './index.css'
import { bootstrapModule, OutletService, outletDefinition } from '@akala/client'
import Home from './pages/home.js';
import { bootstrap } from '@akala/web-ui';


bootstrapModule.activate([[serviceModule, OutletService.InjectionToken]], async (outlet: OutletService) =>
{
    outlet.use('/', 'main', Home[outletDefinition]);
})

bootstrap('app')
`);
            await indexTs.output.close();

            const indexCss = await FileGenerator.outputHelper(folder, 'index.css', true, (exists) =>
            {
                if (exists)
                    throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.css file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
            });

            context.logger.help(`Creating index.css file`);
            await indexCss.output.write(`@import '@akala/web-ui/css/theme.css';
    @import-tokens '@akala/web-ui/default-theme.tokens.json';
    
    `);
            await indexCss.output.close();

            const tsconfig = await FileGenerator.outputHelper(folder, 'tsconfig.json', true, (exists) =>
            {
                if (exists)
                    return false;
            });

            if (!tsconfig.exists)
            {
                context.logger.help(`Creating tsconfig.json file`);
                await tsconfig.output.write(JSON.stringify({
                    "compilerOptions": {
                        "experimentalDecorators": true,
                        "rootDir": ".",
                        "outDir": "dist",
                        "resolveJsonModule": true
                    },
                    "include": [
                        "**/*.ts",
                    ]
                }));
                await tsconfig.output.close();
            }

            context.logger.help(`Creating home page in ${folder}/pages`);
            const page = await generatePage(caseConverter('Home'), join(folder, 'pages'), async ts =>
            {
                await ts.output.write(`
    public count: number = 0;

    public increment()
    {
        ObservableObject.setValue(this, 'count', this.count + 1);
    }
        `);
            });
            await page.output.write(`<h1>Welcome to your ${context.options.name} app</h1>        
    <div class="card" data-context>
        <button id="counter" on on-click="controller.increment.bind(controller)" type="button">
            count is <span data-bind="{innerText:controller.count}"></span>
        </button>
    </div>
    `);
            await page.output.close();

            const pm = await xpm(folder);
            context.logger.help(`Installing dependencies using ${pm.name}...`);
            await pm.install('vite');
            await pm.install('@akala/web-ui');
        });
}

/**
 * Generates client page structure with template and TypeScript files
 * @param name Page name
 * @param folder Target directory path
 * @param callback additionalTsContent Optional to add custom TS code
 * @returns HTML file generator instance
 */
export async function generatePage(name: string, folder: string, additionalTsContent?: (ts: FileGenerator.Generator) => Promise<void>): Promise<FileGenerator.Generator>
{
    await mkdir(folder, { recursive: true });

    const tsGenerator = await FileGenerator.outputHelper(folder, name + '.ts', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    });

    await tsGenerator.output.write(`import { Page, page, RootElement } from '@akala/client'
import template from './${name}.html?raw'

@page({ template, 'inject': [RootElement] })
export default class ${toPascalCase(name)} extends Page
{
    constructor(el: HTMLElement)
    {
        super(el);
    }
`);

    await additionalTsContent?.(tsGenerator).catch(e =>
        tsGenerator.output.write(`// FileGeneration failed with error: ${e}`)
    );

    await tsGenerator.output.write('}');

    const htmlGenerator = await FileGenerator.outputHelper(folder, name + '.html', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    });

    return htmlGenerator;
}
