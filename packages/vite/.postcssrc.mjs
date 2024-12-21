import akala from "@akala/web-ui/postcss";
import fullCompose from "@akala/web-ui/postcss-full-compose";
import customMedia from "postcss-custom-media";

const config = {
    "plugins": [
        // usingpostcssimport(),
        akala({ includeDefaultTheme: true, generateOptions: { customMedia: true } }),
        fullCompose(),
        // modules(),
        customMedia(),
        // dtcg({ importAtRuleName: 'import-tokens', valueFunctionName: 'dtcg' }),
    ]
}

export default config;