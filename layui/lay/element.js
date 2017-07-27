/**

 @Name：layui.element 常用元素操作
 @Author：贤心
 @License：MIT
    
 */
 
 // 保证jquery被加载
layui.define('jquery', function(exports){
  "use strict";
  
  // $: jQuery插件，hint: 错误信息提示, device: 检查当前设备的函数
  var $ = layui.jquery
  ,hint = layui.hint()
  ,device = layui.device()
  
  // 定义常量：MOD_NAME: 模块名, THIS: 保存layui-this类名(css类)、SHOW: css类名，用于显示
  ,MOD_NAME = 'element', THIS = 'layui-this', SHOW = 'layui-show'
  
  // 定义Element构造函数
  ,Element = function(){
    
    // config是配置参数对象
    this.config = {};
  };
  
  //全局设置，合并配置参数
  Element.prototype.set = function(options){
    var that = this;
    $.extend(true, that.config, options);
    return that;
  };
  
  //表单事件监听, 内部调用layui.event函数监听事件
  Element.prototype.on = function(events, callback){

    // 调用自定义的事件监听， events: 形式都是模块(lay-filter属性值)的形式
    return layui.onevent(MOD_NAME, events, callback);
  };
  
  //外部Tab新增, tab选项卡可以新增，使用lay-filter属性
  Element.prototype.tabAdd = function(filter, options){
    
    // layui-tab-title表示选项卡选项区域
    var TITLE = '.layui-tab-title'
    ,tabElem = $('.layui-tab[lay-filter='+ filter +']')
    // 获取title节点的DOM对象
    ,titElem = tabElem.children(TITLE)
    // 获取选项卡内容区域DOM对象
    ,contElem = tabElem.children('.layui-tab-content');
    // 创建title区域中的选项并追加到layui-tab-title标签下
    titElem.append('<li lay-id="'+ (options.id||'') +'">'+ (options.title||'unnaming') +'</li>');
    // 对应的创建内容区域并追加到layui-tab-content标签下
    contElem.append('<div class="layui-tab-item">'+ (options.content||'') +'</div>');
    call.hideTabMore(true);
    // tab自适应
    call.tabAuto();
    return this;
  };
  
  //外部Tab删除，可以删除的tab选项卡的处理程序
  Element.prototype.tabDelete = function(filter, layid){

    // tab选项卡的title区域css类名
    var TITLE = '.layui-tab-title'
    // tab选项卡DOM对象
    ,tabElem = $('.layui-tab[lay-filter='+ filter +']')
    // title区域DOM对象
    ,titElem = tabElem.children(TITLE)
    // 指定id的li, 可见tab删除的html中必须要加lay-id属性，它是唯一标识
    ,liElem = titElem.find('>li[lay-id="'+ layid +'"]');
    // 执行删除操作
    call.tabDelete(null, liElem);
    return this;
  };
  
  //外部Tab切换，tab选项卡切换的交互效果处理程序
  Element.prototype.tabChange = function(filter, layid){

    // 同上
    var TITLE = '.layui-tab-title'
    ,tabElem = $('.layui-tab[lay-filter='+ filter +']')
    ,titElem = tabElem.children(TITLE)
    ,liElem = titElem.find('>li[lay-id="'+ layid +'"]');
    // 具体的切换效果
    call.tabClick(null, null, liElem);
    return this;
  };
  
  //动态改变进度条, 精度条的交互效果处理程序
  Element.prototype.progress = function(filter, percent){

    // 获取进度条的相关DOM对象
    var ELEM = 'layui-progress'
    ,elem = $('.'+ ELEM +'[lay-filter='+ filter +']')
    ,elemBar = elem.find('.'+ ELEM +'-bar')
    ,text = elemBar.find('.'+ ELEM +'-text');
    // 百分比进度效果的处理
    elemBar.css('width', percent);
    text.text(percent);
    return this;
  };
  
  // 常量，主要是导航相关的css类
  var NAV_ELEM = '.layui-nav', NAV_ITEM = 'layui-nav-item', NAV_BAR = 'layui-nav-bar'
  ,NAV_TREE = 'layui-nav-tree', NAV_CHILD = 'layui-nav-child', NAV_MORE = 'layui-nav-more'
  ,NAV_ANIM = 'layui-anim layui-anim-upbit'
  
  //基础事件体，所有框架的页面元素的交互处理程序的主要代码
  ,call = {
    // Tab点击，选项卡点击，切换选项，切换内容区域
    // 其实就是动态添加css类:layui-this和layui-show
    tabClick: function(e, index, liElem){

      // 获取当前点击的选项的DOM对象
      var othis = liElem || $(this)
      // 当前选项的序号
      ,index = index || othis.parent().children('li').index(othis)
      // 获取layui-tab容器的DOM节点
      ,parents = othis.parents('.layui-tab').eq(0)
      // 获取内容区所有内容区域
      ,item = parents.children('.layui-tab-content').children('.layui-tab-item')
      // 获取lay-filter属性的值，主要用于事件精准匹配上面
      ,filter = parents.attr('lay-filter');
      
      // 给当前点击的选项添加layui-this类，移除其他元素的该类
      othis.addClass(THIS).siblings().removeClass(THIS);
      // 通过index来找出指定选项卡的内容区并添加layui-show类，移除其他兄弟元素的layui-show类
      item.eq(index).addClass(SHOW).siblings().removeClass(SHOW);
      
      // 执行自定义事件，用于切换选项卡之后想要执行的其他操作的处理，例如想要获取相关数据
      layui.event.call(this, MOD_NAME, 'tab('+ filter +')', {
        elem: parents
        ,index: index
      });
    }
    
    //Tab删除
    ,tabDelete: function(e, othis){
      
      // 同上
      var li = othis || $(this).parent(), index = li.index();
      var parents = li.parents('.layui-tab').eq(0);
      var item = parents.children('.layui-tab-content').children('.layui-tab-item')
      
      // 当删除选项卡时，如果选项卡是当前选项卡的处理
      if(li.hasClass(THIS)){
        // 就切换当前选项卡到下一个选项或前一个选项
        if(li.next()[0]){
          // 改变tabClick的this为下一个选项卡的DOM对象，序号加1
          call.tabClick.call(li.next()[0], null, index + 1);
        } else if(li.prev()[0]){
          call.tabClick.call(li.prev()[0], null, index - 1);
        }
      }
      
      // 删除选中的选项卡
      li.remove();
      // 删除选项卡的内容区
      item.eq(index).remove();
      // 定时器，50毫秒之后执行tabAuto函数，该函数是Tab自适应
      setTimeout(function(){
        call.tabAuto();
      }, 50);
    }
    
    //Tab自适应
    ,tabAuto: function(){
      
      // 常量,tab相关
      var SCROLL = 'layui-tab-scroll', MORE = 'layui-tab-more', BAR = 'layui-tab-bar'
      ,CLOSE = 'layui-tab-close', that = this;
      
      // 获取所有存在.layui-table的类的选项卡
      $('.layui-tab').each(function(){
        
        // 获取title区域DOM节点，tab容器的DOM节点以及所有的内容区域DOM节点
        var othis = $(this)
        ,title = othis.children('.layui-tab-title')
        ,item = othis.children('.layui-tab-content').children('.layui-tab-item')
        ,STOPE = 'lay-stope="tabmore"'
        ,span = $('<span class="layui-unselect layui-tab-bar" '+ STOPE +'><i '+ STOPE +' class="layui-icon">&#xe61a;</i></span>');
        
        if(that === window && device.ie != 8){
          call.hideTabMore(true)
        }
        
        //允许关闭，如果存在可删除的属性
        if(othis.attr('lay-allowClose')){
          title.find('li').each(function(){
            var li = $(this);
            if(!li.find('.'+CLOSE)[0]){
              var close = $('<i class="layui-icon layui-unselect '+ CLOSE +'">&#x1006;</i>');
              close.on('click', call.tabDelete);
              li.append(close);
            }
          });
        }
        
        //响应式
        if(title.prop('scrollWidth') > title.outerWidth()+1){
          if(title.find('.'+BAR)[0]) return;
          title.append(span);
          othis.attr('overflow', '');
          span.on('click', function(e){
            title[this.title ? 'removeClass' : 'addClass'](MORE);
            this.title = this.title ? '' : '收缩';
          });
        } else {
          title.find('.'+BAR).remove();
          othis.removeAttr('overflow');
        }
      });
    }

    //隐藏更多Tab，该方法主要是tab数量比较多时调用
    ,hideTabMore: function(e){
      
      // 获取选项卡title区域
      var tsbTitle = $('.layui-tab-title');
      // 如果为true，或者lay-scope的属性值是tabmore
      if(e === true || $(e.target).attr('lay-stope') !== 'tabmore'){
        // 删除layui-tab-more类
        tsbTitle.removeClass('layui-tab-more');
        tsbTitle.find('.layui-tab-bar').attr('title','');
      }
    }
    
    //点击选中
    ,clickThis: function(){
      var othis = $(this), parents = othis.parents(NAV_ELEM)
      ,filter = parents.attr('lay-filter');
      
      if(othis.find('.'+NAV_CHILD)[0]) return;
      parents.find('.'+THIS).removeClass(THIS);
      othis.addClass(THIS);
      layui.event.call(this, MOD_NAME, 'nav('+ filter +')', othis);
    }
    //点击子菜单选中
    ,clickChild: function(){
      var othis = $(this), parents = othis.parents(NAV_ELEM)
      ,filter = parents.attr('lay-filter');
      parents.find('.'+THIS).removeClass(THIS);
      othis.addClass(THIS);
      layui.event.call(this, MOD_NAME, 'nav('+ filter +')', othis);
    }
    //展开二级菜单
    ,showChild: function(){
      var othis = $(this), parents = othis.parents(NAV_ELEM);
      var parent = othis.parent(), child = othis.siblings('.'+NAV_CHILD);
      if(parents.hasClass(NAV_TREE)){
        child.removeClass(NAV_ANIM);
        parent[child.css('display') === 'none' ? 'addClass': 'removeClass'](NAV_ITEM+'ed');
      }
    }
    
    //折叠面板
    ,collapse: function(){

      // 获取当前面板，以及内容区DOM对象，lay-filter属性值，内容区域是否关闭
      var othis = $(this), icon = othis.find('.layui-colla-icon')
      ,elemCont = othis.siblings('.layui-colla-content')
      ,parents = othis.parents('.layui-collapse').eq(0)
      ,filter = parents.attr('lay-filter')
      ,isNone = elemCont.css('display') === 'none';
      //是否手风琴，始终保持一个面板项展开
      if(typeof parents.attr('lay-accordion') === 'string'){
        var show = parents.children('.layui-colla-item').children('.'+SHOW);
        show.siblings('.layui-colla-title').children('.layui-colla-icon').html('&#xe602;');
        show.removeClass(SHOW);
      }

      elemCont[isNone ? 'addClass' : 'removeClass'](SHOW);
      icon.html(isNone ? '&#xe61a;' : '&#xe602;');
      
      // 注册collapse(`filter`)事件
      layui.event.call(this, MOD_NAME, 'collapse('+ filter +')', {
        title: othis
        ,content: elemCont
        ,show: isNone
      });
    }
  };
  
  //初始化元素操作
  Element.prototype.init = function(type){
    var that = this, items = {
      
      // Tab选项卡的初始化
      tab: function(){
        call.tabAuto.call({});
      }
      
      // 导航菜单
      ,nav: function(){
        var TIME = 200, timer, timerMore, timeEnd, follow = function(bar, nav){
          var othis = $(this), child = othis.find('.'+NAV_CHILD);
          
          if(nav.hasClass(NAV_TREE)){
            bar.css({
              top: othis.position().top
              ,height: othis.children('a').height()
              ,opacity: 1
            });
          } else {
            child.addClass(NAV_ANIM);
            bar.css({
              left: othis.position().left + parseFloat(othis.css('marginLeft'))
              ,top: othis.position().top + othis.height() - 5
            });
            
            timer = setTimeout(function(){
              bar.css({
                width: othis.width()
                ,opacity: 1
              });
            }, device.ie && device.ie < 10 ? 0 : TIME);
            
            clearTimeout(timeEnd);
            if(child.css('display') === 'block'){
              clearTimeout(timerMore);
            }
            timerMore = setTimeout(function(){
              child.addClass(SHOW)
              othis.find('.'+NAV_MORE).addClass(NAV_MORE+'d');
            }, 300);
          }
        }
        
        $(NAV_ELEM).each(function(){
          var othis = $(this)
          ,bar = $('<span class="'+ NAV_BAR +'"></span>')
          ,itemElem = othis.find('.'+NAV_ITEM);
          
          //Hover滑动效果
          if(!othis.find('.'+NAV_BAR)[0]){
            othis.append(bar);
            itemElem.on('mouseenter', function(){
              follow.call(this, bar, othis);
            }).on('mouseleave', function(){
              if(!othis.hasClass(NAV_TREE)){
                clearTimeout(timerMore);
                timerMore = setTimeout(function(){
                  othis.find('.'+NAV_CHILD).removeClass(SHOW);
                  othis.find('.'+NAV_MORE).removeClass(NAV_MORE+'d');
                }, 300);
              }
            });
            othis.on('mouseleave', function(){
              clearTimeout(timer)
              timeEnd = setTimeout(function(){
                if(othis.hasClass(NAV_TREE)){
                  bar.css({
                    height: 0
                    ,top: bar.position().top + bar.height()/2
                    ,opacity: 0
                  });
                } else {
                  bar.css({
                    width: 0
                    ,left: bar.position().left + bar.width()/2
                    ,opacity: 0
                  });
                }
              }, TIME);
            });
          }
          
          itemElem.each(function(){
            var oitem = $(this), child = oitem.find('.'+NAV_CHILD);
            
            //二级菜单
            if(child[0] && !oitem.find('.'+NAV_MORE)[0]){
              var one = oitem.children('a');
              one.append('<span class="'+ NAV_MORE +'"></span>');
            }
            
            oitem.off('click', call.clickThis).on('click', call.clickThis); //点击选中
            oitem.children('a').off('click', call.showChild).on('click', call.showChild); //展开二级菜单
            child.children('dd').off('click', call.clickChild).on('click', call.clickChild); //点击子菜单选中
          });
        });
      }
      
      //面包屑
      ,breadcrumb: function(){

        // 常量，保存layui-breadcrumb
        var ELEM = '.layui-breadcrumb';
        
        // 获取指定类的DOM节点
        $(ELEM).each(function(){
          var othis = $(this)
          // 获取lay-separator属性值
          ,separator = othis.attr('lay-separator') || '>'
          // 获取该面包屑下所有的a标签
          ,aNode = othis.find('a');
          if(aNode.find('.layui-box')[0]) return;
          // 在a标签下追加span标签，用于存放分割符
          aNode.each(function(index){
            if(index === aNode.length - 1) return;
            $(this).append('<span class="layui-box">'+ separator +'</span>');
          });
          // 设置面包屑可见
          othis.css('visibility', 'visible');
        });
      }
      
      //进度条
      ,progress: function(){
        
        // 常量，进度条容器类名
        var ELEM = 'layui-progress';
        // 获取所有的精度条，并设置相关样式
        $('.'+ELEM).each(function(){
          var othis = $(this)
          ,elemBar = othis.find('.layui-progress-bar')
          ,width = elemBar.attr('lay-percent');
          elemBar.css('width', width);
          // 如果存在lay-showPercent属性
          if(othis.attr('lay-showPercent')){
            setTimeout(function(){
              // 获取bar长度与容器长度的比值
              var percent = Math.round(elemBar.width()/othis.width()*100);
              if(percent > 100) percent = 100;
              elemBar.html('<span class="'+ ELEM +'-text">'+ percent +'%</span>');
            },350);
          }
        });
      }
      
      //折叠面板
      ,collapse: function(){
        // 折叠面板的class类
        var ELEM = 'layui-collapse';
        
        // 获取所有的折叠面板DOM对象，并遍历分别进行处理
        $('.'+ELEM).each(function(){
          // 获取面板中每一条元素
          var elemItem = $(this).find('.layui-colla-item')
          // 遍历分别处理
          elemItem.each(function(){
            var othis = $(this)
            // 标题DOM对象，内容区域DOM对象
            ,elemTitle = othis.find('.layui-colla-title')
            ,elemCont = othis.find('.layui-colla-content')
            // 内容区域是否处于关闭状态
            ,isNone = elemCont.css('display') === 'none';
            
            //初始状态
            elemTitle.find('.layui-colla-icon').remove();
            elemTitle.append('<i class="layui-icon layui-colla-icon">'+ (isNone ? '&#xe602;' : '&#xe61a;') +'</i>');

            //点击标题，展开或关闭内容区
            elemTitle.off('click', call.collapse).on('click', call.collapse);
          });     
         
        });
      }
    };

    // layui.each遍历items，就是选项卡等的初始化工作
    return layui.each(items, function(index, item){
      item();
    });
  };

  // 根据构造函数创建对象,并开启初始化工作
  var element = new Element(), dom = $(document);
  element.init();
  
  // 常量，选项卡li选项
  var TITLE = '.layui-tab-title li';
  // JQuery对于title区域绑定click事件
  dom.on('click', TITLE, call.tabClick); //Tab切换
  dom.on('click', call.hideTabMore); //隐藏展开的Tab
  // 选项卡随着页面自适应
  $(window).on('resize', call.tabAuto); //自适应
  
  /*
    exports = function(app, exports) {
      layui[app] = exports;
      config.status[app] = true;
    }
    那么此处：
    layui.element = fucntion(options) {
      return element.set(options);
    }
    所以调用element时有layui.element()方式，可以传递options配置参数
   */
  exports(MOD_NAME, function(options){
    return element.set(options);
  });
});

