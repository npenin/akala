import type { Plugin } from 'vite';
import { DTCGTokenGroup, mergeTokens, generateCssFromTokensToString, expandTokens, WebUI, GenerateCssOptions } from './design-tokens.js';

export default function plugin(options?: { tokenPaths?: string[], includeDefaultTheme?: boolean, generateOptions?: GenerateCssOptions, tokens?: DTCGTokenGroup | Promise<DTCGTokenGroup> }): Plugin
{
    const virtualModuleId = 'virtual:dtcg'
    const resolvedVirtualModuleId = { css: '\0' + virtualModuleId + '.css', js: '\0' + virtualModuleId + '.js' }


    const defaultTheme = import('../' + '../default-theme.tokens.json', { with: { type: 'json' } }).then(x => x.default);

    if (options.includeDefaultTheme)
    {
        if (!options.tokens)
            options.tokens = defaultTheme
        else
            options.tokens = Promise.all([defaultTheme, options.tokens]).then(([defaultTheme, tokens]) => expandTokens(mergeTokens(defaultTheme, tokens)));
    }

    return {
        name: 'akala-web-ui',
        enforce: 'pre',
        resolveId(source, importer, options)
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
        async transform(code, id, viteOptions)
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
