'use strict'
const utils = require('./utils')
const config = require('../config')
const isProduction = process.env.NODE_ENV === 'production'
const sourceMapEnabled = isProduction
  ? config.build.productionSourceMap
  : config.dev.cssSourceMap

module.exports = {
  loaders: utils.cssLoaders({
    // 生成.map文件便于调试
    sourceMap: sourceMapEnabled,
    // 是否使用extract-text-webpack-plugin插件将文件的中的css部分抽离出来生成单独的css文件
    extract: isProduction
  }),
  // vue-loader参数：是否开启CSS source maps
  cssSourceMap: sourceMapEnabled,
  // vue-loader参数：是否要缓存文件，可以让浏览器不缓存，即动态生成文件中加入hash就会让每一次构建的文件都不同
  cacheBusting: config.dev.cacheBusting,
  // 解决Vue中src需要使用require先导入的问题，这里统一配置
  transformToRequire: {
    video: ['src', 'poster'],
    source: 'src',
    img: 'src',
    // svg的image标签
    image: 'xlink:href'
  }
}
