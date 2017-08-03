/**

 @Name：layui.layedit 富文本编辑器
 @Author：贤心
 @License：MIT
    
 */
 
layui.define(['layer', 'form'], function(exports){
  "use strict";
  
  var $ = layui.jquery
  ,layer = layui.layer
  ,form = layui.form()
  ,hint = layui.hint()
  ,device = layui.device()
  
  ,MOD_NAME = 'layedit', THIS = 'layui-this', SHOW = 'layui-show', ABLED = 'layui-disabled'
  
  // 构造函数
  ,Edit = function(){
    var that = this;
    that.index = 0;
    
    //全局配置
    that.config = {
      //默认工具bar
      tool: [
        'strong', 'italic', 'underline', 'del'
        ,'|'
        ,'left', 'center', 'right'
        ,'|'
        ,'link', 'unlink', 'face', 'image'
      ]
      ,hideTool: []
      ,height: 280 //默认高
    };
  };
  
  //全局设置，合并参数
  Edit.prototype.set = function(options){
    var that = this;
    $.extend(true, that.config, options);
    return that;
  };
  
  //事件监听
  Edit.prototype.on = function(events, callback){
    return layui.onevent(MOD_NAME, events, callback);
  };
  
  //建立编辑器
  Edit.prototype.build = function(id, settings){
    // settings：配置参数
    settings = settings || {};
    
    var that = this
    // 获取配置参数对象
    ,config = that.config
    // 根据传入的id值获取该id属性的标签的DOM对象，一般就是textarea文本域
    // layui-layedit：文本编辑器class类
    ,ELEM = 'layui-layedit', textArea = $('#'+id)
    // 每次build时，文本编辑器的name都是不用，处理层次问题
    ,name =  'LAY_layedit_'+ (++that.index)
    // 查找textarea节点后同级有class为layui-layedit的元素
    ,haveBuild = textArea.next('.'+ELEM)
    
    // 合并参数
    ,set = $.extend({}, config, settings)
    
    // 富文本编辑器的工具栏部分
    ,tool = function(){
      var node = [], hideTools = {};
      // 根据配置参数中hideTool（表示没有配置出现的工具项）
      layui.each(set.hideTool, function(_, item){
        hideTools[item] = true;
      });
      // 查找tools中指定配置的选项名，并将其htmljie和icon相关存到node数组中
      layui.each(set.tool, function(_, item){
        if(tools[item] && !hideTools[item]){
          node.push(tools[item]);
        }
      });
      // 将数组中元素输出为字符串
      return node.join('');
    }()
 
    // 构建富文本编辑器的主体结构
    /**
     * 可见主体结构为
     * 文本编辑器容器：div.layui-layedit
     * 文本编辑器工具栏：div.layui-unselect.layui-layedit-tool
     * 文本编辑器内容区容器：div.layui-layedit-iframe（该内容容器下使用iframe作为内容区）
     */
    ,editor = $(['<div class="'+ ELEM +'">'
      ,'<div class="layui-unselect layui-layedit-tool">'+ tool +'</div>'
      ,'<div class="layui-layedit-iframe">'
        ,'<iframe id="'+ name +'" name="'+ name +'" textarea="'+ id +'" frameborder="0"></iframe>'
      ,'</div>'
    ,'</div>'].join(''))
    
    //编辑器不兼容ie8以下
    if(device.ie && device.ie < 8){
      // IE8下textarea文本域显示出来
      return textArea.removeClass('layui-hide').addClass(SHOW);
    }

    // 获取textarea文本框后存在同级layui-layedit的节点，就删除存在的文本编辑器
    haveBuild[0] && (haveBuild.remove());

    // 调用setIframe设置iframe相关
    /**
     * editor: 整体的html结构
     * textArea[0]: textarea文本框
     * set: 配置参数
     */
    setIframe.call(that, editor, textArea[0], set)
    // 在textArea后插入editor节点
    textArea.addClass('layui-hide').after(editor);

    return that.index;
  };
  
  //获得编辑器中html以及文本内容
  Edit.prototype.getContent = function(index){
    var iframeWin = getWin(index);
    if(!iframeWin[0]) return;
    return toLower(iframeWin[0].document.body.innerHTML);
  };
  
  //获得编辑器中纯文本内容
  Edit.prototype.getText = function(index){
    var iframeWin = getWin(index);
    if(!iframeWin[0]) return;
    return $(iframeWin[0].document.body).text();
  };
  /**
   * 设置编辑器内容
   * @param {[type]} index   编辑器索引
   * @param {[type]} content 要设置的内容
   * @param {[type]} flag    是否追加模式
   */
  Edit.prototype.setContent = function(index, content, flag){
    var iframeWin = getWin(index);
    if(!iframeWin[0]) return;
    if(flag){
      $(iframeWin[0].document.body).append(content)
    }else{
      $(iframeWin[0].document.body).html(content)
    };
    layedit.sync(index)
  };
  //将编辑器内容同步到textarea（一般用于异步提交时）
  Edit.prototype.sync = function(index){
    var iframeWin = getWin(index);
    if(!iframeWin[0]) return;
    var textarea = $('#'+iframeWin[1].attr('textarea'));
    textarea.val(toLower(iframeWin[0].document.body.innerHTML));
  };
  
  //获取编辑器选中内容
  Edit.prototype.getSelection = function(index){
    // 获取iframe标签的DOM节点
    var iframeWin = getWin(index);
    if(!iframeWin[0]) return;
    // 获取selection对象，该对象可以获取右键拖拽选择的文本
    var range = Range(iframeWin[0].document);
    return document.selection ? range.text : range.toString();
  };

  //iframe初始化，设置iframe中的样式，绑定事件
  var setIframe = function(editor, textArea, set){
    // editor：文本编辑器DOM节点，iframe是富文本编辑器的内容区
    var that = this, iframe = editor.find('iframe');

    // 根据配置参数对iframe所代表的内容区进行设置其高度并监听load事件
    iframe.css({
      height: set.height
    }).on('load', function(){
      // 获取iframe中所有的子节点，包括文本节点
      var conts = iframe.contents()
      // 获取iframe的window对象
      ,iframeWin = iframe.prop('contentWindow')
      // 寻找iframe中head子节点
      ,head = conts.find('head')
      // 创建style节点
      ,style = $(['<style>'
        ,'*{margin: 0; padding: 0;}'
        ,'body{padding: 10px; line-height: 20px; overflow-x: hidden; word-wrap: break-word; font: 14px Helvetica Neue,Helvetica,PingFang SC,Microsoft YaHei,Tahoma,Arial,sans-serif; -webkit-box-sizing: border-box !important; -moz-box-sizing: border-box !important; box-sizing: border-box !important;}'
        ,'a{color:#01AAED; text-decoration:none;}a:hover{color:#c00}'
        ,'p{margin-bottom: 10px;}'
        ,'img{display: inline-block; border: none; vertical-align: middle;}'
        ,'pre{margin: 10px 0; padding: 10px; line-height: 20px; border: 1px solid #ddd; border-left-width: 6px; background-color: #F2F2F2; color: #333; font-family: Courier New; font-size: 12px;}'
      ,'</style>'].join(''))
      // 获取body节点
      ,body = conts.find('body');
      
      // 绑定style节点到head下
      head.append(style);
      // 设置body标签可编辑属性，并根据配置参数中height设置页面最小高度
      // 获取textarea文本框的内容到body中
      body.attr('contenteditable', 'true').css({
        'min-height': set.height
      }).html(textArea.value||'');

      // 设置body、iframe以及textArea相关快捷键的处理
      hotkey.apply(that, [iframeWin, iframe, textArea, set]); 
      // 工具条事件绑定及处理程序
      toolActive.call(that, iframeWin, editor, set); 
    });
  }
  
  //获得iframe窗口对象
  ,getWin = function(index){
    // 每次build就会创建一个富文本编辑器,iframe的id就是LAY_layedit_ + index的值
    // 获取iframe节点
    var iframe = $('#LAY_layedit_'+ index)
    // 获取iframe的window对象
    ,iframeWin = iframe.prop('contentWindow');
    // 返回iframe节点以及iframe下的window对象
    return [iframeWin, iframe];
  }
  
  //IE8下将标签处理成小写
  ,toLower = function(html){
    if(device.ie == 8){
      html = html.replace(/<.+>/g, function(str){
        return str.toLowerCase();
      });
    }
    return html;
  }
  
  //快捷键处理, iframeWin: iframe中的window对象,iframe：dom节点，textArea：文本框节点，set：配置参数
  ,hotkey = function(iframeWin, iframe, textArea, set){
    // 获取iframe的document，从而获取body节点
    var iframeDOM = iframeWin.document, body = $(iframeDOM.body);
    // 绑定键盘按键按下
    body.on('keydown', function(e){
      // 获取按键的code值
      var keycode = e.keyCode;
      //处理回车按键
      if(keycode === 13){
        // selection文本选择相关的对象
        var range = Range(iframeDOM);
        var container = getContainer(range)
        ,parentNode = container.parentNode;
        
        if(parentNode.tagName.toLowerCase() === 'pre'){
          if(e.shiftKey) return
          layer.msg('请暂时用shift+enter');
          return false;
        }
        // exexCommand方法，实现文本变粗、斜体、下划线等都是通过这个方法来实现
        /**
         * 这里重点讲下该方法
         * 当html文档切换到设计模式时，文档对象暴露execCommand方法，当使用contentEditable时，
         * 就会暴露出该方法
         * 该方法的功能是：
         *    允许运行命令来操作可编辑区域的内容
         * 语法：
         *  document.execCommand(命令名称(string), 是否显示用户界面, 命令的参数值)
         * 命令常用的有：
         *  bold: 变粗
         *  cut: 剪切当前选中文字
         *  fontName: 修改选中文字字体
         *  fontSize: 修改选中文字字体大小
         *  formatBlock: 添加块状标签在包含当前选择行，如果存在更换包含改行的块状元素
         *  等，其他命令见
         *  https://developer.mozilla.org/zh-CN/docs/Web/API/Document/execCommand
         */
        iframeDOM.execCommand('formatBlock', false, '<p>');
      }
    });
    
    //给textarea同步内容，将iframe中的body内容同步到textarea文本域中
    $(textArea).parents('form').on('submit', function(){
      var html = body.html();
      //IE8下将标签处理成小写
      if(device.ie == 8){
        html = html.replace(/<.+>/g, function(str){
          return str.toLowerCase();
        });
      }
      textArea.value = html;
    });
    
    //处理粘贴事件，内容区粘贴是触发该处理程序
    body.on('paste', function(e){
      // 加上p标签包裹内容
      iframeDOM.execCommand('formatBlock', false, '<p>');
      setTimeout(function(){
        // 过滤标签，将body内容复制到textArea中
        filter.call(iframeWin, body);
        textArea.value = body.html();
      }, 100); 
    });
  }
  
  //标签过滤
  ,filter = function(body){
    // 获取
    var iframeWin = this
    ,iframeDOM = iframeWin.document;
    
    //清除影响版面的css属性
    // 查找body中所有有style属性的标签
    body.find('*[style]').each(function(){
      // 获取其text-align的样式值
      var textAlign = this.style.textAlign;
      // 移除style属性
      this.removeAttribute('style');
      // 设置text-align的样式
      $(this).css({
        'text-align': textAlign || ''
      })
    });
    
    //修饰表格，表格都加上layui-table的样式
    body.find('table').addClass('layui-table');
    
    //移除不安全的标签body和link
    body.find('script,link').remove();
  }
  
  //Range对象兼容性处理
  ,Range = function(iframeDOM){
    // 使用selection来获取文本的选择
    return iframeDOM.selection 
      ? iframeDOM.selection.createRange()
    : iframeDOM.getSelection().getRangeAt(0);
  }
  
  //当前Range对象的endContainer兼容性处理
  ,getContainer = function(range){
    return range.endContainer || range.parentElement().childNodes[0]
  }
  
  //在选区插入内联元素
  ,insertInline = function(tagName, attr, range){
    var iframeDOM = this.document
    ,elem = document.createElement(tagName)
    for(var key in attr){
      elem.setAttribute(key, attr[key]);
    }
    elem.removeAttribute('text');

    if(iframeDOM.selection){ //IE
      var text = range.text || attr.text;
      if(tagName === 'a' && !text) return;
      if(text){
        elem.innerHTML = text;
      }
      range.pasteHTML($(elem).prop('outerHTML')); 
      range.select();
    } else { //非IE
      var text = range.toString() || attr.text;
      if(tagName === 'a' && !text) return;
      if(text){
        elem.innerHTML = text;
      }
      range.deleteContents();
      range.insertNode(elem);
    }
  }
  
  //工具选中
  ,toolCheck = function(tools, othis){
    var iframeDOM = this.document
    ,CHECK = 'layedit-tool-active'
    ,container = getContainer(Range(iframeDOM))
    ,item = function(type){
      return tools.find('.layedit-tool-'+type)
    }

    // 判断当前点击的工具是否刚被点击过，是则移除当前选择标志，没有则加上当前选择标志
    if(othis){
      othis[othis.hasClass(CHECK) ? 'removeClass' : 'addClass'](CHECK);
    }
    
    // 移除工具栏中所有被标志为当前选择的class类
    tools.find('>i').removeClass(CHECK);
    // 获取从工具栏中layedit-tools-unlink的节点并加上标志为layui-disabled
    item('unlink').addClass(ABLED);

    $(container).parents().each(function(){
      var tagName = this.tagName.toLowerCase()
      ,textAlign = this.style.textAlign;

      //文字,粗体、斜体、下划线等
      if(tagName === 'b' || tagName === 'strong'){
        // layui-tools-b .layedit-tool-active
        item('b').addClass(CHECK)
      }
      if(tagName === 'i' || tagName === 'em'){
        item('i').addClass(CHECK)
      }
      if(tagName === 'u'){
        item('u').addClass(CHECK)
      }
      if(tagName === 'strike'){
        item('d').addClass(CHECK)
      }
      
      //对齐，左对齐、右对齐、居中
      if(tagName === 'p'){
        if(textAlign === 'center'){
          item('center').addClass(CHECK);
        } else if(textAlign === 'right'){
          item('right').addClass(CHECK);
        } else {
          item('left').addClass(CHECK);
        }
      }
      
      //超链接
      if(tagName === 'a'){
        item('link').addClass(CHECK);
        item('unlink').removeClass(ABLED);
      }
    });
  }

  //触发工具
  ,toolActive = function(iframeWin, editor, set){
    // iframe中窗口的document对象
    var iframeDOM = iframeWin.document
    // body
    ,body = $(iframeDOM.body)
    ,toolEvent = {
      //超链接
      link: function(range){
        var container = getContainer(range)
        ,parentNode = $(container).parent();
        
        // 调用link函数，设置link相关
        link.call(body, {
          href: parentNode.attr('href')
          ,target: parentNode.attr('target')
        }, function(field){
          var parent = parentNode[0];
          if(parent.tagName === 'A'){
            parent.href = field.url;
          } else {
            // 调用insertInline函数
            insertInline.call(iframeWin, 'a', {
              target: field.target
              ,href: field.url
              ,text: field.url
            }, range);
          }
        });
      }
      //清除超链接
      ,unlink: function(range){
        iframeDOM.execCommand('unlink');
      }
      //表情
      ,face: function(range){
        // 调用face函数
        face.call(this, function(img){
          insertInline.call(iframeWin, 'img', {
            src: img.src
            ,alt: img.alt
          }, range);
        });
      }
      //图片
      ,image: function(range){
        var that = this;
        layui.use('upload', function(upload){
          var uploadImage = set.uploadImage || {};
          upload({
            url: uploadImage.url
            ,method: uploadImage.type
            ,elem: $(that).find('input')[0]
            ,unwrap: true
            ,success: function(res){
              if(res.code == 0){
                res.data = res.data || {};
                insertInline.call(iframeWin, 'img', {
                  src: res.data.src
                  ,alt: res.data.title
                }, range);
              } else {
                layer.msg(res.msg||'上传失败');
              }
            }
          });
        });
      }
      //插入代码
      ,code: function(range){
        code.call(body, function(pre){
          insertInline.call(iframeWin, 'pre', {
            text: pre.code
            ,'lay-lang': pre.lang
          }, range);
        });
      }
      //帮助
      ,help: function(){
        layer.open({
          type: 2
          ,title: '帮助'
          ,area: ['600px', '380px']
          ,shadeClose: true
          ,shade: 0.1
          ,skin: 'layui-layer-msg'
          ,content: ['http://www.layui.com/about/layedit/help.html', 'no']
        });
      }
    }
    // 找到工具栏节点
    ,tools = editor.find('.layui-layedit-tool')
    
    // 工具栏中各工具的点击事件的处理程序
    ,click = function(){
      var othis = $(this)
      // 获取事件名以及命令名（execCommond中的命令）
      ,events = othis.attr('layedit-event')
      ,command = othis.attr('lay-command');
      
      // 如果该工具项不可用，则结束函数
      if(othis.hasClass(ABLED)) return;
      
      // body获取焦点
      body.focus();
      // 获取Range对象，用于文本选择的获取
      // commonAncestorContainer：范围的开始点和结束点的（即它们的祖先节点）、嵌套最深的 Document 节点。
      var range = Range(iframeDOM)
      ,container = range.commonAncestorContainer
      
      if(command){
        // 执行相关命令
        iframeDOM.execCommand(command);
        // 如果命令是 左对齐、右对齐或居中对齐
        if(/justifyLeft|justifyCenter|justifyRight/.test(command)){
          // 添加p标签包含iframe中的文档
          iframeDOM.execCommand('formatBlock', false, '<p>');
        }
        // 10毫秒后使得body再次获得焦点
        setTimeout(function(){
          body.focus();
        }, 10);
      } else {
        // 工具栏事件（除了文本操作相关的事件外，例如link等需要特殊处理的事件）
        toolEvent[events] && toolEvent[events].call(this, range);
      }
      // 处理选择过后的背景显示
      toolCheck.call(iframeWin, tools, othis);
    }
    
    ,isClick = /image/

    // 给工具栏上工具绑定mousedown事件以及click事件
    tools.find('>i').on('mousedown', function(){
      var othis = $(this)
      ,events = othis.attr('layedit-event');
      if(isClick.test(events)) return;
      click.call(this)
    }).on('click', function(){
      var othis = $(this)
      ,events = othis.attr('layedit-event');
      if(!isClick.test(events)) return;
      click.call(this)
    });
    
    //触发内容区域
    body.on('click', function(){
      toolCheck.call(iframeWin, tools);
      layer.close(face.index);
    });
  }
  
  //超链接面板
  ,link = function(options, callback){
    // 构建link点击后的面板以及相关事件处理
    var body = this, index = layer.open({
      type: 1
      ,id: 'LAY_layedit_link'
      ,area: '350px'
      ,shade: 0.05
      ,shadeClose: true
      ,moveType: 1
      ,title: '超链接'
      ,skin: 'layui-layer-msg'
      ,content: ['<ul class="layui-form" style="margin: 15px;">'
        ,'<li class="layui-form-item">'
          ,'<label class="layui-form-label" style="width: 60px;">URL</label>'
          ,'<div class="layui-input-block" style="margin-left: 90px">'
            ,'<input name="url" lay-verify="url" value="'+ (options.href||'') +'" autofocus="true" autocomplete="off" class="layui-input">'
            ,'</div>'
        ,'</li>'
        ,'<li class="layui-form-item">'
          ,'<label class="layui-form-label" style="width: 60px;">打开方式</label>'
          ,'<div class="layui-input-block" style="margin-left: 90px">'
            ,'<input type="radio" name="target" value="_self" class="layui-input" title="当前窗口"'
            + ((options.target==='_self' || !options.target) ? 'checked' : '') +'>'
            ,'<input type="radio" name="target" value="_blank" class="layui-input" title="新窗口" '
            + (options.target==='_blank' ? 'checked' : '') +'>'
          ,'</div>'
        ,'</li>'
        ,'<li class="layui-form-item" style="text-align: center;">'
          ,'<button type="button" lay-submit lay-filter="layedit-link-yes" class="layui-btn"> 确定 </button>'
          ,'<button style="margin-left: 20px;" type="button" class="layui-btn layui-btn-primary"> 取消 </button>'
        ,'</li>'
      ,'</ul>'].join('')
      ,success: function(layero, index){
        var eventFilter = 'submit(layedit-link-yes)';
        form.render('radio');  
        layero.find('.layui-btn-primary').on('click', function(){
          layer.close(index);
          body.focus();
        });
        form.on(eventFilter, function(data){
          layer.close(link.index);
          callback && callback(data.field);
        });
      }
    });
    link.index = index;
  }
  
  //表情面板
  ,face = function(callback){
    //表情库
    var faces = function(){
      var alt = ["[微笑]", "[嘻嘻]", "[哈哈]", "[可爱]", "[可怜]", "[挖鼻]", "[吃惊]", "[害羞]", "[挤眼]", "[闭嘴]", "[鄙视]", "[爱你]", "[泪]", "[偷笑]", "[亲亲]", "[生病]", "[太开心]", "[白眼]", "[右哼哼]", "[左哼哼]", "[嘘]", "[衰]", "[委屈]", "[吐]", "[哈欠]", "[抱抱]", "[怒]", "[疑问]", "[馋嘴]", "[拜拜]", "[思考]", "[汗]", "[困]", "[睡]", "[钱]", "[失望]", "[酷]", "[色]", "[哼]", "[鼓掌]", "[晕]", "[悲伤]", "[抓狂]", "[黑线]", "[阴险]", "[怒骂]", "[互粉]", "[心]", "[伤心]", "[猪头]", "[熊猫]", "[兔子]", "[ok]", "[耶]", "[good]", "[NO]", "[赞]", "[来]", "[弱]", "[草泥马]", "[神马]", "[囧]", "[浮云]", "[给力]", "[围观]", "[威武]", "[奥特曼]", "[礼物]", "[钟]", "[话筒]", "[蜡烛]", "[蛋糕]"], arr = {};
      layui.each(alt, function(index, item){
        arr[item] = layui.cache.dir + 'images/face/'+ index + '.gif';
      });
      return arr;
    }();
    face.hide = face.hide || function(e){
      if($(e.target).attr('layedit-event') !== 'face'){
        layer.close(face.index);
      }
    }
    return face.index = layer.tips(function(){
      var content = [];
      layui.each(faces, function(key, item){
        content.push('<li title="'+ key +'"><img src="'+ item +'" alt="'+ key +'"></li>');
      });
      return '<ul class="layui-clear">' + content.join('') + '</ul>';
    }(), this, {
      tips: 1
      ,time: 0
      ,skin: 'layui-box layui-util-face'
      ,maxWidth: 500
      ,success: function(layero, index){
        layero.css({
          marginTop: -4
          ,marginLeft: -10
        }).find('.layui-clear>li').on('click', function(){
          callback && callback({
            src: faces[this.title]
            ,alt: this.title
          });
          layer.close(index);
        });
        // 处理事件重复问题
        $(document).off('click', face.hide).on('click', face.hide);
      }
    });
  }
  
  //插入代码面板
  ,code = function(callback){
    var body = this, index = layer.open({
      type: 1
      ,id: 'LAY_layedit_code'
      ,area: '550px'
      ,shade: 0.05
      ,shadeClose: true
      ,moveType: 1
      ,title: '插入代码'
      ,skin: 'layui-layer-msg'
      ,content: ['<ul class="layui-form layui-form-pane" style="margin: 15px;">'
        ,'<li class="layui-form-item">'
          ,'<label class="layui-form-label">请选择语言</label>'
          ,'<div class="layui-input-block">'
            ,'<select name="lang">'
              ,'<option value="JavaScript">JavaScript</option>'
              ,'<option value="HTML">HTML</option>'
              ,'<option value="CSS">CSS</option>'
              ,'<option value="Java">Java</option>'
              ,'<option value="PHP">PHP</option>'
              ,'<option value="C#">C#</option>'
              ,'<option value="Python">Python</option>'
              ,'<option value="Ruby">Ruby</option>'
              ,'<option value="Go">Go</option>'
            ,'</select>'
          ,'</div>'
        ,'</li>'
        ,'<li class="layui-form-item layui-form-text">'
          ,'<label class="layui-form-label">代码</label>'
          ,'<div class="layui-input-block">'
            ,'<textarea name="code" lay-verify="required" autofocus="true" class="layui-textarea" style="height: 200px;"></textarea>'
          ,'</div>'
        ,'</li>'
        ,'<li class="layui-form-item" style="text-align: center;">'
          ,'<button type="button" lay-submit lay-filter="layedit-code-yes" class="layui-btn"> 确定 </button>'
          ,'<button style="margin-left: 20px;" type="button" class="layui-btn layui-btn-primary"> 取消 </button>'
        ,'</li>'
      ,'</ul>'].join('')
      ,success: function(layero, index){
        var eventFilter = 'submit(layedit-code-yes)';
        form.render('select');  
        layero.find('.layui-btn-primary').on('click', function(){
          layer.close(index);
          body.focus();
        });
        form.on(eventFilter, function(data){
          layer.close(code.index);
          callback && callback(data.field);
        });
      }
    });
    code.index = index;
  }
  
  //全部工具，工具条上所有工具的html结构
  ,tools = {
    html: '<i class="layui-icon layedit-tool-html" title="HTML源代码" lay-command="html" layedit-event="html"">&#xe64b;</i><span class="layedit-tool-mid"></span>'
    ,strong: '<i class="layui-icon layedit-tool-b" title="加粗" lay-command="Bold" layedit-event="b"">&#xe62b;</i>'
    ,italic: '<i class="layui-icon layedit-tool-i" title="斜体" lay-command="italic" layedit-event="i"">&#xe644;</i>'
    ,underline: '<i class="layui-icon layedit-tool-u" title="下划线" lay-command="underline" layedit-event="u"">&#xe646;</i>'
    ,del: '<i class="layui-icon layedit-tool-d" title="删除线" lay-command="strikeThrough" layedit-event="d"">&#xe64f;</i>'
    
    ,'|': '<span class="layedit-tool-mid"></span>'
    
    ,left: '<i class="layui-icon layedit-tool-left" title="左对齐" lay-command="justifyLeft" layedit-event="left"">&#xe649;</i>'
    ,center: '<i class="layui-icon layedit-tool-center" title="居中对齐" lay-command="justifyCenter" layedit-event="center"">&#xe647;</i>'
    ,right: '<i class="layui-icon layedit-tool-right" title="右对齐" lay-command="justifyRight" layedit-event="right"">&#xe648;</i>'
    ,link: '<i class="layui-icon layedit-tool-link" title="插入链接" layedit-event="link"">&#xe64c;</i>'
    ,unlink: '<i class="layui-icon layedit-tool-unlink layui-disabled" title="清除链接" lay-command="unlink" layedit-event="unlink"">&#xe64d;</i>'
    ,face: '<i class="layui-icon layedit-tool-face" title="表情" layedit-event="face"">&#xe650;</i>'
    ,image: '<i class="layui-icon layedit-tool-image" title="图片" layedit-event="image">&#xe64a;<input type="file" name="file"></i>'
    ,code: '<i class="layui-icon layedit-tool-code" title="插入代码" layedit-event="code">&#xe64e;</i>'
    
    ,help: '<i class="layui-icon layedit-tool-help" title="帮助" layedit-event="help">&#xe607;</i>'
  }
  
  ,edit = new Edit();

  exports(MOD_NAME, edit);
});
