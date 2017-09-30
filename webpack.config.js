const webpack = require("webpack");
const path = require("path");


module.exports = {
  entry: ['./client/index.js'],

  output: {
    path: path.resolve(__dirname + '/dist'),
    filename: 'main.js',
  },

  devServer: {
    port: 3000,
  },
};
