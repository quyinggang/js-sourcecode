/**

 @Name：layui.flow 流加载
 @Author：贤心
 @License：MIT
    
 */
 
 
layui.define('jquery', function(exports){
  "use strict";
  
  // 定义构造函数Flow
  var $ = layui.jquery, Flow = function(options){}
  // 加载容器的css类
  ,ELEM_MORE = 'layui-flow-more'
  // 动态加载的图标
  ,ELEM_LOAD = '<i class="layui-anim layui-anim-rotate layui-anim-loop layui-icon ">&#xe63e;</i>';

  //主方法
  Flow.prototype.load = function(options){
    // page代码当前页，流加载一定数量的资源形成一页
    // isOver：资源是否已加载完毕
    // lazyimg：图片懒加载
    // timer：定时器
    var that = this, page = 0, lock, isOver, lazyimg, timer;
    options = options || {};

    // elem：包裹资源的容器节点
    var elem = $(options.elem); if(!elem[0]) return;
    // 滚动条所在的元素
    var scrollElem = $(options.scrollElem || document);
    // 自动滚动时，触发点（与底部的临界距离）
    var mb = options.mb || 50;
    // 是否自动滚动加载
    var isAuto = 'isAuto' in options ? options.isAuto : true;
    // “末页”显示文案
    var end = options.end || '没有更多了'; 
    
    // 滚动条所在元素是否为document
    var notDocment = options.scrollElem && options.scrollElem !== document;
    
    // 加载更多，按钮方式的DOM节点
    var ELEM_TEXT = '<cite>加载更多</cite>'
    ,more = $('<div class="layui-flow-more"><a href="javascript:;">'+ ELEM_TEXT +'</a></div>');
    
    // 处理加载loading节点的重复性
    if(!elem.find('.layui-flow-more')[0]){
      elem.append(more);
    }
    
    //加载下一个元素
    var next = function(html, over){
      // 创建指定的元素节点
      html = $(html);
      // 在加载节点前插入创建的节点
      more.before(html);
      // 判断是否结束
      over = over == 0 ? true : null;
      // 如果资源已全部加载, 就添加结束提示文本，否则设置文本为加载更多
      over ? more.html(end) : more.find('a').html(ELEM_TEXT);
      isOver = over;
      lock = null;
      // 如果需要图片懒加载，就调用lazyimg来实现
      lazyimg && lazyimg();
    };
    
    //触发请求
    var done = function(){
      lock = true;
      // 改变加载形式是动态加载图标
      more.find('a').html(ELEM_LOAD);
      // 判断传入的参数done是否是函数，是则执行options中done函数, 并传入page以及next函数
      typeof options.done === 'function' && options.done(++page, next);
    };
    
    done();
    
    //不自动滚动加载, 按钮形式绑定click事件
    more.find('a').on('click', function(){
      var othis = $(this);
      if(isOver) return;
      lock || done();
    });
    
    //如果允许图片懒加载
    if(options.isLazyimg){
      var lazyimg = that.lazyimg({
        elem: options.elem + ' img'
        ,scrollElem: options.scrollElem
      });
    }
    
    // 不自动加载
    if(!isAuto) return that;
    
    // 滚动事件监听
    scrollElem.on('scroll', function(){
      // 获取当前容器, 并获取scrollTop值
      var othis = $(this), top = othis.scrollTop();
      
      // 如果存在定时器,则清除
      if(timer) clearTimeout(timer);
      // 资源加载完毕就退出
      if(isOver) return;
      
      timer = setTimeout(function(){
        //计算滚动所在容器的可视高度
        var height = notDocment ? othis.height() : $(window).height();
        
        //计算滚动所在容器的实际高度
        var scrollHeight = notDocment
          ? othis.prop('scrollHeight')
        : document.documentElement.scrollHeight;

        //临界点，当距离底部mb像素时，执行done()函数
        if(scrollHeight - top - height <= mb){
          lock || done();
        }
      }, 100);
    });
    return that;
  };
  
  //图片懒加载
  Flow.prototype.lazyimg = function(options){
    var that = this, index = 0, haveScroll;
    options = options || {};
    
    var scrollElem = $(options.scrollElem || document); //滚动条所在元素
    var elem = options.elem || 'img';
    
    //滚动条所在元素是否为document
    var notDocment = options.scrollElem && options.scrollElem !== document;
    
    //显示图片
    var show = function(item, height){
      // 获取scrollTop值
      // end: 表示当前滚动条距离底部的距离 end = scrollTop + clientHeight(或offsetHeight);
      var start = scrollElem.scrollTop(), end = start + height;
      var elemTop = notDocment ? function(){
        return item.offset().top - scrollElem.offset().top + start;
      }() : item.offset().top;

      /* 始终只加载在当前屏范围内的图片 */
      if(elemTop >= start && elemTop <= end){
        if(!item.attr('src')){
          var src = item.attr('lay-src');
          layui.img(src, function(){
            var next = that.lazyimg.elem.eq(index);
            item.attr('src', src).removeAttr('lay-src');
            
            /* 当前图片加载就绪后，检测下一个图片是否在当前屏 */
            next[0] && render(next);
            index++;
          });
        }
      }
    }, render = function(othis, scroll){
      
      //计算滚动所在容器的可视高度clientWidth
      var height = notDocment ? (scroll||scrollElem).height() : $(window).height();
      // start === scrollTop, end表示当前滚动条位置距离底部的距离
      var start = scrollElem.scrollTop(), end = start + height;

      // 获取所有的图片
      that.lazyimg.elem = $(elem);

      if(othis){        
        show(othis, height);
      } else {
        //计算未加载过的图片
        for(var i = 0; i < that.lazyimg.elem.length; i++){
          // 如果滚动条所在元素不是document, 就用img图片元素的偏移值 - 图片容器的偏移值 + 当前的scrollTop值
          // 否则就是图片自身的偏移值
          var item = that.lazyimg.elem.eq(i), elemTop = notDocment ? function(){
            return item.offset().top - scrollElem.offset().top + start;
          }() : item.offset().top;
          
          show(item, height);
          index = i;
          
          //如果图片的top坐标，超出了当前屏，则终止后续图片的遍历
          if(elemTop > end) break;
        }
      }
    };
    
    render();
    
    if(!haveScroll){
      var timer;
      scrollElem.on('scroll', function(){
        var othis = $(this);
        if(timer) clearTimeout(timer)
        timer = setTimeout(function(){
          render(null, othis);
        }, 50);
      }); 
      haveScroll = true;
    }
    return render;
  };
  
  //暴露接口
  exports('flow', new Flow());
});
