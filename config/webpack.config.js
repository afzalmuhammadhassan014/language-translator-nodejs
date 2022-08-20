var webpack = require('webpack')
var path = require('path')

module.exports = {
    {
        test: /\.css$/,
        use: [
            { loader: "style-loader" },
            { loader: 'css-loader', options: { importLoaders: 1 } }
        ]
    }
}