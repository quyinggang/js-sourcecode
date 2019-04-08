'use strict'
const utils = require('./utils')
const webpack = require('webpack')
const path = require('path')
const config = require('../config')
// 公用webpack配置
const baseWebpackConfig = require('./webpack.base.conf')
// webpack配置文件合并插件
const merge = require('webpack-merge')
// 复制插件
const CopyWebpackPlugin = require('copy-webpack-plugin')
// 生成HTML插件
const HtmlWebpackPlugin = require('html-webpack-plugin')
// 清理webpack编译输出的信息
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
// 端口扫描
const portfinder = require('portfinder')

// 获取域名和端口
const HOST = process.env.HOST
const PORT = process.env.PORT && Number(process.env.PORT)

const devWebpackConfig = merge(baseWebpackConfig, {
  // 定义对模块源代码转换的loader
  module: {
    // 重新定义Style相关的loader
    rules: utils.styleLoaders({ sourceMap: config.dev.cssSourceMap, usePostCSS: true })
  },
  /**
   *  选择source map，用于开发环境的增强调试
   *  cheap-module-eval-source-map是开发环境速度最快的
   */
  devtool: config.dev.devtool,

  // 本地开发服务，相关配置都在/config/index.js文件中
  devServer: {
    // 控制台log等级，默认是info输出所有信息；warning表示只输出警告和错误信息
    clientLogLevel: 'warning',
    // 查不到指定路由时的方案
    historyApiFallback: {
      rewrites: [
        // 找不到路由时就跳转到首页
        { from: /.*/, to: path.posix.join(config.dev.assetsPublicPath, 'index.html') },
      ],
    },
    // 是否启用热替换
    hot: true,
    // 告诉服务器从哪个目录中提供内容，默认情况下使用当前工作目录作为提供内容的目录
    // false表示禁用
    contentBase: false,
    // 是否启用gzip压缩
    compress: true,
    // 域名，默认是localhost，如果希望服务器外部可访问，设置为0.0.0.0
    host: HOST || config.dev.host,
    // 端口
    port: PORT || config.dev.port,
    // 是否允许server打开浏览器
    open: config.dev.autoOpenBrowser,
    // 是否在浏览器中显示编译器错误或警告
    overlay: config.dev.errorOverlay
      ? { warnings: false, errors: true }
      : false,
    // 可在浏览器中访问的打包文件，默认是/
    publicPath: config.dev.assetsPublicPath,
    // 设置代理，主要用于解决前后端分离时跨域问题
    proxy: config.dev.proxyTable,
    // webpack错误或警告在控制台是否不显示，true表示不显示
    quiet: true,
    // 定制watch模式的选项
    watchOptions: {
      // 是否检查变动
      poll: config.dev.poll,
    }
  },
  // 插件使用
  plugins: [
    // 允许在编译时配置全局常量，对于区分生产和开发环境定制不同行为非常有用
    new webpack.DefinePlugin({
      'process.env': require('../config/dev.env')
    }),
    // 启用模块热替换
    new webpack.HotModuleReplacementPlugin(),
    // 开启模块热替换时使用该插件会显示模块相对路径
    new webpack.NamedModulesPlugin(),
    // webpack编译出现错误使用该插件跳过输出阶段，保证输出资源不会包含错误
    new webpack.NoEmitOnErrorsPlugin(),
    // 动态生成html
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true
    }),
    // 文件复制插件，常用于将文件复制到编译后的目录中
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, '../static'),
        to: config.dev.assetsSubDirectory,
        ignore: ['.*']
      }
    ])
  ]
})

module.exports = new Promise((resolve, reject) => {
  portfinder.basePort = process.env.PORT || config.dev.port
  // 端口扫描，当指定端口被占用，自动跳转到下一个端口
  portfinder.getPort((err, port) => {
    if (err) {
      reject(err)
    } else {
      process.env.PORT = port
      devWebpackConfig.devServer.port = port

      // 控制台输出信息控制插件friendly-errors-webpack-plugin
      devWebpackConfig.plugins.push(new FriendlyErrorsPlugin({
        // 编译成功后的提示
        compilationSuccessInfo: {
          messages: [`Your application is running here: http://${devWebpackConfig.devServer.host}:${port}`],
        },
        // 错误信息
        onErrors: config.dev.notifyOnErrors
        ? utils.createNotifierCallback()
        : undefined
      }))

      resolve(devWebpackConfig)
    }
  })
})
