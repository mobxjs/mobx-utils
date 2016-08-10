var webpack = require('webpack');

module.exports = {
    entry: './lib/mobx-utils.js',
    output: {
        libraryTarget: 'umd',
        library: 'mobxUtils',
        path: __dirname,
        filename: 'mobx-utils.umd.js'
    },
    resolve: {
        extensions: ['', '.js'],
    },
    externals: {
        mobx: 'mobx'
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        })
    ]
};
