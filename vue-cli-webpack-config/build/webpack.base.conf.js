'use strict'
const path = require('path')
const utils = require('./utils')
const config = require('../config')
const vueLoaderConfig = require('./vue-loader.conf')

// 返回指定目录的绝对路径
function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

const createLintingRule = () => ({
  test: /\.(js|vue)$/,
  loader: 'eslint-loader',
  // enforce: pre | post, loader使用优先级定义，定义了pre会优先于其他同类型相同模块使用loader解析
  enforce: 'pre',
  // include表示必须匹配的目录
  include: [resolve('src'), resolve('test')],
  options: {
    // eslint-friendly-formatter插件会将eslint详细输出到控制台
    formatter: require('eslint-friendly-formatter'),
    // 是否显示警告信息
    emitWarning: !config.dev.showEslintErrorsInOverlay
  }
})

module.exports = {
  // 绝对路径的基础目录即解析entry和loader的目录，默认当前目录
  context: path.resolve(__dirname, '../'),
  // 入口
  entry: {
    app: './src/main.js'
  },
  // 输出
  output: {
    // 指定编译输出目录
    path: config.build.assetsRoot,
    // 输出文件名称
    filename: '[name].js',
    // 配置输出目录对应的公开URL
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath
  },
  // 模块解析规则
  resolve: {
    // 省略模块扩展匹配规则
    extensions: ['.js', '.vue', '.json'],
    // 模块别名
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': resolve('src'),
    }
  },
  module: {
    // 定义loader
    rules: [
      ...(config.dev.useEslint ? [createLintingRule()] : []),
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: vueLoaderConfig
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('src'), resolve('test'), resolve('node_modules/webpack-dev-server/client')]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('media/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
        }
      }
    ]
  }
}
