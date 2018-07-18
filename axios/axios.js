'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * 创建axios实例，工厂模式
 */
function createInstance(defaultConfig) {
  // Axios构造函数
  var context = new Axios(defaultConfig);

  /*
    实际上是调用request方法
    instance = function wrap() {
      return Axios.prototype.request.apply(context, [...arguments]);
    }
   */
  var instance = bind(Axios.prototype.request, context);

  // 将Axios.prototype实例上的方法复制到instance函数上，并改变this指向为axios实例
  utils.extend(instance, Axios.prototype, context);

  // 将axios实例上的方法复制到isntance上
  utils.extend(instance, context);

  return instance;
}

// 默认配置对象是defaults.js暴露出来的对象
/*
  var axios = function wrap(defaults) {
    return Axios.prototype.request.apply(context, [...defaults]);
  }
  */
var axios = createInstance(defaults);

// 暴露Axios构造函数
axios.Axios = Axios;

// 暴露create方法，用于创建axios实例
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// 暴露 Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// 暴露all方法，该方法是并行处理多个请求
axios.all = function all(promises) {
  return Promise.all(promises);
};
// 暴露spread
axios.spread = require('./helpers/spread');

// 暴露axios实例
module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
