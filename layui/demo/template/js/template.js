/**
 * 模板引擎和指令
 * 玉案轩窗
 * 2017-08-08 10:16
 */
(function(window, undefined) {
    let doc = document, directives = ['v-if', 'v-for', 'v-text'], 
        templateRegex = /{{.+}}/g, data = {
            isShow: true,
            message: '模板引擎',
            data: [
                '数据1', '数据2'
            ]
        };

    let searchTemplateAndDire = function(childNodes, data) {
        if (!childNodes) return;
        for (let index = 0; index < childNodes.length; index++) {
            let childNode = childNodes[index];
            if (childNode.nodeName != 'SCRIPT' && childNode.nodeType === 1) {
              searchTemplateAndDire(childNode.childNodes, data);
              // 元素节点
              if (childNode.nodeType === 1) {
                  if (childNode.hasAttribute('v-if')) {
                      // 处理v-if指令, 支持单运算符!
                      let isShow = false, content = '', 
                          value = childNode.getAttribute('v-if');
                      if (value && value.indexOf('!') >= 0) {
                          values = value.substring(value.indexOf('!'));
                      } else {
                          values = value;
                      }
                      if (data.hasOwnProperty(values)) {
                          isShow = data[values];
                      }
                      isShow ? '' : childNode.style.display = 'none';
                      childNode.removeAttribute('v-if');
                  } else if (childNode.hasAttribute('v-text')) {
                      // 处理指令v-text
                      let value = childNode.getAttribute('v-text'), text = value;
                      if (value && data.hasOwnProperty(value)) {
                          text = data[value];
                      }
                      childNode.innerText = text;
                      childNode.removeAttribute('v-text');
                  }
              }
            } else if (childNode.nodeType === 3) {
                let text = childNode.textContent;
                if (templateRegex.test(text)) {
                    let value = text.replace(/{{|}}/g, '');
                    if (value && data.hasOwnProperty(value)) {
                        childNode.textContent = data[value];
                    }
                }
            }
        }
    }
    searchTemplateAndDire(document.body.childNodes, data);
})(window);