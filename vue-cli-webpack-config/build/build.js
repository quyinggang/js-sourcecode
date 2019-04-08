'use strict'
require('./check-versions')()

process.env.NODE_ENV = 'production'

// 终端loading
const ora = require('ora')
// rm命令
const rm = require('rimraf')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const config = require('../config')
const webpackConfig = require('./webpack.prod.conf')

// 开始编译：显示loading图标
const spinner = ora('building for production...')
spinner.start()

// 删除以前的输出目录，调用webpack重新打包
rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
  if (err) throw err
  // 调用webpack方法打包
  webpack(webpackConfig, (err, stats) => {
    spinner.stop()
    if (err) throw err
    // 指定终端输出信息
    process.stdout.write(stats.toString({
      colors: true,
      modules: false,
      children: false, // If you are using ts-loader, setting this to true will make TypeScript errors show up during build.
      chunks: false,
      chunkModules: false
    }) + '\n\n')

    if (stats.hasErrors()) {
      console.log(chalk.red('  Build failed with errors.\n'))
      process.exit(1)
    }

    console.log(chalk.cyan('  Build complete.\n'))
    console.log(chalk.yellow(
      '  Tip: built files are meant to be served over an HTTP server.\n' +
      '  Opening index.html over file:// won\'t work.\n'
    ))
  })
})
