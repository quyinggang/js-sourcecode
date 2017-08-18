/**
 * 树形菜单
 * 玉案轩窗
 * 2017-08-09 11:11
 */
 !(function(window, undefined) {
     let doc = document, tool = {}, SHOW = 'show', ACTIVE = 'active', ROTATE = 'rotate';
     
     // 构建菜单html结构(子菜单不在父菜单中)
     tool.menuView = function(parentNode, menu) {
         if (!parentNode || parentNode.nodeType !== 1 || !Array.isArray(menu)) return;
         for (let i = 0; i < menu.length; i++) {
            let option = menu[i], name = option.name;
            if (option.children && option.children.length > 0) {
                let ulNode = tool.createElement('ul');
                tool.menuView(ulNode, option.children);
                let [menuNode, iNode, spanNode] = tool.createElement(['li', 'i', 'span'])
                spanNode.innerText = name;
                iNode.className = 'fa fa-play';
                tool.append([menuNode, parentNode], [[iNode, spanNode], [menuNode, ulNode]]);
            } else {
                let menuNode = tool.createElement('li');
                menuNode.innerText = name;
                tool.append(parentNode, menuNode);
            }
         }
     };

    // 将ul构建在父菜单li中
    //  tool.menuView = function(parentNode, menu) {
    //      if (!parentNode || parentNode.nodeType !== 1 || !Array.isArray(menu)) return;
    //      for (let i = 0; i < menu.length; i++) {
    //         let option = menu[i], name = option.name, liNode = tool.createElement('li');
    //         tool.append(parentNode, liNode);
    //         if (option.children && option.children.length > 0) {
    //             let ulNode = tool.createElement('ul');
    //             tool.menuView(ulNode, option.children);
    //             let [iNode, spanNode] = tool.createElement(['i', 'span'])
    //             spanNode.innerText = name;
    //             iNode.className = 'fa fa-play';
    //             tool.append([liNode, parentNode, liNode], [[iNode, spanNode], [liNode], [ulNode]]);
    //         } else {
    //             liNode.innerText = name;
    //         }
    //      }
    //  };

     // 清除所有菜单的active类
     tool.clearActive = function(boot) {
         if (!boot || boot.nodeType !== 1) return;
         let children = boot.children;
         if (children && children.length > 0) {
             for (let index = 0; index < children.length; index++) {
                 tool.clearActive(children[index]);
             }
         } else {
             if (String(boot.className).indexOf(ACTIVE) >= 0) {
                boot.className = (boot.className.replace(new RegExp(ACTIVE, 'g'), '')).trim();
             }
         }
         
     };

     // 遍历
     tool.each = function(arr, callback, options) {
         if (!Array.isArray(arr) || typeof callback !== 'function') return;
         arr.forEach(function(elem, index) {
             callback(elem, index, options);
         });
     };

     // 创建节点，支持批量
     tool.createElement = function(nodeNames) {
         if (!nodeNames) return;
         let nodes = [];
         if (Array.isArray(nodeNames)) {
             tool.each(nodeNames, function(nodeName, index, options) {
                 options.nodes.push(doc.createElement(nodeName));
             }, {nodes: nodes});
         } else {
             nodes = doc.createElement(nodeNames);
         }
         return nodes;
     };

     // 添加节点，支持批量
     tool.append = function(parentNodes, childNodes) {
         if (!parentNodes || !childNodes) return;
         let isArrayOfP = Array.isArray(parentNodes), isArrayOfC = Array.isArray(childNodes);
         if (isArrayOfP && isArrayOfC) {
             tool.each(parentNodes, function(node, index, options) {
                 let child = options.childNodes[index];
                 if (Array.isArray(child)) {
                     child.forEach(function(children) {
                         node.appendChild(children);
                     });
                 } else {
                     node.appendChild(child);
                 }
             }, {childNodes: childNodes});
         } else if (isArrayOfP && !isArrayOfC) {
             tool.each(parentNodes, function(node, index, options) {
                 node.appendChild(options.childNodes);
             }, {childNodes: childNodes});
         } else if (!isArrayOfP && isArrayOfC) {
             tool.each(childNodes, function(node, index, options) {
                 let parentNode = options.parentNodes;
                 if (Array.isArray(node)) {
                     node.forEach(function(child) {
                         parentNode.appendChild(child);
                     });
                 } else {
                     parentNode.appendChild(node);
                 }
             }, {parentNodes: parentNodes})
         } else if (!isArrayOfP && !isArrayOfC) {
             parentNodes.appendChild(childNodes);
         }
     };
     // 事件绑定
     tool.onEvents = function(boot) {
         if (!boot || boot.nodeType !== 1) return;
         boot.addEventListener('click', function(e) {
             let currentNode = e.target || e.srcElement;
             if (currentNode.nodeName.toLowerCase() !== 'li') currentNode = currentNode.parentNode;
             // 获取当前点击列的下一个兄弟元素是否是ul，判断会否是菜单有层次结构
             let traggleNode = currentNode.nextSibling, isLevelsMenu = traggleNode ? (traggleNode.nodeName.toLowerCase() 
                 === 'ul' ? true : false) : false;
             if (isLevelsMenu) {
                 let iNode = currentNode.firstChild, tClassName = traggleNode.className, 
                     iClassName = iNode.className;
                 if (tClassName.indexOf(SHOW) >= 0) {
                     iNode.className = (iClassName.replace(new RegExp(ROTATE, 'g'), '')).trim();
                     traggleNode.className = tClassName.replace(new RegExp(SHOW, 'g'), '').trim();
                 } else {
                     iNode.className = (iClassName + ' ' + ROTATE).trim();
                     traggleNode.className = (tClassName + ' ' + SHOW).trim();
                 }
                 
             } else {
                 tool.clearActive(boot);
                 currentNode.className = (currentNode.className + ' ' + ACTIVE).trim();
             }
             console.log(currentNode.innerText);
         });
     };
     // 创建菜单结构并绑定事件
     tool.createMenu = function(data, id) {
         if (!data || !id) return;
         let ulNode = doc.createElement('ul'), containerNode = doc.getElementById(id);
         // 构建菜单结构
         tool.menuView(ulNode, data);
         containerNode && containerNode.nodeType === 1 ? containerNode.appendChild(ulNode) : '';
         // 绑定点击事件
         tool.onEvents(ulNode);
     };

     let Tree = function(data, id) {
        tool.createMenu(data, id);
     };
     window.Tree = Tree;
 })(window);