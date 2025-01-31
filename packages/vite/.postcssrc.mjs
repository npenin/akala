import akala from "@akala/web-ui/postcss";
import fullCompose from "@akala/web-ui/postcss-full-compose";
import contrast from "@akala/web-ui/postcss-contrast";
import customMedia from "postcss-custom-media";

const config = {
    "plugins": [
        // usingpostcssimport(),
        akala({ includeDefaultTheme: true, generateOptions: { customMedia: true } }),
        fullCompose(),
        contrast(),
        // modules(),
        customMedia(),
        // dtcg({ importAtRuleName: 'import-tokens', valueFunctionName: 'dtcg' }),
    ]
}

export default config;