import { NamespaceMiddleware } from "@akala/cli";
import { FileGenerator } from "@akala/commands";
import { ErrorWithStatus, HttpStatusCode, toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from "@akala/core";
import { mkdir } from 'fs/promises';
import { join } from "path";

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

        await generatePage(context.options.name, folder);
    });

    generators.command<{ name: string, path?: string }>('client <name> [path]').state<Partial<ClientState>>().action(async context =>
    {
        const caseConverter: (s: string) => string = context.state?.client?.preferredCase in caseConverters ? caseConverters[context.state.client.preferredCase] : caseConverters.kebab;

        const folder = context.options.path ? join(context.options.path, caseConverter(context.options.name)) : caseConverter(context.options.name);

        await mkdir(folder, { recursive: true });

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

        await generatePage(caseConverter('Home'), join(folder, 'pages'));

    })

}

export async function generatePage(name: string, folder: string)
{

    await mkdir(folder, { recursive: true });

    const tsGenerator = await FileGenerator.outputHelper(folder, name + '.ts', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    })

    const htmlGenerator = await FileGenerator.outputHelper(folder, name + '.html', true, (exists) =>
    {
        if (exists)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `The page ${name} already exists. Please remove it if you want a fresh one or specify a different path.`);
    })

    await FileGenerator.write(tsGenerator.output, `import { Page, page, RootElement } from '@akala/client'
import template from './${name}.html?raw'

@page({ template, 'inject': [RootElement] })
export default class ${toPascalCase(name)} extends Page
{
    constructor(private el: HTMLElement)
    {
        super();
    }
}`);

    await FileGenerator.close(tsGenerator.output);
    await FileGenerator.close(htmlGenerator.output);

}