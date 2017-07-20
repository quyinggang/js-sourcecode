/*
	layer移动端
 */

// IIFE(立即执行函数)
// ;防止文件合并压缩带来的问题
// !：标识后面的是表达式（其实这里有没有！都没有任何问题，你也可以+function(){}();等）
;!function(win){
  
"use strict";

/*
	doc: 保存document对象
	query：保存querySelectorAll
	claname：保存getElementsByClassName
	S：函数，返回获取指定选择器的语句，例如doument.getElementsByClassName(s)
 */
var doc = document, query = 'querySelectorAll', claname = 'getElementsByClassName', S = function(s){
  return doc[query](s);
};

// 默认的配置
/*
	type：弹出框类型
	shadow：是否显示遮罩
	shadowClose：点击遮罩是否关闭弹出层
	fixed：是否固定
	anim：动画效果
*/
var config = {
  type: 0
  ,shade: true
  ,shadeClose: true
  ,fixed: true
  ,anim: 'scale' 
};

// 用于合并配置参数
var ready = {
  extend: function(obj){
    var newobj = JSON.parse(JSON.stringify(config));
    for(var i in obj){
      newobj[i] = obj[i];
    }
    return newobj;
  }, 
  // timer：定时器集合，用于自动关闭的弹出框
  // end: 弹出框关闭后的回调函数
  timer: {}, end: {}
};


// 定义touch事件，使用事件监听click事件来实现，事件在冒泡阶段捕获
ready.touch = function(elem, fn){
  elem.addEventListener('click', function(e){
    fn.call(this, e);
  }, false);
};

// class：用于定义弹出框的class类名
// Layer：函数用于合并配置参数，开启视图
var index = 0, classs = ['layui-m-layer'], Layer = function(options){
  var that = this;
  // 合并配置参数
  that.config = ready.extend(options);
  that.view();
};

// Layer原型上添加view方法，该方法是按照配置参数生成弹出框
Layer.prototype.view = function(){
	
  // 获得config配置对象，创建div节点
  var that = this, config = that.config, layerbox = doc.createElement('div');
  
  // 给div节点添加id唯一标识：layui-m-layer0
  that.id = layerbox.id = classs[0] + index;
  
  // 给div添加class属性，属性值：layui-m-layer layer-m-layer0
  layerbox.setAttribute('class', classs[0] + ' ' + classs[0]+(config.type || 0));
  // 给div节点设置属性index，属性值是0
  layerbox.setAttribute('index', index);
  
  // IIFE，用于设置标题
  var title = (function(){
	
	// 验证配置参数title属性是否是object
    var titype = typeof config.title === 'object';
	
	/*
		config.title不为空,若title是对象,那么<h3 style="" + `$config.title[1]`></h3>, 否则<h3 style=""></h3>
		若config.title为空, 则返回''
	*/
    return config.title
    ? '<h3 style="'+ (titype ? config.title[1] : '') +'">'+ (titype ? config.title[0] : config.title)  +'</h3>'
    : '';
  }());
  
  // IIFE, 按钮设置
  var button = (function(){
	
	// 如果config.btn属性时是字符串类型，则将其设置成数组
    typeof config.btn === 'string' && (config.btn = [config.btn]);
	
	// 假若config.btn是字符串类型，则它被设置成对象, 那么btns = config.btn.length
	// 假若config.btn为Boolean(config.btn) === false, 那么btns = [].length
    var btns = (config.btn || []).length, btndom;
	
	// 判断按钮信息为空或者没有相关配置参数信息时
    if(btns === 0 || !config.btn){
      return '';
    }
	
	// 确认按钮的HTML
    btndom = '<span yes type="1">'+ config.btn[0] +'</span>'
    if(btns === 2){
	  // 取消按钮的html
      btndom = '<span no type="0">'+ config.btn[1] +'</span>' + btndom;
    }
	
	// 按钮整体的HTML部分
    return '<div class="layui-m-layerbtn">'+ btndom + '</div>';
  }());
  
  // 如果配置参数不要求固定
  if(!config.fixed){
   
    // 动态添加top属性，若不存在top属性，则设置top为100
    config.top = config.hasOwnProperty('top') ?  config.top : 100;
	
	// 弹出框样式，document.body.scrollTop(页面滚动条距离顶部的距离) + top
    config.style = config.style || '';
    config.style += ' top:'+ ( doc.body.scrollTop + config.top) + 'px';
  }
  
  // 弹出框的类型是2，改变当前配置参数的内容
  if(config.type === 2){
    config.content = '<i></i><i class="layui-m-layerload"></i><i></i><p>'+ (config.content||'') +'</p>';
  }
  
  // 如果自定义样式类， 则改变配置的动画效果
  if(config.skin) config.anim = 'up';
  
  // 如果传入类msg，则关闭遮罩层
  if(config.skin === 'msg') config.shade = false;
  
  /*
	设置弹出层的内容
		主要结构如下：
			<div class="layui-m-layershade"></div>
			<div class="layui-m-layermain">
				<div class="layer-m-layersection">
					<div class="layer-m-layerchild ">
						标题html
						<div class="layui-m-layercont">内容</div>
						按钮html
						</div>
					</div>
				</div>
			</div>
				
  */
  layerbox.innerHTML = (config.shade ? '<div '+ (typeof config.shade === 'string' ? 'style="'+ config.shade +'"' : '') +' class="layui-m-layershade"></div>' : '')
  +'<div class="layui-m-layermain" '+ (!config.fixed ? 'style="position:static;"' : '') +'>'
    +'<div class="layui-m-layersection">'
      +'<div class="layui-m-layerchild '+ (config.skin ? 'layui-m-layer-' + config.skin + ' ' : '') + (config.className ? config.className : '') + ' ' + (config.anim ? 'layui-m-anim-' + config.anim : '') +'" ' + ( config.style ? 'style="'+config.style+'"' : '' ) +'>'
        + title
        +'<div class="layui-m-layercont">'+ config.content +'</div>'
        + button
      +'</div>'
    +'</div>'
  +'</div>';
  
  // 如果config.type为0 或者为2
  if(!config.type || config.type === 2){
    
    // document.getElementsByClassName('layui-m-layer0') 或getElementsByClassName('layui-m-layer2')
    var dialogs = doc[claname](classs[0] + config.type), dialen = dialogs.length;
	
	// 如果有多个弹出框关闭最初打开的
    if(dialen >= 1){
      layer.close(dialogs[0].getAttribute('index'))
    }
  }
  
  // 将弹出框添加到body标签中
  document.body.appendChild(layerbox);
  
  // 获取document.querySelectedAll('#layui-m-layer数字')
  var elem = that.elem = S('#'+that.id)[0];
  config.success && config.success(elem);
  
  that.index = index++;
  that.action(config, elem);
};

// 所有弹出框的相关动作
Layer.prototype.action = function(config, elem){
  var that = this;
  
  // config.time不为空或0, 就是弹出层设置了自动关闭功能的处理
  if(config.time){
	// 动态添加timer的属性，属性值是定时器：自动关闭弹出框
    ready.timer[that.index] = setTimeout(function(){
      layer.close(that.index);
    }, config.time*1000);
  }
  
  // btn函数：处理确定按钮或关闭按钮的功能
  var btn = function(){
	
	// 获取type属性
    var type = this.getAttribute('type');
	
	// 属性值为0, 表示是信息框
    if(type == 0){
      config.no && config.no();
      layer.close(that.index);
    } else {
	  // 是否存在确定按钮，不存在自动调用关闭程序
      config.yes ? config.yes(that.index) : layer.close(that.index);
    }
  };
  
  // config.btn配置参数存在
  if(config.btn){
	// btns = document.getElementsByClassName('layui-m-layerbtn')[0].children
    var btns = elem[claname]('layui-m-layerbtn')[0].children, btnlen = btns.length;
	
	// 给当前弹出框所有按钮，加上点击事件, 并将btn最为回调函数传过去
    for(var ii = 0; ii < btnlen; ii++){
      ready.touch(btns[ii], btn);
    }
  }
  
  // 处理点击遮罩，弹出框关闭
  if(config.shade && config.shadeClose){
    var shade = elem[claname]('layui-m-layershade')[0];
    ready.touch(shade, function(){
      layer.close(that.index, config.end);
    });
  }
  
  // 如果config.end配置参数存在
  config.end && (ready.end[that.index] = config.end);
};

// 定义layer对象，将其作为APi暴露出去
win.layer = {
  // 版本
  v: '2.0',
  // 编号
  index: index,

  // 创建弹出框
  open: function(options){
    var o = new Layer(options || {});
    return o.index;
  },
  
  // 弹出框关闭
  close: function(index){
	// iBox = document.querySelectorAll('#layui-m-layer`${index}`')
    var ibox = S('#'+classs[0]+index)[0];
    if(!ibox) return;
    ibox.innerHTML = '';
	// 移除该节点
    doc.body.removeChild(ibox);
	// 清除指定定时器
    clearTimeout(ready.timer[index]);
	// 删除timer存储的定时器程序
    delete ready.timer[index];
	// 弹出层清除后的回调函数
    typeof ready.end[index] === 'function' && ready.end[index]();
	// 删除对应弹出框的回调函数
    delete ready.end[index];
  },

  // 关闭所有弹出框
  closeAll: function(){
    var boxs = doc[claname](classs[0]);
    for(var i = 0, len = boxs.length; i < len; i++){
      layer.close((boxs[0].getAttribute('index')|0));
    }
  }
};

// 存在模块加载框架和不存在的情况
'function' == typeof define ? define(function() {
  return layer;
}) : function(){
  
  // 加载css文件，例如src="./layer.js", 那么
  var js = document.scripts, script = js[js.length - 1], jsPath = script.src;
  var path = jsPath.substring(0, jsPath.lastIndexOf("/") + 1);
  
  if(script.getAttribute('merge')) return; 
  
  document.head.appendChild(function(){
    var link = doc.createElement('link');
    link.href = path + 'need/layer.css?2.0';
    link.type = 'text/css';
    link.rel = 'styleSheet'
    link.id = 'layermcss';
    return link;
  }());
  
}();

}(window);
