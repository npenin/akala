module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    ignorePatterns: [
        "packages/webdav/**/*.ts",
        "packages/crud/**/*.ts",
        "packages/authentication/**/*.ts",
    ],
    rules: {
        "@typescript-eslint/no-inferrable-types": "off",
        "no-var": "off",
    },
    extends: [
        'eslint:recommended',
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
    ],
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
};