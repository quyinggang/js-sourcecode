/*!

 @Title: Layui
 @Description：经典模块化前端框架
 @Site: www.layui.com
 @Author: 贤心
 @License：MIT

 */
 
;!function(win){
  
"use strict";

// 该框架的构造函数(核心代码)
var Lay = function(){
  this.v = '1.0.9_rls'; //版本号
};

// 构造函数的原型对象
Lay.fn = Lay.prototype;

// 保存document对象到doc变量中， 并定义config配置对象以及在原型上定义cache对象
var doc = document, config = Lay.fn.cache = {},

// IIFE,获取layui.js所在目录(通过获取script标签的src属性值)
getPath = function(){
  var js = doc.scripts, jsPath = js[js.length - 1].src;
  return jsPath.substring(0, jsPath.lastIndexOf('/') + 1);
}(),

// 异常提示，通过window.console的方式来提示
error = function(msg){
  win.console && console.error && console.error('Layui hint: ' + msg);
},

// 逻辑值, 用于检查是否是opera浏览器(opera对象是opera5之后新增的对象)
isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',

//内置模块
modules = {
  layer: 'modules/layer' //弹层
  ,laydate: 'modules/laydate' //日期
  ,laypage: 'modules/laypage' //分页
  ,laytpl: 'modules/laytpl' //模板引擎
  ,layim: 'modules/layim' //web通讯
  ,layedit: 'modules/layedit' //富文本编辑器
  ,form: 'modules/form' //表单集
  ,upload: 'modules/upload' //上传
  ,tree: 'modules/tree' //树结构
  ,table: 'modules/table' //富表格
  ,element: 'modules/element' //常用元素操作
  ,util: 'modules/util' //工具块
  ,flow: 'modules/flow' //流加载
  ,carousel: 'modules/carousel' //轮播
  ,code: 'modules/code' //代码修饰器
  ,jquery: 'modules/jquery' //DOM库（第三方）
  
  ,mobile: 'modules/mobile' //移动大模块 | 若当前为开发目录，则为移动模块入口，否则为移动模块集合
  ,'layui.all': 'dest/layui.all' //PC模块合并版
};

config.modules = {}; //记录模块物理路径
config.status = {}; //记录模块加载状态
config.timeout = 10; //符合规范的模块请求最长等待秒数
config.event = {}; //记录模块自定义事件

//定义模块
Lay.fn.define = function(deps, callback){

  // 保存this对象, type: 逻辑值，保存是否是函数类型，mods: 函数，检查callback是否是函数
  // 如果是, 则callback(function() {})
  var that = this
  ,type = typeof deps === 'function'
  ,mods = function(){
    typeof callback === 'function' && callback(function(app, exports){
      // app是每个模块名，此处是暴露layui内置组件的，整个框架中exports的功能就是该函数完成
      // 例如: layui['layer'] = layer
      layui[app] = exports;
      // 设置模块的加载状态为true, 表示已加载
      config.status[app] = true;
    });
    return this;
  };
  
  // 如果deps是函数，则执行callback = deps，并将deps置为[]
  type && (
    callback = deps,
    deps = []
  );
  
  // 如果存在layer.all(pc端所有模块的合并的模块)模块，则返回modes并将该方法绑定在Lay的实例对象上
  if(layui['layui.all'] || (!layui['layui.all'] && layui['layui.mobile'])){
    return mods.call(that);
  }
  
  // 调用use函数：使用指定模块
  that.use(deps, mods);
  return that;
};

//使用特定模块
Lay.fn.use = function(apps, callback, exports){

  // dir: layui.js的目录路径
  var that = this, dir = config.dir = config.dir ? config.dir : getPath;
  // head标签
  var head = doc.getElementsByTagName('head')[0];

  apps = typeof apps === 'string' ? [apps] : apps;
  
  //如果页面已经存在jQuery1.7+库且所定义的模块依赖jQuery，则不加载内部jquery模块
  if(window.jQuery && jQuery.fn.on){
    that.each(apps, function(index, item){
      if(item === 'jquery'){
        apps.splice(index, 1);
      }
    });
    layui.jquery = jQuery;
  }
  

  // item始终表示第一个模块名
  var item = apps[0], timeout = 0;

  // 如果exports不存在,则exports = []
  exports = exports || [];

  //静态资源host
  config.host = config.host || (dir.match(/\/\/([\s\S]+?)\//)||['//'+ location.host +'/'])[0];
  
  // 没有模块 || 存在layui.all和modules中有相应的模块名 || 只存在layui.mobile模块并且modules有该模块
  // 用于处理apps无数据时的情况
  if(apps.length === 0 
  || (layui['layui.all'] && modules[item]) 
  || (!layui['layui.all'] && layui['layui.mobile'] && modules[item])
  ){
    // 返回onCallback以及当前实例对象
    return onCallback(), that;
  }

  //加载完毕
  function onScriptLoad(e, url){
    
    // 宿主环境平台是'PLaySTATION 3'， 正则表达式只匹配complate，否则匹配complate或loaded
    var readyRegExp = navigator.platform === 'PLaySTATION 3' ? /^complete$/ : /^(complete|loaded)$/
    // 条件：事件是否是load事件 || 当前文档的载入状态
    if (e.type === 'load' || (readyRegExp.test((e.currentTarget || e.srcElement).readyState))) {
      // 指定模块的物理地址
      config.modules[item] = url;
      // 移除节点
      head.removeChild(node);

      // 判断指定模块是否加载成功，成功执行onCallback函数，否则递归检测加载状态直至超时或加载成功
      (function poll() {
        if(++timeout > config.timeout * 1000 / 4){
          return error(item + ' is not a valid module');
        };
        config.status[item] ? onCallback() : setTimeout(poll, 4);
      }());
    }
  }

  //加载模块
  // 创建script节点， 构建模块地址
  var node = doc.createElement('script'), url =  (
    modules[item] ? (dir + 'lay/') : (config.base || '')
  ) + (that.modules[item] || item) + '.js';
  // 设置script的async属性，字符编码，src赋值
  node.async = true;
  node.charset = 'utf-8';
  node.src = url + function(){
    var version = config.version === true 
    ? (config.v || (new Date()).getTime())
    : (config.version||'');
    return version ? ('?v=' + version) : '';
  }();
  
  // config开始是空对象,如果modules属性中没有存在指定模块，表示首次加载
  if(!config.modules[item]){
    
    // 在head标签中添加script标签
    head.appendChild(node);
    // ie和其他浏览器，事件监听的不同处理
    if(node.attachEvent && !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) && !isOpera){
      node.attachEvent('onreadystatechange', function(e){
        onScriptLoad(e, url);
      });
    } else {
      node.addEventListener('load', function(e){
        onScriptLoad(e, url);
      }, false);
    }
  } else {
    // config中已经存在指定的模块，检查指定属性是否是字符串类型并且状态是否是已加载
    // 如果是,则执行OnCallback函数
    // 否则，递归检查直至超时
    (function poll() {
      if(++timeout > config.timeout * 1000 / 4){
        return error(item + ' is not a valid module');
      };
      (typeof config.modules[item] === 'string' && config.status[item]) 
      ? onCallback() 
      : setTimeout(poll, 4);
    }());
  }
  
  // 在配置对象中设置指定模块的文件地址
  config.modules[item] = url;
  
  //回调
  function onCallback(){
    // 将模块暴露出去
    exports.push(layui[item]);
    // 加载模块如果多个, 则递归调用本函数加载模块，直至apps.length = 1
    // 当加载到最后一个模块时，判断回调是否是函数类型，如果是，调用callback
    // ，指定callback的值是layui对象，将暴露的模块作为参数传递过去
    apps.length > 1 ?
      that.use(apps.slice(1), callback, exports)
    : ( typeof callback === 'function' && callback.apply(layui, exports) );
  }

  return that;

};

//获取节点的style属性值
Lay.fn.getStyle = function(node, name){

  // currentStyle是IE浏览器的属性，用于获取元素的最终所有css样式
  // window.getComputedStyle是获取当前元素的最终所有css样式,不过只读
  var style = node.currentStyle ? node.currentStyle : win.getComputedStyle(node, null);
  //  getPropertyValue: 获取元素最终的指定css样式
  return style[style.getPropertyValue ? 'getPropertyValue' : 'getAttribute'](name);
};

//css外部加载器
Lay.fn.link = function(href, fn, cssname){

  // 创建link节点, 设置link属性
  var that = this, link = doc.createElement('link');
  var head = doc.getElementsByTagName('head')[0];
  if(typeof fn === 'string') cssname = fn;
  var app = (cssname || href).replace(/\.|\//g, '');
  var id = link.id = 'layuicss-'+app, timeout = 0;
  
  link.rel = 'stylesheet';
  link.href = href + (config.debug ? '?v='+new Date().getTime() : '');
  link.media = 'all';
  
  if(!doc.getElementById(id)){
    head.appendChild(link);
  }

  if(typeof fn !== 'function') return that;
  
  //轮询css是否加载完毕
  (function poll() {
    if(++timeout > config.timeout * 1000 / 100){
      return error(href + ' timeout');
    };
    parseInt(that.getStyle(doc.getElementById(id), 'width')) === 1989 ? function(){
      fn();
    }() : setTimeout(poll, 100);
  }());
  
  return that;
};

//css内部加载器
Lay.fn.addcss = function(firename, fn, cssname){
  return layui.link(config.dir + 'css/' + firename, fn, cssname);
};

//图片懒加载
Lay.fn.img = function(url, callback, error) {
  
  // 创建图片对象
  var img = new Image();
  img.src = url;
  // 判断是否已完成对图像的加载
  if(img.complete){
    // 调用回调函数
    return callback(img);
  }
  // 图像加载完毕的事件处理程序
  img.onload = function(){
    img.onload = null;
    callback(img);
  };
  // 图像加载出错的事件处理程序
  img.onerror = function(e){
    img.onerror = null;
    error(e);
  };  
};

//全局配置
// 浅拷贝，将options中属性拷贝到config对象中
Lay.fn.config = function(options){
  options = options || {};
  for(var key in options){
    config[key] = options[key];
  }
  return this;
};

//记录全部模块，浅拷贝，将modules中属性拷贝到clone对象中，并返回该对象
Lay.fn.modules = function(){
  var clone = {};
  for(var o in modules){
    clone[o] = modules[o];
  }
  return clone;
}();

//拓展模块
Lay.fn.extend = function(options){
  var that = this;

  //验证模块是否被占用
  options = options || {};
  for(var o in options){
    if(that[o] || that.modules[o]){
      // 报错：模块名称XXX已被占用
      error('\u6A21\u5757\u540D '+ o +' \u5DF2\u88AB\u5360\u7528');
    } else {
      // 添加模块名到内置modules对象中
      that.modules[o] = options[o];
    }
  }
  
  return that;
};

//路由解析
Lay.fn.router = function(hash){
  // hash是指url中#开始的部分
  var that = this, hash = hash || location.hash, data = {
    path: []
    ,search: {}
    ,hash: (hash.match(/[^#](#.*$)/) || [])[1] || ''
  };
  
  if(!/^#\//.test(hash)) return data; //禁止非路由规范
  hash = hash.replace(/^#\//, '').replace(/([^#])(#.*$)/, '$1').split('/') || [];
  
  //提取Hash结构
  that.each(hash, function(index, item){
    /^\w+=/.test(item) ? function(){
      item = item.split('=');
      data.search[item[0]] = item[1];
    }() : data.path.push(item);
  });

  return data;
};

//本地存储
Lay.fn.data = function(table, settings){
  // 键值
  table = table || 'layui';
  
  // 浏览器不支持JSON，结束函数
  if(!win.JSON || !win.JSON.parse) return;
  
  //如果settings为null，则删除表
  if(settings === null){
    return delete localStorage[table];
  }
  
  // 存储的数据是否是对象类型，不是构建成对象类型
  settings = typeof settings === 'object' 
    ? settings 
  : {key: settings};
  
  // 捕捉对象JSON过程中的异常
  try{
    // 获取已有的数据
    var data = JSON.parse(localStorage[table]);
  } catch(e){
    var data = {};
  }
  
  // 修改指定key值的数据
  if(settings.value) data[settings.key] = settings.value;
  // 删除指定的数据
  if(settings.remove) delete data[settings.key];
  // 存储新的数据
  localStorage[table] = JSON.stringify(data);
  
  // 是否需要获取指定的key的数据
  return settings.key ? data[settings.key] : data;
};

//设备信息
Lay.fn.device = function(key){
  
  // 用户代理
  var agent = navigator.userAgent.toLowerCase();

  //获取版本号
  var getVersion = function(label){
    var exp = new RegExp(label + '/([^\\s\\_\\-]+)');
    label = (agent.match(exp)||[])[1];
    return label || false;
  };

  var result = {
    os: function(){ //底层操作系统
      if(/windows/.test(agent)){
        return 'windows';
      } else if(/linux/.test(agent)){
        return 'linux';
      } else if(/mac/.test(agent)){
        return 'mac';
      } else if(/iphone|ipod|ipad|ios/.test(agent)){
        return 'ios';
      }
    }()
    ,ie: function(){ //ie版本
      return (!!win.ActiveXObject || "ActiveXObject" in win) ? (
        (agent.match(/msie\s(\d+)/) || [])[1] || '11' //由于ie11并没有msie的标识
      ) : false;
    }()
    ,weixin: getVersion('micromessenger')  //是否微信
  };
  
  //任意的key
  if(key && !result[key]){
    result[key] = getVersion(key);
  }
  
  //移动设备
  result.android = /android/.test(agent);
  result.ios = result.os === 'ios';
  
  return result;
};

//提示
Lay.fn.hint = function(){
  return {
    error: error
  }
};

//遍历
Lay.fn.each = function(obj, fn){
  var that = this, key;
  // fn不会函数类型，退出
  if(typeof fn !== 'function') return that;
  obj = obj || [];
  // 是否是由Object函数创建的对象
  if(obj.constructor === Object){
    for(key in obj){
      if(fn.call(obj[key], key, obj[key])) break;
    }
  } else {
    for(key = 0; key < obj.length; key++){
      if(fn.call(obj[key], key, obj[key])) break;
    }
  }
  return that;
};

//阻止事件冒泡
Lay.fn.stope = function(e){
  e = e || win.event;
  // 兼容ie（ie是通过cancelBubble来阻止事件冒泡的）
  e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
};

//自定义模块事件
Lay.fn.onevent = function(modName, events, callback){

  // 例如element点击事件,modName: 'element'，events: 'tab(test1)'
  // 该框架中事件名一般的组成是模块名(layer-filter属性值)的形式
  if(typeof modName !== 'string' 
  || typeof callback !== 'function') return this;
  // 事件保存的形式：element.tab(test1) = [处理程序]，可见可有多个处理程序
  config.event[modName + '.' + events] = [callback];
  
  //不再对多次事件监听做支持
  /*
  config.event[modName + '.' + events] 
    ? config.event[modName + '.' + events].push(callback) 
  : config.event[modName + '.' + events] = [callback];
  */
  
  return this;
};

//执行自定义模块事件
Lay.fn.event = function(modName, events, params){

  // modName: 模块名，events: 事件，刑如tab(demo), params相关参数
  // filter的值是lay-filter的属性值集合，例如tab(demo)中的demo
  var that = this, result = null, filter = events.match(/\(.*\)$/)||[]; //提取事件过滤器
  var set = (events = modName + '.'+ events).replace(filter, ''); //获取事件本体名
  // 定义函数，_是key，item是value值
  var callback = function(_, item){
    var res = item && item.call(that, params);
    res === false && result === null && (result = false);
  };
  // 遍历config.event中指定事件的处理程序
  // 实际的函数执行是callback.call(obj[key], key, obj[key])
  // key是键值，obj[key]是value值，此时set = element.tab('')
  layui.each(config.event[set], callback);
  // events形式是模块名.事件名,例如element.tab(demo)
  // 此处表示如果filter的值存在，就执行该事件的回调函数，例如filter是demo存在
  filter[0] && layui.each(config.event[events], callback); //执行过滤器中的事件
  return result;
};

win.layui = new Lay();

}(window);

