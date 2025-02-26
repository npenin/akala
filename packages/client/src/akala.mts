import { NamespaceMiddleware } from "@akala/cli";
import { FileGenerator } from "@akala/commands";
import { ErrorWithStatus, HttpStatusCode, toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from "@akala/core";
import { mkdir } from 'fs/promises';
import { join } from "path";
import yarn, { hasYarn } from '@akala/cli/yarn-helper'
import npm from '@akala/cli/npm-helper'

interface ClientState
{
    client: { preferredCase: keyof typeof caseConverters }
}

const caseConverters = { camel: toCamelCase, kebab: toKebabCase, pascal: toPascalCase, snake: toSnakeCase };

export default function (_, program: NamespaceMiddleware)
{
    const sdk = program.command('sdk client');

    sdk.
        command<{ case: string }>('set-preferred-case <case>', 'helps you following the same structure for generated file by choosing your prefered casing between: camel, pascal, kebab and snake.').
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
                    throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The provided case is not supported, please use --help for usage.')
            }
        })

    const generators = program.command('sdk new');

    generators.command<{ name: string, path?: string }>('page <name> [path]').state<Partial<ClientState>>().action(async context =>
    {
        const caseConverter: (s: string) => string = context.state?.client?.preferredCase in caseConverters ? caseConverters[context.state.client.preferredCase] : caseConverters.kebab;
        const folder = context.options.path ? join(context.options.path, caseConverter(context.options.name)) : caseConverter(context.options.name);

        const html = await generatePage(context.options.name, folder);
        await FileGenerator.write(html.output, `<p>This is the content of your ${context.options.name} page</p>`);
        await FileGenerator.close(html.output);
    });

    generators.command<{ name: string, path?: string }>('client <name> [path]').state<Partial<ClientState>>().action(async context =>
    {
        const caseConverter: (s: string) => string = context.state?.client?.preferredCase in caseConverters ? caseConverters[context.state.client.preferredCase] : caseConverters.kebab;

        const folder = context.options.path ? join(context.options.path, caseConverter(context.options.name)) : caseConverter(context.options.name);

        await mkdir(folder, { recursive: true });

        const packagejson = await FileGenerator.outputHelper(folder, 'package.json', true, exists => !exists);
        if (!packagejson.exists)
        {
            await FileGenerator.write(packagejson.output, JSON.stringify({
                name: context.options.name
            }));
            await FileGenerator.close(packagejson.output);
        }


        const postcssrc = await FileGenerator.outputHelper(folder, '.postcssrc.mjs', true, exists => !exists);
        if (!postcssrc.exists)
        {
            await FileGenerator.write(postcssrc.output, `import akala from "@akala/web-ui/postcss";
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
            await FileGenerator.close(postcssrc.output);
        }



        const indexHtml = await FileGenerator.outputHelper(folder, 'index.html', true, (exists) =>
        {
            if (exists)
                throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.html file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
        })

        await FileGenerator.write(indexHtml.output, `<!doctype html>
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

        await FileGenerator.close(indexHtml.output);


        const indexTs = await FileGenerator.outputHelper(folder, 'index.ts', true, (exists) =>
        {
            if (exists)
                throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.ts file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
        })

        await FileGenerator.write(indexTs.output, `
            /// <reference types="vite/client" />
import './index.css'
import { bootstrapModule, OutletService, outletDefinition } from '@akala/client'
import Home from './pages/home.js';
import { bootstrap } from '@akala/web-ui';


bootstrapModule.activate(['services.$outlet'], async (outlet: OutletService) =>
{
    outlet.use('/', 'main', Home[outletDefinition]);
})

bootstrap('app')
`);


        await FileGenerator.close(indexTs.output);

        const indexCss = await FileGenerator.outputHelper(folder, 'index.css', true, (exists) =>
        {
            if (exists)
                throw new ErrorWithStatus(HttpStatusCode.Conflict, `An index.css file already exists in the folder \`${folder}\`. Make sure your target folder is empty.`);
        })

        await FileGenerator.write(indexCss.output, `@import '@akala/web-ui/css/theme.css';
    @import-tokens '@akala/web-ui/default-theme.tokens.json';
    
    `);
        await FileGenerator.close(indexCss.output);

        const tsconfig = await FileGenerator.outputHelper(folder, 'tsconfig.json', true, (exists) =>
        {
            if (exists)
                return false;
        });

        if (!tsconfig.exists)
        {
            await FileGenerator.write(tsconfig.output, JSON.stringify({
                "compilerOptions": {
                    "experimentalDecorators": true,
                    "rootDir": ".",
                    "outDir": "dist",
                    "resolveJsonModule": true
                },
                "include": [
                    "**/*.ts",
                ]
            }))

            await FileGenerator.close(tsconfig.output);
        }

        const page = await generatePage(caseConverter('Home'), join(folder, 'pages'), async ts =>
        {
            await FileGenerator.write(ts.output, `
    public count: number = 0;

    public increment()
    {
        ObservableObject.setValue(this, 'count', this.count + 1);
    }
        `)
        });
        await FileGenerator.write(page.output, `<h1>Welcome to your ${context.options.name} app</h1>        
    <div class="card" data-context>
        <button id="counter" on on-click="controller.increment.bind(controller)" type="button">
            count is <span data-bind="{innerText:controller.count}"></span>
        </button>
    </div>
    `);
        await FileGenerator.close(page.output);

        if (await hasYarn())
        {
            await FileGenerator.outputHelper(folder, 'yarn.lock', false).then((lockfile) =>
            {
                if (!lockfile.exists)
                    FileGenerator.close(lockfile.output);

            }, () => { });

            await yarn.install('vite', folder);
        }
        else
            await npm.install('vite', folder);

    })

}

export async function generatePage(name: string, folder: string, additionalTsContent?: (ts: FileGenerator.Generator) => Promise<void>): Promise<FileGenerator.Generator>
{

    await mkdir(folder, { recursive: true });

    const tsGenerator = await FileGenerator.outputHelper(folder, name + '.ts', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    })

    await FileGenerator.write(tsGenerator.output, `import { Page, page, RootElement } from '@akala/client'
import template from './${name}.html?raw'
import { ObservableObject } from '@akala/core';

@page({ template, 'inject': [RootElement] })
export default class ${toPascalCase(name)} extends Page
{
    constructor(private el: HTMLElement)
    {
        super();
    }

`);

    await additionalTsContent?.(tsGenerator).catch(e =>
        FileGenerator.write(tsGenerator.output, `FileGeneration failed with error ${e}`)
    );

    await FileGenerator.write(tsGenerator.output, '}');


    const htmlGenerator = await FileGenerator.outputHelper(folder, name + '.html', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    })

    return htmlGenerator;

}