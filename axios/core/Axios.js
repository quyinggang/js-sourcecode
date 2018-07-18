'use strict';

var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Axios实例创建
 *  - axios({})形式
 *
 * - defaults: 用户传递的配置对象
 * - interceptors：默认拦截器，定义了请求和响应的拦截器
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * axios的实际调用函数
 */
Axios.prototype.request = function request(config) {
  // 支持axios(url, config)
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  // 应用自定义配置
  config = mergeConfig(this.defaults, config);
  // 如果method不存在，则默认get请求
  config.method = config.method ? config.method.toLowerCase() : 'get';

  // dispatchRequest核心，包含发出请求
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  // 多个请求拦截器的处理
  // [拦截器，...，dispatchRequest, undefined]
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  // 多个响应拦截器的处理
  // [dispatchRequest, undefined, 拦截器]
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  // 执行请求，包含拦截器的处理，通过上面数组保证请求拦截器和响应拦截器在请求前和请求完成执行
  // 这里实际上形成一个链式，下一次依赖上一次的promise值
  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  // 返回执行结果
  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
