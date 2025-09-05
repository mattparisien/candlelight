const path = require("path");
const generateEntryPoints = require("./scripts/generateWebpackEntries");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopywebpackPlugin = require("copy-webpack-plugin");

require("dotenv").config(); // Load variables from .env file into process.env
const { EnvironmentPlugin } = require("webpack");

module.exports = {
  mode: "production",
  context: __dirname,
  entry: generateEntryPoints(),
  output: {
    filename: "[name]/bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, "dist"),
    },
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.s?[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
          "sass-loader"
        ],
      },
      {
        test: /\.svg$/,
        type: 'asset/source',
      },
      {
        test: /\.(woff|woff2|ttf|eot)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name][ext]'
        }
      },
      {
        test: /\.(png|gif|jpg|jpeg|xml)$/,
        use: ["url-loader"],
      },
    ],
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: [".ts", ".tsx", ".js"],
    // Add support for TypeScripts fully qualified ESM imports.
    extensionAlias: {
      ".js": [".js", ".ts"],
      ".cjs": [".cjs", ".cts"],
      ".mjs": [".mjs", ".mts"],
    },
  },
  plugins: [
    require('autoprefixer'),
    new HtmlWebpackPlugin({
      template: "src/index.html",
      scriptLoading: "blocking",
      inject: true,
      templateParameters: (compilation, assets, assetTags, options) => {
        return {
          compilation,
          webpackConfig: compilation.options,
          htmlWebpackPlugin: {
            tags: assetTags,
            files: assets,
            options,
          },
        };
      },
    }),
    new MiniCssExtractPlugin({
      filename: "[name]/assets/styles/main.css",
    }),
    new CopywebpackPlugin({
      patterns: [
        {
          from: "src/assets/**/*",
          to: "assets/[name][ext]",
        },
      ],
    }),
    new EnvironmentPlugin(["BASE_URL"]), // List all environment variables you use here
  ],
  performance: {
    hints: false, // Suppress bundle size warnings
  },
};
