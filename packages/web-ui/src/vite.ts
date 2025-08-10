import type { Plugin } from 'vite';
import { type DTCGTokenGroup, mergeTokens, generateCssFromTokensToString, expandTokens, type WebUI, type GenerateCssOptions } from './design-tokens.js';
import webui from './postcss-dtcg.js'
import contrast from './postcss-contrast.js'
import fullCompose from './postcss-compose-full.js'
import postcss from 'postcss';

export default function plugin(options?: { tokenPaths?: string[], includeDefaultTheme?: boolean, generateOptions?: GenerateCssOptions, tokens?: DTCGTokenGroup | Promise<DTCGTokenGroup> }): Plugin
{
    const virtualModuleId = 'virtual:dtcg'
    const resolvedVirtualModuleId = { css: '\0' + virtualModuleId + '.css', js: '\0' + virtualModuleId + '.js' }


    const defaultTheme = import('../' + '../default-theme.tokens.json', { with: { type: 'json' } }).then(x => x.default);

    if (options?.includeDefaultTheme)
    {
        if (!options.tokens)
            options.tokens = defaultTheme
        else
            options.tokens = Promise.all([defaultTheme, options.tokens]).then(([defaultTheme, tokens]) => expandTokens(mergeTokens(defaultTheme, tokens)));
    }

    return {
        name: 'akala-web-ui',
        enforce: 'pre',
        config(config)
        {
            if (!config.css?.postcss || typeof config.css.postcss !== 'string' && !config.css.postcss.plugins)
            {
                config.css = { ...(config.css || {}), postcss: { ...(config.css?.postcss as object || {}), plugins: [] } };
                (config.css.postcss as { plugins: postcss.AcceptedPlugin[] }).plugins.push(
                    webui(options),
                    fullCompose(),
                    contrast(),)
            }
        },
        resolveId(source, importer)
        {
            if (virtualModuleId == source)
            {
                console.log('resolving ', source, importer)
                // if (importer.endsWith('.css'))
                return resolvedVirtualModuleId.css;
                // else // if (importer.endsWith('.js') || importer.endsWith('.ts'))
                //     return resolvedVirtualModuleId.js;
            }
        },
        async transform(code, id)
        {
            if (id == resolvedVirtualModuleId.css)
                return {
                    code: await generateCssFromTokensToString(expandTokens<WebUI>(mergeTokens(await options?.tokens ?? {}, ...(await Promise.all(options.tokenPaths?.map(p => this.load({ id: p }).then(mi => JSON.parse(mi.code))) ?? [])))), options.generateOptions),
                }
        },
        async load(id)
        {
            if (id === resolvedVirtualModuleId.css)
            {
                console.log('loading ', id)
                return {

                    code: await generateCssFromTokensToString(expandTokens<WebUI>(mergeTokens(await options?.tokens ?? {}, ...(await Promise.all(options.tokenPaths?.map(p => this.load({ id: p }).then(mi => JSON.parse(mi.code))) ?? [])))), options.generateOptions),

                }
            }
            if (id === resolvedVirtualModuleId.js)
            {
                console.log('loading ', id)
                return JSON.stringify(expandTokens<WebUI>(mergeTokens(await options?.tokens ?? {}, ...(await Promise.all(options.tokenPaths?.map(p => this.load({ id: p }).then(mi => JSON.parse(mi.code))) ?? [])))))
            }
        }
    }
}
