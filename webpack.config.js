const path = require('path');

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                noEmit: false,
                            },
                        },
                    }],
                exclude: /node_modules/,
            },
        ],
    },
    experiments: {
        asyncWebAssembly: true
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'cardano-transactions',
        libraryTarget: 'umd',
    },
    optimization: {
        minimize: true
    }
}
