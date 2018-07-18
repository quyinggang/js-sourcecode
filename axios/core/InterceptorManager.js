'use strict';

var utils = require('./../utils');

// 拦截器管理对象
function InterceptorManager() {
  this.handlers = [];
}

/**
 * 添加拦截器：fulfilled处理resolve状态，rejected处理reject状态
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  // 返回当前下标
  return this.handlers.length - 1;
};

/**
 * 移除已定义的拦截器
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * 遍历处理拦截器
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;
