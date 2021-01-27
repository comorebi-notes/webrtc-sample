const path = require('path')

module.exports = {
  mode: 'development',
  entry: './src/app.js',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'build')
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: [{
        loader: 'babel-loader',
        options: {
          presets: [
            '@babel/preset-env'
          ]
        }
      }]
    }]
  },
  target: ['web', 'es5']
}
