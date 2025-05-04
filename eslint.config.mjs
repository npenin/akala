import tseslint from 'typescript-eslint'
import eslint from "@eslint/js";

export default tseslint.config([
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        ignores: [
            "dist/**/*.js",
            "node_modules/**/*.js",
            "coverage/**",
            "packages/webdav/**/*.ts",
            "packages/crud/**/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-inferrable-types": "off",
            "no-var": "off",
        },
        settings: {
            "import/parsers": {
                "@typescript-eslint/parser": [
                    ".ts",
                    ".tsx"
                ]
            },
            "import/resolver": {
                "typescript": {}
            }
        },
    }
]);
