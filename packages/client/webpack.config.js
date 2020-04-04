module.exports = {
    entry: {
        akala: './src/index.ts',
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
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [],
    devtool: 'source-map',
    mode: 'production',
    optimization: {
        usedExports: true,
        namedModules: true,
        namedChunks: true,
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