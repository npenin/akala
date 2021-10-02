const { IgnorePlugin } = require("webpack");

module.exports = {
    entry: {
        akala: './dist/index.js',
    },
    output: {
        path: __dirname,
        filename: '[name].js',
        chunkFilename: 'browser.js',
        library: '@akala/client',
        libraryTarget: 'umd',
    },
    resolve: {
        aliasFields: ['browser'],
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: [".ts", ".tsx", ".js"],
        symlinks: false,
        fallback: {
            stream: require.resolve('stream-browserify'),
            os: require.resolve('os-browserify/browser'),
            path: require.resolve('path-browserify'),
            querystring: require.resolve('querystring-es3'),
            fs: false,
            http: false,
            https: false,
            zlib: false,
        }
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: require.resolve('ts-loader'),
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [],
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        usedExports: true,
        sideEffects: true,
    },
    plugins: [
        new IgnorePlugin({ resourceRegExp: /ws/ })
    ]
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