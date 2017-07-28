/**
 * upload.js
 * @author: quyinggang
 */

 (function(w) {
     // 保存常用变量、定义内置配置参数对象
     var doc = document, call = {}, HIDE = 'layui-hide', 
         UPLOAD = 'layui-upload-file', config = {
         element: 'upload',
         url: '',
         method: 'post',
         before: function() {
             console.log('开始上传...');
         },
         success: function() {
             console.log('上传成功');
         },
         error: function() {
             console.log('上传失败');
         },
         isChange: true
     };
    
     // 配置参数合并
     call.extend = function(config, options) {
         var extend = {};
         var keys = [];
         config = config || {};
         options = options || {};
         keys = Object.keys(config);
         if (!options) return config;
         keys.forEach(function(item, index) {
             extend[item] = item && item in options ? options[item] : config[item];
         });
         return extend;
     };

     // 事件监听
     call.on = function(element, event, callback) {
         if(!element) return;
         typeof callback === 'function' || (callback = this.options.success);
         w.addEventListener ? element.addEventListener(event, callback) : element.attachEvent(event, callback);
     };
    
     // 添加class类
     call.addClass = function(element, className) {
         // 判断指定元素是否存在，不存在就添加
         Sting(element.className).lastIndexOf(className) < 0 ? element.className += className : '';
     };

     // 根据参数来配置是否改变上传按钮的样式以及上传需要的表单(通过表单实现上传)
     call.view = function(options) {
         // 根据配置参数isChange来设置按钮的样式
         var element = doc.getElementsByTagName(options.element)[0];
         element ? (options.isChange ? call.addClass(element, UPLOAD) : '') : (function() {
             var input = doc.createElement('input');
             input.type = 'file';
             input.id = 'file';
             input.className = 'upload layui-hide';
             input.name = 'file';
             doc.body.appendChild(input);
             element = input;
         })();
        
         // 创建iframe用于表单提交后无刷新页面
         var iframe = doc.createElement('iframe');
         iframe.name = 'data';
         iframe.className = '';
         iframe.id = 'myFrame';
         doc.body.appendChild(iframe);

         // 创建form表单用于提交(也可以采用ajax来实现上传)
         var form = doc.getElementById('upload');
         if (!form) {
            var form = doc.createElement('form');
            form.method = options.method;
            form.action = options.url;
            form.enctype = 'multipart/form-data';
            form.id = 'upload';
            form.className = 'layui-hide';
            doc.body.appendChild(form);
         } else {
            form.method = options.method;
            form.action = options.url;
         }
        
        // 设置form的target属性值
        form.target = iframe.name;
        // 设置input的所属form
        element.form = 'upload';
     };

     // 定义构造函数
     var Upload = function(options) {
         // 参数合并
         this.options = call.extend(config, options);
         // 构建上传需要的form表单
         call.view(this.options);
     };

     // 将构造函数的原型对象保存在fn属性中
     Upload.fn = Upload.prototype;
     
     // 上传，并且依据配置参数来进行上传前以及上传后的处理配置
     Upload.fn.Upload = function() {
         this.options.before();
         var element = doc.getElementsByClassName(this.options.element)[0];
         call.on(element, 'click', function() {
             var input = doc.getElementsByClassName('upload')[0];
             input.click();
             call.on(input, 'change', function() {
                 var form = document.getElementById('upload');
                 form.submit();
             });
         });
         
         var frame = doc.getElementById('myFrame');
         // 获取iframe中返回的数据
         setInterval(function() {
             var text = null;
             try {
                 text = frame.contextDocument.body.innerText;
             } catch(e) {
                 this.options.error();
             }
             if (text) {
                 this.options.success();
             }
         }, 300);
     };

     // 暴露出去
     window.Upload = Upload;
 })(window);