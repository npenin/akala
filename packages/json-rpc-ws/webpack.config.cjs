// eslint-disable-next-line no-undef
module.exports = {
    entry: {
        browser: './dist/esm/browser.js',
        browser_test: './test/browser_test._js',
        // popper: './src/controls/popper.ts',
        // markdown: './src/controls/markdown.ts',
    },
    output: {
        // eslint-disable-next-line no-undef
        path: __dirname,
        filename: '[name].js',
        chunkFilename: 'browser.js',
        library: '@akala/json-rpc-ws',
        globalObject: 'this',
        libraryTarget: 'umd',
    },
    resolve: {
        aliasFields: ['browser'],
        symlinks: false,
    },
    node: false,
    plugins: [],
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        usedExports: true,
        // namedModules: true,
        // namedChunks: true,
        sideEffects: true,
    },
    // externals: {
    //     '@popperjs/core': {
    //         commonjs: '@popperjs/core',
    //         commonjs2: '@popperjs/core',
    //         amd: '@popperjs/core',
    //         root: 'Popper'
    //     },
    //     'showdown': {
    //         commonjs: 'showdown',
    //         commonjs2: 'showdown',
    //         amd: 'showdown',
    //         root: 'showdown',
    //     },
    // },
}