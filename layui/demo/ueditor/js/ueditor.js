/**
 * 富文本编辑器
 * quyinggang
 * 2017-07-31 09:40
 */

 (function(window, undefined) {

    // 定义使用的常量，使用font awesome字符集来显示tools的图标
    let doc = document, utils = {}, TOOLSCLASS = 'ueditor-toolsbar', 
    UEDITOR = 'ueditor', CONTENTCLASS = 'ueditor-content', HIDE = 'ueditor-hide',
    toolsClassNames = ['ueditor-bold', 'ueditor-italic', 'ueditor-left', 'ueditor-right', 'ueditor-center'],
    SHOW = 'ueditor-show', iconMap = {
        'bold': 'bold',
        'italic': 'italic',
        'leftAlign': 'align-left',
        'centerAlign': 'align-center',
        'rightAlign': 'align-right',
        'link': 'link',
        'gifLook': 'meh-o'
    }, config = ['bold',
        'italic', 'leftAlign', 'rightAlign', 'centerAlign',
        'link', 'gifLook'];
    
    // 创建节点
    utils.createElement = function(nodeNames) {
        if (!nodeNames && typeof nodeNames !== 'string') return;
        let nodes = [];
        let isNodeArray = Array.isArray(nodeNames);
        if (isNodeArray) {
            nodeNames.forEach(function(item, index) {
                if (item) {
                    nodes.push(doc.createElement(item));
                }
            });
        } else {
            nodes = doc.createElement(nodeNames);
        }
        return nodes;
    };

    // 判断指定的元素是否存在，支持数组/对象/字符串
    utils.isExist = function(elem, target) {
        let result = false;
        if (!elem || !target) return result;
        let elemType = typeof elem;
        if (elemType === 'object') {
            result = (target in elem);
        } else if (elemType === 'string') {
            result = String(elem).indexOf(target) >= 0 ? true : false;
        }
        return result;
    };
    
    // 移除
    utils.removeClass = function(items, classNames) {
        if (!items) return;
        let isItemsArray = Array.isArray(items);
        let isClassArray = Array.isArray(classNames);
        if (isItemsArray && isClassArray) {
            items.forEach(function(item, index) {
                let className = classNames[index];
                let itemClassName = item.className;
                if (Array.isArray(className)) {
                    className.forEach(function(name) {
                        item.className = utils.isExist(itemClassName, name) ? itemClassName.replace(name, '') : itemClassName;
                    });
                } else {
                    item.className = utils.isExist(itemClassName, className) ? itemClassName.replace(className, '') : itemClassName;
                }
            })
        } else if(!isItemsArray && isClassArray) {
            classNames.forEach(function(item) {
                items.className = utils.isExist(items.className, item) ? items.className.replace(item, '') : items.className;
            });
        } else if (!isItemsArray && !isClassArray) {
            items.className = utils.isExist(items.className, classNames) ? items.className.replace(new RegExp(classNames, 'g'), '') : items.className;
        }
    };
    // 添加class类，支持批量添加以及单次添加
    utils.addClass = function(elem, classNames) {
        let isElemFun = Array.isArray(elem);
        let isClassFun = Array.isArray(classNames);
        let isElemObject = typeof elem === 'object';
        let isClassString = typeof classNames === 'string';
        if (isElemFun && isClassFun) {
            elem.forEach(function(item, index) {
                let classNameValue = classNames[index];
                if (Array.isArray(classNameValue)) {
                    classNameValue.forEach(function(className) {
                        item.className = utils.isExist(item.className, className) ? item.className : item.className + ' ' + className;
                    });
                } else {
                    item.className = utils.isExist(item.className, classNames[index]) ? item.className : item.className + ' ' + classNameValue;
                }
            });
        } else if (isElemFun && isClassString) {
            elem.forEach(function(item, index) {
                item.className = utils.isExist(item.className, classNames) ? item.className : item.className + ' ' + 
                classNames; 
            });
        } else if (isElemObject && !isElemFun && isClassString) {
           elem.className = utils.isExist(elem.className, classNames) ? elem.className : elem.className + ' ' +
                classNames;
        } else if (isElemObject && isClassFun) {
            classNames.forEach(function(item) {
                elem.className = utils.isExist(elem.className, item) ? elem.className : elem.className + ' ' + item;
            });
        }
    };

    // 添加子节点
    utils.append = function(parents, childs) {
        if (!parents || !childs) return;
        let isParentsArray = Array.isArray(parents);
        let isChildsArray = Array.isArray(childs);
        if (isParentsArray && isChildsArray) {
            parents.forEach(function(item, index) {
                let isArray = Array.isArray(childs[index]);
                if (isArray) {
                    childs[index].forEach(function(child) {
                        item.append(child);
                    });
                } else {
                    item.append(childs[index]);
                }
            });
        } else if (!isParentsArray && isChildsArray) {
            childs.forEach(function(item) {
                parents.append(item);
            });
        } else if (!isParentsArray && !isChildsArray) {
            parents.append(childs);
        }
    };

    // 设置属性
    utils.setAttribute = function(elem, attrs, values) {
        if (!elem || !attrs) return;
        let that = utils.setAttribute;
        let isElemArray = Array.isArray(elem);
        let isAttrsArray = Array.isArray(attrs);
        let isValuesArray = Array.isArray(values);

        if (isElemArray) {
            elem.forEach(function(item, index) {
                let arr = attrs[index];
                let value = values[index];
                if (Array.isArray(arr)) {
                    arr.map(function(attribute, aIndex) {
                        item.setAttribute(attribute, value[aIndex]);
                    });
                } else {
                    item.setAttribute(arr, value);
                }
            })
        } else {
            attrs.forEach(function(attribute, aIndex) {
                elem.setAttribute(attribute, values[aIndex]);
            });
        }
    };

    // 获取指定class的工具栏的选项
    utils.getToolsSpanNode = function(spanNodes, targetClass) {
        if (!spanNodes || !targetClass) return;
        for (let i = 0; i < spanNodes.length; i++) {
            let item = spanNodes[i];
            let iNode = item.children;
            let className = iNode[0].className;
            if (utils.isExist(className, targetClass)) return item;
        }
    };
    // 用于填充数组，支持批量
    utils.push = function(container, item) {
        if (!container || !item) return;
        let isContainerArray = Array.isArray(container);
        let isItemArray = Array.isArray(item);
        if (isContainerArray && isItemArray) {
            item.forEach(function(ele) {
                container.push(ele);
            });
        } else if (isContainerArray && !isItemArray) {
            container.push(item);
        }
    };

    // 用于匹配具体的样式按钮需要的样式
    utils.cssSwitch = function(name) {
        if (!name) return;
        let cssText = [];
        switch(name) {
            case 'bold': 
                utils.push(cssText, ['bold', toolsClassNames[0]]);
                break;
            case 'italic': 
                utils.push(cssText, ['italic', toolsClassNames[1]]);
                break;
            case 'align-left': 
                utils.push(cssText, ['left', toolsClassNames[2]]);
                break;
            case 'align-center': 
                utils.push(cssText, ['center', toolsClassNames[4]]);
                break;
            case 'align-right': 
                utils.push(cssText, ['right', toolsClassNames[3]]);
                break;
            default: 
                utils.push(cssText, name);
        }
        return cssText;
    };

    // 用于处理toolsbar上点击事件的处理
    utils.eventsCallback = function(cssText, contentText, contentNode, gifLookNode) {
        let that = this;
        if (cssText.length > 1) {
           let newHtml = '';
           let style = cssText[0];
           let content = contentNode.innerHTML;
           if (style === 'left' || style === 'right' || style === 'center') {
               newHtml = '<span class="' + cssText[1] + '">' + content + '</span>';
           } else {
               let spanHtml = '<span class="' + cssText[1] + '">' + contentText + '</span>';
               newHtml = content.replace(contentText, spanHtml);
           }

            contentNode.innerHTML = newHtml;
        } else if (cssText.length === 1) {
            switch(cssText[0]) {
                case 'link': 
                    (function() {
                        let shadowNode = doc.getElementsByClassName('ueditor-shadow')[0];
                        let linkNode = doc.getElementsByClassName('ueditor-toolsbar_link')[0];
                        utils.removeClass([shadowNode, linkNode], [HIDE, HIDE]);
                    })();
                    break;
                case 'meh-o': 
                    (function() {
                        if (!gifLookNode || gifLookNode.nodeName) {
                            gifLookNode = doc.getElementsByClassName('ueditor-toolsbar_gif')[0];
                        }
                        utils.removeClass(gifLookNode, HIDE);
                    })();
                     break;
            }
        }
    };

    // 链接和动态表情的面板事件处理
    utils.onPanelEvents = function(giftLookNode, contentNode) {
       
        // 动态表情事件监听处理
        giftLookNode.addEventListener('click', function() {
            let src = event.target.currentSrc;
            if (src) {
                let targetSrc = './images/face/' + src.substring(String(src).lastIndexOf('/') + 1);
                let imgNode = utils.createElement('img');
                utils.setAttribute(imgNode, ['src'], [targetSrc]);
                utils.append(contentNode, imgNode);
                this.className += ' ' + HIDE;
                utils.addClass(giftLookNode, HIDE);
            }
        });

        // 链接面板的事件绑定处理
        let shadowNode = doc.getElementsByClassName('ueditor-shadow')[0];
        let linkNode = doc.getElementsByClassName('ueditor-toolsbar_link')[0];
        let linkContentNode = doc.getElementsByClassName('toolsbar_link_content')[0];
        let childs = doc.getElementsByClassName('toolsbar_link_buttons')[0].children;
        for (let i = 0; i < childs.length; i++) {
            childs[i].addEventListener('click', function() {
                let isConfirm = utils.isExist(this.className, 'fa-check');
                if (isConfirm) {
                    let data = []
                    let contentChildNode = linkContentNode.children;
                    for (let i = 0; i < contentChildNode.length; i++) {
                        let item = contentChildNode[i];
                        if (item && item.getAttribute('type')) {
                            data.push(item.value);
                        }
                    }
                    let a = utils.createElement('a');
                    utils.setAttribute(a, ['href'], [data[1]]);
                    a.innerText = data[0];
                    utils.append(contentNode, a);
                }
                utils.addClass([shadowNode, linkNode], [HIDE, HIDE]);
            });
        }
    };
    // 绑定事件
    utils.events = function(toolsBarNode, contentNode, giftLookNode) {
        if (!toolsBarNode || !contentNode) return;

        let contentText = '';
        // 获取文本
        contentNode.addEventListener('mouseout', function() {
            let select = window.getSelection();
            contentText = select.toString();
        });
        toolsBarNode.addEventListener('click', function() {
            let className = event.target.className;
            if (className) {
                let classNames = String(className).split('fa-');
                let cssText = utils.cssSwitch(classNames[classNames.length - 1]);
                utils.eventsCallback(cssText, contentText, contentNode, giftLookNode);
            }
        });
        utils.onPanelEvents(giftLookNode, contentNode);
    };
    
    // 工具栏以及内容区html结构
    utils.viewMain = function() {
        let toolsBarClass = new Set();
        let options = this.options || config;
        // 获取ueditor容器节点
        let ueditorNode = doc.getElementById('ueditor');
        //创建ueditor-toolsbar节点作为图标的容器, ueditor-content作为内容区
        let toolsNode = utils.createElement('div');
        let ueditorContentNode = utils.createElement('div');
        utils.setAttribute(ueditorContentNode, ['contenteditable'], [true]);
        // 添加指定class类名
        utils.addClass([toolsNode, ueditorContentNode], [TOOLSCLASS, CONTENTCLASS]);
        // 遍历获取toolsBar的icon类名
        options.forEach(function(item, index) {
            toolsBarClass.add(iconMap[item]);
        });
        toolsBarClass.forEach(function(item, index) {
            if (item) {
                // 创建节点
                let spanNode = utils.createElement('span');
                let iNode = utils.createElement('i');
                utils.addClass(iNode, 'fa fa-' + item);
                utils.append([spanNode, toolsNode], [iNode, spanNode]);
            }
        });
        utils.append(ueditorNode, [toolsNode, ueditorContentNode]);
        return [toolsNode, ueditorContentNode];
    };

    // 链接弹出面板的html结构
    utils.viewLink = function(toolsNode) {
         // 构建链接的额外面板
        let nodes = utils.createElement(['div', 'div', 'h4', 'div', 'div', 'label', 'label', 'input', 'input', 'i', 'i']);
        let [shadowNode, linkNode, linkTitleNode, linkContentNode, linkButtonsNode, labelDec, 
            labelUrl, inputDec, inputURL, confimButton, cancelButton] = nodes;
        utils.addClass([shadowNode, linkNode, linkTitleNode, linkContentNode, linkButtonsNode, confimButton, cancelButton], [['ueditor-shadow', HIDE], ['ueditor-toolsbar_link', HIDE], 
            'toolsbar_link_title', 'toolsbar_link_content', 'toolsbar_link_buttons', 'fa fa-check', 'fa fa-remove']);
        utils.setAttribute([inputDec, inputURL], [['type', 'placeholder'], ['type', 'placeholder']], [['text', '请输入该链接描述'], ['url', '请输入链接地址']]);
        utils.append([linkContentNode, linkButtonsNode, linkNode, doc.body], [[labelDec, inputDec, labelUrl, inputURL], [confimButton, 
            cancelButton], [linkTitleNode, linkContentNode, linkButtonsNode], [shadowNode, linkNode]]);
        
        linkTitleNode.innerText = '链接地址';
        labelDec.innerText = '链接描述';
        labelUrl.innerText = '链接URL';
    };

    // 定义表情包展开的面板
    utils.viewGifLook = function() {
        let spanNodes = doc.getElementsByClassName('ueditor-toolsbar')[0].children;
        let targetSpanNode = utils.getToolsSpanNode(spanNodes, 'fa-meh-o');

        // 创建面板
        let gifLookNode = utils.createElement('div');
        utils.addClass(gifLookNode, ['ueditor-toolsbar_gif', HIDE]);
        // 创建面板内元素
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 13; x++) {
                let [image, figure] = utils.createElement(['img', 'div']);
                utils.setAttribute(image, ['src'], ['./images/face/' + (13 * y + x) + '.gif']);
                utils.append([figure, gifLookNode], [image, figure]);
                if (y === 5 && x >= 6) break;
            }
        }

        // 追加面板元素到指定节点
        utils.append(targetSpanNode, gifLookNode);
        return gifLookNode;   
    };
    // 定义构造函数
    let UEditor = function(options) {
        this.options = (options && options.length) || config;
        this.view();
    };

    // 将原型对象保存起来
    UEditor.fn = UEditor.prototype;

    // 根据配置参数配置富文本编辑器的html骨架
    UEditor.fn.view = function() {
        
        // 构建主体
        let [toolsNode, ueditorContentNode] = utils.viewMain();
        utils.viewLink(toolsNode);
        let gifLookNode = utils.viewGifLook();
        utils.events(toolsNode, ueditorContentNode, gifLookNode);
    };

    window.UEditor = UEditor;
 })(window);