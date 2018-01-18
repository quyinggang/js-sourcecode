/**
 * Moon v0.9.0
 * Copyright 2016-2017 Kabir Shah
 * Released under the MIT License
 * http://moonjs.ga
 */

(function(root, factory) {
  /* ======= Global Moon ======= */
  (typeof module === "object" && module.exports) ? module.exports = factory() : root.Moon = factory();
}(this, function() {
    "use strict";
    
    /* ======= Global Variables ======= */
    var directives = {};
    var specialDirectives = {};
    var components = {};
    var eventModifiersCode = {
      stop: 'event.stopPropagation();',
      prevent: 'event.preventDefault();',
      ctrl: 'if(!event.ctrlKey) {return;};',
      shift: 'if(!event.shiftKey) {return;};',
      alt: 'if(!event.altKey) {return;};',
      enter: 'if(event.keyCode !== 13) {return;};'
    };
    var id = 0;
    
    /* ======= Observer ======= */
    /**
     * 初始化Methods：实际上是将Methods中的方法添加到$data中
     * @param {Object} instance
     */
    var initMethods = function (instance, methods) {
      var initMethod = function (methodName, method) {
        instance.$data[methodName] = function () {
          return method.apply(instance, arguments);
        };
      };
    
      for (var method in methods) {
        initMethod(method, methods[method]);
      }
    };
    
    /**
     * 初始化计算属性，将计算属性都添加到$data中
     * @param {Object} instance
     * @param {Object} computed
     */
    var initComputed = function (instance, computed) {
      var setComputedProperty = function (prop) {
        var observer = instance.$observer;
        // 在Observer的clear中建立指定prop的方法，用于清除指定prop的cache
        observer.observe(prop);
    
        // 数据响应
        Object.defineProperty(instance.$data, prop, {
          get: function () {
            var cache = null;
            // 如果不存在
            if (observer.cache[prop] === undefined) {
              // 设置target并运行computed的get方法，将其结果值放入cache中
              observer.target = prop;
              cache = computed[prop].get.call(instance);
              observer.target = null;
              observer.cache[prop] = cache;
            } else {
              // 获取cache中的值
              cache = observer.cache[prop];
            }
    
            return cache;
          },
          set: noop
        });
    
        // Add Setters
        var setter = null;
        if ((setter = computed[prop].set) !== undefined) {
          observer.setters[prop] = setter;
        }
      };
    
      // Set All Computed Properties
      for (var propName in computed) {
        setComputedProperty(propName);
      }
    };
    
    function Observer(instance) {
      // Moon实例
      this.instance = instance;
      // 缓存
      this.cache = {};
      // set
      this.setters = {};
      // 清除cache的方法
      this.clear = {};
      this.target = null;
      // 属性所在的所有计算属性集合
      this.map = {};
    }
    
    // 创建清除指定计算属性的方法
    Observer.prototype.observe = function (key) {
      var self = this;
      this.clear[key] = function () {
        self.cache[key] = undefined;
      };
    };
    // 执行清除
    Observer.prototype.notify = function (key, val) {
      var depMap = null;
      if ((depMap = this.map[key]) !== undefined) {
        for (var i = 0; i < depMap.length; i++) {
          this.notify(depMap[i]);
        }
      }
    
      var clear = null;
      if ((clear = this.clear[key]) !== undefined) {
        clear();
      }
    };
    
    /* ======= Global Utilities ======= */
    
    /**
     * Logs a Message
     * @param {String} msg
     */
    var log = function (msg) {
      if (!Moon.config.silent) console.log(msg);
    };
    
    /**
     * Throws an Error
     * @param {String} msg
     */
    var error = function (msg) {
      if (!Moon.config.silent) console.error("[Moon] ERR: " + msg);
    };
    
    /**
     * 更新DOM，该方法只在set方法中被调用
     * @param {Object} instance
     */
    var queueBuild = function (instance) {
      if (instance.$queued === false && instance.$destroyed === false) {
        instance.$queued = true;
        setTimeout(function () {
          instance.build();
          callHook(instance, 'updated');
          instance.$queued = false;
        }, 0);
      }
    };
    
    /**
     * 虚拟DOM默认的meta
     * @return {Object} metadata
     */
    var defaultMetadata = function () {
      return {
        shouldRender: false,
        eventListeners: {}
      };
    };
    
    /**
     * Escapes a String
     * @param {String} str
     */
    var escapeString = function (str) {
      var NEWLINE_RE = /\n/g;
      var DOUBLE_QUOTE_RE = /"/g;
      var BACKSLASH_RE = /\\/g;
      return str.replace(BACKSLASH_RE, "\\\\").replace(DOUBLE_QUOTE_RE, "\\\"").replace(NEWLINE_RE, "\\n");
    };
    
    /**
     * Resolves an Object Keypath and Sets it
     * @param {Object} instance
     * @param {Object} obj
     * @param {String} keypath
     * @param {String} val
     * @return {Object} resolved object
     */
    var resolveKeyPath = function (instance, obj, keypath, val) {
      var i = null;
      keypath.replace(/\[(\w+)\]/g, function (match, index) {
        keypath = keypath.replace(match, '.' + index);
      });
      var path = keypath.split(".");
      for (i = 0; i < path.length - 1; i++) {
        var propName = path[i];
        obj = obj[propName];
      }
      obj[path[i]] = val;
      return path[0];
    };
    
    /**
     * Extracts the Slots From Component Children
     * @param {Array} children
     * @return {Object} extracted slots
     */
    var getSlots = function (children) {
      var slots = {};
    
      // Setup default slots
      var defaultSlotName = "default";
      slots[defaultSlotName] = [];
    
      // No Children Means No Slots
      if (children.length === 0) {
        return slots;
      }
    
      // Get rest of the slots
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var childProps = child.props.attrs;
        var slotName = "";
    
        if ((slotName = childProps.slot) !== undefined) {
          if (slots[slotName] === undefined) {
            slots[slotName] = [child];
          } else {
            slots[slotName].push(child);
          }
          delete childProps.slot;
        } else {
          slots[defaultSlotName].push(child);
        }
      }
    
      return slots;
    };
    
    /**
     * 浅拷贝
     * @param {Object} parent
     * @param {Object} child
     * @return {Object} Extended Parent
     */
    var extend = function (parent, child) {
      for (var key in child) {
        parent[key] = child[key];
      }
      return parent;
    };
    
    /**
     * 合并参数
     * @param {Object} parent
     * @param {Object} child
     * @return {Object} Merged Object
     */
    var merge = function (parent, child) {
      var merged = {};
      for (var key in parent) {
        merged[key] = parent[key];
      }
      for (var key in child) {
        merged[key] = child[key];
      }
      return merged;
    };
    
    /**
     * Calls a Hook
     * @param {Object} instance
     * @param {String} name
     */
    var callHook = function (instance, name) {
      var hook = instance.$hooks[name];
      if (hook !== undefined) {
        hook.call(instance);
      }
    };
    
    /**
     * Escapes String Values for a Regular Expression
     * @param {str} str
     */
    var escapeRegex = function (str) {
      return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
    };
    
    /**
     * 空对象
     */
    var noop = function () {};
    
    /**
     * Converts attributes into key-value pairs
     * @param {Node} node
     * @return {Object} Key-Value pairs of Attributes
     */
    var extractAttrs = function (node) {
      var attrs = {};
      for (var rawAttrs = node.attributes, i = rawAttrs.length; i--;) {
        attrs[rawAttrs[i].name] = rawAttrs[i].value;
      }
      return attrs;
    };
    
    /**
     * Adds metadata Event Listeners to an Element
     * @param {Object} node
     * @param {Object} vnode
     * @param {Object} instance
     */
    var addEventListeners = function (node, vnode, instance) {
      var eventListeners = vnode.meta.eventListeners;
      for (var type in eventListeners) {
        for (var i = 0; i < eventListeners[type].length; i++) {
          var method = eventListeners[type][i];
          node.addEventListener(type, method);
        }
      }
    };
    
    /**
     * 根据虚拟DOM创建node
     * @param {Object} vnode
     * @param {Object} instance
     * @return {Object} DOM Node
     */
    var createNodeFromVNode = function (vnode, instance) {
      var el = null;
      // 文本
      if (vnode.type === "#text") {
        el = document.createTextNode(vnode.val);
      } else {
        el = vnode.meta.isSVG ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type) : document.createElement(vnode.type);
        // Optimization: VNode only has one child that is text, and create it here
        if (vnode.children.length === 1 && vnode.children[0].type === "#text") {
          el.textContent = vnode.children[0].val;
          vnode.children[0].meta.el = el.firstChild;
        } else {
          // 子节点
          for (var i = 0; i < vnode.children.length; i++) {
            var childVNode = vnode.children[i];
            var childNode = createNodeFromVNode(vnode.children[i], instance);
            el.appendChild(childNode);
            // Component detected, mount it here
            if (childVNode.meta.component) {
              createComponentFromVNode(childNode, childVNode, childVNode.meta.component);
            }
          }
        }
        // Add all event listeners
        addEventListeners(el, vnode, instance);
      }
      // Setup Props
      diffProps(el, {}, vnode, vnode.props.attrs);
    
      // Hydrate
      vnode.meta.el = el;
    
      return el;
    };
    
    /**
     * Appends a Child, Ensuring Components are Mounted
     * @param {Object} node
     * @param {Object} vnode
     * @param {Object} parent
     */
    var appendChild = function (node, vnode, parent) {
      // Remove the node
      parent.appendChild(node);
    
      // Check for Component
      if (vnode.meta.component) {
        createComponentFromVNode(node, vnode, vnode.meta.component);
      }
    };
    
    /**
     * Removes a Child, Ensuring Components are Unmounted
     * @param {Object} node
     * @param {Object} parent
     */
    var removeChild = function (node, parent) {
      // Check for Component
      if (node.__moon__) {
        // Component was unmounted, destroy it here
        node.__moon__.destroy();
      }
    
      // Remove the Node
      parent.removeChild(node);
    };
    
    /**
     * Replaces a Child, Ensuring Components are Unmounted/Mounted
     * @param {Object} oldNode
     * @param {Object} newNode
     * @param {Object} vnode
     * @param {Object} parent
     */
    var replaceChild = function (oldNode, newNode, vnode, parent) {
      // Check for Component
      if (oldNode.__moon__) {
        // Component was unmounted, destroy it here
        oldNode.__moon__.destroy();
      }
    
      // Replace It
      parent.replaceChild(newNode, oldNode);
    
      // Check for Component
      if (vnode.meta.component) {
        createComponentFromVNode(newNode, vnode, vnode.meta.component);
      }
    };
    
    /**
     * Patch Types
     */
    var PATCH = {
      SKIP: 0,
      APPEND: 1,
      REMOVE: 2,
      REPLACE: 3,
      TEXT: 4,
      CHILDREN: 5
    };
    
    /**
     * Text VNode/Node Type
     */
    var TEXT_TYPE = "#text";
    
    /**
     * 创建虚拟DOM对象
     * @param {String} type
     * @param {String} val
     * @param {Object} props
     * @param {Object} meta
     * @param {Array} children
     * @return {Object} Virtual DOM Node
     */
    var createElement = function (type, val, props, meta, children) {
      return {
        type: type,
        val: val,
        props: props,
        children: children,
        meta: meta || defaultMetadata()
      };
    };
    
    /**
     * Creates a Functional Component
     * @param {Object} props
     * @param {Array} children
     * @param {Object} functionalComponent
     * @return {Object} Virtual DOM Node
     */
    var createFunctionalComponent = function (props, children, functionalComponent) {
      var data = functionalComponent.opts.data || {};
    
      // Merge data with provided props
      if (functionalComponent.opts.props !== undefined) {
        var propNames = functionalComponent.opts.props;
    
        for (var i = 0; i < propNames.length; i++) {
          var prop = propNames[i];
          data[prop] = props.attrs[prop];
        }
      }
    
      // Call render function
      return functionalComponent.opts.render(h, {
        data: data,
        slots: getSlots(children)
      });
    };
    
    /**
     * 虚拟DOM处理的关键函数
     * @param {String} tag
     * @param {Object} attrs
     * @param {Object} meta
     * @param {Object|String} children
     * @return {Object} Object usable in Virtual DOM (VNode)
     */
    var h = function (tag, attrs, meta, children) {
      var component = null;
    
      if (tag === TEXT_TYPE) {
        // Text Node
        // Tag => #text
        // Attrs => meta
        // Meta => val
        return createElement(TEXT_TYPE, meta, { attrs: {} }, attrs, []);
      } else if ((component = components[tag]) !== undefined) {
        // Resolve Component
        if (component.opts.functional === true) {
          return createFunctionalComponent(attrs, children, components[tag]);
        } else {
          meta.component = component;
        }
      }
    
      return createElement(tag, "", attrs, meta, children);
    
      // In the end, we have a VNode structure like:
      // {
      //  type: 'h1', <= nodename
      //  props: {
      //    attrs: {id: 'someId'}, <= regular attributes
      //    dom: {textContent: 'some text content'} <= only for DOM properties added by directives,
      //    directives: {'m-mask': ''} <= any directives
      //  },
      //  meta: {}, <= metadata used internally
      //  children: [], <= any child nodes
      // }
    };
    
    /**
     * Mounts a Component To The DOM
     * @param {Object} node
     * @param {Object} vnode
     * @param {Object} component
     * @return {Object} DOM Node
     */
    var createComponentFromVNode = function (node, vnode, component) {
      var componentInstance = new component.CTor();
      // Merge data with provided props
      for (var i = 0; i < componentInstance.$props.length; i++) {
        var prop = componentInstance.$props[i];
        componentInstance.$data[prop] = vnode.props.attrs[prop];
      }
      componentInstance.$slots = getSlots(vnode.children);
      componentInstance.$el = node;
      componentInstance.build();
      callHook(componentInstance, 'mounted');
    
      // Rehydrate
      vnode.meta.el = componentInstance.$el;
    
      return componentInstance.$el;
    };
    
    /**
     * Diffs Props of Node and a VNode, and apply Changes
     * @param {Object} node
     * @param {Object} nodeProps
     * @param {Object} vnode
     */
    var diffProps = function (node, nodeProps, vnode) {
      // Get VNode Attributes
      var vnodeProps = vnode.props.attrs;
    
      // Diff VNode Props with Node Props
      for (var vnodePropName in vnodeProps) {
        var vnodePropValue = vnodeProps[vnodePropName];
        var nodePropValue = nodeProps[vnodePropName];
    
        if ((vnodePropValue !== undefined || vnodePropValue !== false || vnodePropValue !== null) && (nodePropValue === undefined || nodePropValue === false || nodePropValue === null || vnodePropValue !== nodePropValue)) {
          if (vnodePropName.length === 10 && vnodePropName === "xlink:href") {
            node.setAttributeNS('http://www.w3.org/1999/xlink', "href", vnodePropValue);
          } else {
            node.setAttribute(vnodePropName, vnodePropValue === true ? '' : vnodePropValue);
          }
        }
      }
    
      // Diff Node Props with VNode Props
      for (var nodePropName in nodeProps) {
        var _vnodePropValue = vnodeProps[nodePropName];
        if (_vnodePropValue === undefined || _vnodePropValue === false || _vnodePropValue === null) {
          node.removeAttribute(nodePropName);
        }
      }
    
      // Execute any directives
      if (vnode.props.directives !== undefined) {
        for (var directive in vnode.props.directives) {
          directives[directive](node, vnode.props.directives[directive], vnode);
        }
      }
    
      // Add/Update any DOM Props
      if (vnode.props.dom !== undefined) {
        for (var domProp in vnode.props.dom) {
          var domPropValue = vnode.props.dom[domProp];
          if (node[domProp] !== domPropValue) {
            node[domProp] = domPropValue;
          }
        }
      }
    };
    
    /**
     * Diffs a Component
     * @param {Object} node
     * @param {Object} vnode
     * @return {Object} adjusted node only if it was replaced
     */
    var diffComponent = function (node, vnode) {
      if (node.__moon__ === undefined) {
        // Not mounted, create a new instance and mount it here
        createComponentFromVNode(node, vnode, vnode.meta.component);
      } else {
        // Mounted already, need to update
        var componentInstance = node.__moon__;
        var componentChanged = false;
    
        // Merge any properties that changed
        for (var i = 0; i < componentInstance.$props.length; i++) {
          var prop = componentInstance.$props[i];
          if (componentInstance.$data[prop] !== vnode.props.attrs[prop]) {
            componentInstance.$data[prop] = vnode.props.attrs[prop];
            componentChanged = true;
          }
        }
    
        // If it has children, resolve any new slots
        if (vnode.children.length !== 0) {
          componentInstance.$slots = getSlots(vnode.children);
          componentChanged = true;
        }
    
        // If any changes were detected, build the component
        if (componentChanged === true) {
          componentInstance.build();
        }
      }
    };
    
    /**
     * 处理虚拟DOM与浏览器DOM之间的转换
     * @param {Object} node
     * @param {Object} vnode
     * @param {Object} parent
     * @param {Object} instance
     * @return {Object} adjusted node only if it was replaced
     */
    var hydrate = function (node, vnode, parent, instance) {
      var nodeName = node ? node.nodeName.toLowerCase() : null;
    
      if (node === null) {
        // No node, create one
        var newNode = createNodeFromVNode(vnode, instance);
        appendChild(newNode, vnode, parent);
    
        return newNode;
      } else if (vnode === null) {
        removeChild(node, parent);
    
        return null;
      } else if (nodeName !== vnode.type) {
        var newNode = createNodeFromVNode(vnode, instance);
        replaceChild(node, newNode, vnode, parent);
        return newNode;
      } else if (vnode.type === TEXT_TYPE) {
        if (nodeName === TEXT_TYPE) {
          // Both are textnodes, update the node
          if (node.textContent !== vnode.val) {
            node.textContent = vnode.val;
          }
    
          // Hydrate
          vnode.meta.el = node;
        } else {
          // Node isn't text, replace with one
          replaceChild(node, createNodeFromVNode(vnode, instance), vnode, parent);
        }
    
        return node;
      } else {
        // Hydrate
        vnode.meta.el = node;
    
        // Check for Component
        if (vnode.meta.component !== undefined) {
          // Diff the Component
          diffComponent(node, vnode);
    
          // Skip diffing any children
          return node;
        }
    
        // Diff props
        diffProps(node, extractAttrs(node), vnode);
    
        // Add event listeners
        addEventListeners(node, vnode, instance);
    
        // Check if innerHTML was changed, and don't diff children if so
        if (vnode.props.dom !== undefined && vnode.props.dom.innerHTML !== undefined) {
          return node;
        }
    
        // Hydrate Children
        var vnodeChildrenLength = vnode.children.length;
    
        var i = 0;
        var currentChildNode = node.firstChild;
        var vchild = vnodeChildrenLength !== 0 ? vnode.children[0] : null;
    
        while (vchild !== null || currentChildNode !== null) {
          var next = currentChildNode ? currentChildNode.nextSibling : null;
          hydrate(currentChildNode, vchild, node, instance);
          vchild = ++i < vnodeChildrenLength ? vnode.children[i] : null;
          currentChildNode = next;
        }
    
        return node;
      }
    };
    
    /**
     * 比较并替换虚拟DOM之前的差异
     * @param {Object} oldVNode
     * @param {Object} vnode
     * @param {Object} parent
     * @param {Object} instance
     * @return {Number} patch type
     */
    var diff = function (oldVNode, vnode, parent, instance) {
      if (oldVNode === null) {
        // No Node, append a node
        appendChild(createNodeFromVNode(vnode, instance), vnode, parent);
    
        return PATCH.APPEND;
      } else if (vnode === null) {
        // No New VNode, remove Node
        removeChild(oldVNode.meta.el, parent);
    
        return PATCH.REMOVE;
      } else if (oldVNode === vnode) {
        // Both have the same reference, skip
        return PATCH.SKIP;
      } else if (oldVNode.type !== vnode.type) {
        // Different types, replace it
        replaceChild(oldVNode.meta.el, createNodeFromVNode(vnode, instance), vnode, parent);
    
        return PATCH.REPLACE;
      } else if (vnode.meta.shouldRender === true && vnode.type === TEXT_TYPE) {
        var node = oldVNode.meta.el;
    
        if (oldVNode.type === TEXT_TYPE) {
          // Both are textnodes, update the node
          if (vnode.val !== oldVNode.val) {
            node.textContent = vnode.val;
          }
    
          return PATCH.TEXT;
        } else {
          // Node isn't text, replace with one
          replaceChild(node, createNodeFromVNode(vnode, instance), vnode, parent);
          return PATCH.REPLACE;
        }
      } else if (vnode.meta.shouldRender === true) {
        var _node = oldVNode.meta.el;
    
        // Check for Component
        if (vnode.meta.component !== undefined) {
          // Diff Component
          diffComponent(_node, vnode);
    
          // Skip diffing any children
          return PATCH.SKIP;
        }
    
        // Diff props
        diffProps(_node, oldVNode.props.attrs, vnode);
        oldVNode.props.attrs = vnode.props.attrs;
    
        // Check if innerHTML was changed, don't diff children
        if (vnode.props.dom !== undefined && vnode.props.dom.innerHTML !== undefined) {
          // Skip Children
          return PATCH.SKIP;
        }
    
        // Diff Children
        var newLength = vnode.children.length;
        var oldLength = oldVNode.children.length;
    
        if (newLength === 0) {
          // No Children, Remove all Children if not Already Removed
          if (oldLength !== 0) {
            var firstChild = null;
            while ((firstChild = _node.firstChild) !== null) {
              removeChild(firstChild, _node);
            }
            oldVNode.children = [];
          }
        } else {
          // Traverse and Diff Children
          var totalLen = newLength > oldLength ? newLength : oldLength;
          for (var i = 0; i < totalLen; i++) {
            var oldChild = i < oldLength ? oldVNode.children[i] : null;
            var child = i < newLength ? vnode.children[i] : null;
    
            var action = diff(oldChild, child, _node, instance);
    
            // Update Children to Match Action
            switch (action) {
              case PATCH.APPEND:
                oldVNode.children[oldLength++] = child;
                break;
              case PATCH.REMOVE:
                oldVNode.children.splice(i, 1);
                oldLength--;
                break;
              case PATCH.REPLACE:
                oldVNode.children[i] = vnode.children[i];
                break;
              case PATCH.TEXT:
                oldChild.val = child.val;
                break;
            }
          }
        }
    
        return PATCH.CHILDREN;
      } else {
        // Nothing Changed, Rehydrate and Exit
        vnode.meta.el = oldVNode.meta.el;
        return PATCH.SKIP;
      }
    };
    
    /* ======= Compiler ======= */
    var modifierRE = /\[|\.|\(/;
    var whitespaceRE = /\s/;
    
    /**
     * Compiles a Template
     * @param {String} template
     * @param {Array} delimiters
     * @param {Array} escapedDelimiters
     * @param {Boolean} isString
     * @return {String} compiled template
     */
    var compileTemplate = function (template, delimiters, escapedDelimiters, isString) {
      var state = {
        current: 0,
        template: template,
        output: "",
        openDelimiterLen: delimiters[0].length,
        closeDelimiterLen: delimiters[1].length,
        openRE: new RegExp(escapedDelimiters[0]),
        closeRE: new RegExp('\\s*' + escapedDelimiters[1])
      };
    
      compileTemplateState(state, isString);
    
      return state.output;
    };
    
    var compileTemplateState = function (state, isString) {
      var template = state.template;
      var length = template.length;
      while (state.current < length) {
        // Match Text Between Templates
        var value = scanTemplateStateUntil(state, state.openRE);
    
        if (value) {
          state.output += value;
        }
    
        // If we've reached the end, there are no more templates
        if (state.current === length) {
          break;
        }
    
        // Exit Opening Delimiter
        state.current += state.openDelimiterLen;
    
        // Consume whitespace
        scanTemplateStateForWhitespace(state);
    
        // Get the name of the opening tag
        var name = scanTemplateStateUntil(state, state.closeRE);
    
        // If we've reached the end, the tag was unclosed
        if (state.current === length) {
          if ("development" !== "production") {
            error('Expected closing delimiter "}}" after "' + name + '"');
          }
          break;
        }
    
        if (name) {
          // Extract modifiers
          var modifiers = "";
          var modifierIndex = null;
          if ((modifierIndex = name.search(modifierRE)) !== -1) {
            modifiers = name.substring(modifierIndex);
            name = name.substring(0, modifierIndex);
          }
    
          // Generate code
          if (isString) {
            state.output += '" + instance.get("' + name + '")' + modifiers + ' + "';
          } else {
            state.output += 'instance.get("' + name + '")' + modifiers;
          }
        }
    
        // Consume whitespace
        scanTemplateStateForWhitespace(state);
    
        // Exit closing delimiter
        state.current += state.closeDelimiterLen;
      }
    };
    
    var scanTemplateStateUntil = function (state, re) {
      var template = state.template;
      var tail = template.substring(state.current);
      var length = tail.length;
      var idx = tail.search(re);
    
      var match = "";
    
      switch (idx) {
        case -1:
          match = tail;
          break;
        case 0:
          match = '';
          break;
        default:
          match = tail.substring(0, idx);
      }
    
      state.current += match.length;
    
      return match;
    };
    
    var scanTemplateStateForWhitespace = function (state) {
      var template = state.template;
      var char = template[state.current];
      while (whitespaceRE.test(char)) {
        char = template[++state.current];
      }
    };
    
    var tagStartRE = /<[\w/]\s*/;
    
    // 处理html的node构建虚拟DOM对象
    var lex = function (input) {
      var state = {
        input: input,
        current: 0,
        tokens: []
      };
      lexState(state);
      return state.tokens;
    };
    
    // 分类处理标签、文本、注释
    var lexState = function (state) {
      // input就是template
      var input = state.input;
      var len = input.length;
      // 按字符遍历处理
      while (state.current < len) {
        // 处理文本
        if (input.charAt(state.current) !== "<") {
          lexText(state);
          continue;
        }
    
        // 处理注释
        if (input.substr(state.current, 4) === "<!--") {
          lexComment(state);
          continue;
        }
    
        // 处理标签
        lexTag(state);
      }
    };
    
    // 处理文本
    var lexText = function (state) {
      var input = state.input;
      var len = input.length;
      // tagStartRE = /<[\w/]\s*/;
      var endOfText = input.substring(state.current).search(tagStartRE) + state.current;
    
      // Only Text
      if (endOfText === -1) {
        state.tokens.push({
          type: "text",
          value: input.slice(state.current)
        });
        state.current = len;
        return;
      }
    
      // No Text at All
      if (endOfText === state.current) {
        return;
      }
    
      // End of Text Found
      state.tokens.push({
        type: "text",
        value: input.slice(state.current, endOfText)
      });
      state.current = endOfText;
    };
    // 处理注释
    var lexComment = function (state) {
      var input = state.input;
      var len = input.length;
      state.current += 4;
      var endOfComment = input.indexOf("-->", state.current);
    
      // Only an unclosed comment
      if (endOfComment === -1) {
        state.tokens.push({
          type: "comment",
          value: input.slice(state.current)
        });
        state.current = len;
        return;
      }
    
      // End of Comment Found
      state.tokens.push({
        type: "comment",
        value: input.slice(state.current, endOfComment)
      });
      state.current = endOfComment + 3;
    };
    // 处理标签
    var lexTag = function (state) {
      var input = state.input;
      var len = input.length;
    
      // 下一个字符是否是结束标志
      var isClosingStart = input.charAt(state.current + 1) === "/";
      // 不是+1, 是+2
      state.current += isClosingStart ? 2 : 1;
    
      // 获取tag名称
      var tagToken = lexTagType(state);
      // 获取标签的所有属性
      lexAttributes(tagToken, state);
    
      // 当前是否是结束字符
      var isClosingEnd = input.charAt(state.current) === "/";
      state.current += isClosingEnd ? 2 : 1;
    
      // Check if Closing Start
      if (isClosingStart) {
        tagToken.closeStart = true;
      }
    
      // Check if Closing End
      if (isClosingEnd) {
        tagToken.closeEnd = true;
      }
    };
    
    // 获取标签的类型，实际上就是标签名称
    var lexTagType = function (state) {
      var input = state.input;
      var len = input.length;
      var current = state.current;
      var tagType = "";
      while (current < len) {
        var char = input.charAt(current);
        if (char === "/" || char === ">" || char === " ") {
          break;
        } else {
          tagType += char;
        }
        current++;
      }
    
      var tagToken = {
        type: "tag",
        value: tagType
      };
    
      state.tokens.push(tagToken);
    
      state.current = current;
      return tagToken;
    };
    
    // 获取标签所有属性
    var lexAttributes = function (tagToken, state) {
      var input = state.input;
      var len = input.length;
      var current = state.current;
      var char = input.charAt(current);
      var nextChar = input.charAt(current + 1);
    
      var incrementChar = function () {
        current++;
        char = input.charAt(current);
        nextChar = input.charAt(current + 1);
      };
    
      var attributes = {};
    
      while (current < len) {
        // 标签结束
        if (char === ">" || char === "/" && nextChar === ">") {
          break;
        }
    
        // 空格跳过当前处理
        if (char === " ") {
          incrementChar();
          continue;
        }
        var attrName = "";
        var noValue = false;
    
        while (current < len && char !== "=") {
          if (char !== " " && char !== ">" && char !== "/" && nextChar !== ">") {
            attrName += char;
          } else {
            noValue = true;
            break;
          }
          incrementChar();
        }
    
        var attrValue = {
          name: attrName,
          value: "",
          meta: {}
        };
    
        if (noValue) {
          attributes[attrName] = attrValue;
          continue;
        }
    
        // Exit Equal Sign
        incrementChar();
    
        // Get the type of quote used
        var quoteType = " ";
        if (char === "'" || char === "\"") {
          quoteType = char;
    
          // Exit the quote
          incrementChar();
        }
    
        // Find the end of it
        while (current < len && char !== quoteType) {
          attrValue.value += char;
          incrementChar();
        }
    
        // Exit the end of it
        incrementChar();
    
        // Check for an Argument
        var argIndex = attrName.indexOf(":");
        if (argIndex !== -1) {
          var splitAttrName = attrName.split(":");
          attrValue.name = splitAttrName[0];
          attrValue.meta.arg = splitAttrName[1];
        }
    
        // Setup the Value
        attributes[attrName] = attrValue;
      }
    
      state.current = current;
      tagToken.attributes = attributes;
    };
    
    // 根据标签等构成的tokens数组来构建树形结构
    var parse = function (tokens) {
      var root = {
        type: "ROOT",
        children: []
      };
    
      var state = {
        current: 0,
        tokens: tokens
      };
    
      while (state.current < tokens.length) {
        var child = walk(state);
        if (child) {
          root.children.push(child);
        }
      }
    
      return root;
    };
    
    var VOID_ELEMENTS = ["area", "base", "br", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];
    var SVG_ELEMENTS = ["svg", "animate", "circle", "clippath", "cursor", "defs", "desc", "ellipse", "filter", "font-face", "foreignObject", "g", "glyph", "image", "line", "marker", "mask", "missing-glyph", "path", "pattern", "polygon", "polyline", "rect", "switch", "symbol", "text", "textpath", "tspan", "use", "view"];
    
    var createParseNode = function (type, props, children) {
      return {
        type: type,
        props: props,
        children: children
      };
    };
    // 处理虚拟DOM之间的关系构建树形结构
    var walk = function (state) {
      var token = state.tokens[state.current];
      var previousToken = state.tokens[state.current - 1];
      var nextToken = state.tokens[state.current + 1];
    
      var increment = function (num) {
        state.current += num === undefined ? 1 : num;
        token = state.tokens[state.current];
        previousToken = state.tokens[state.current - 1];
        nextToken = state.tokens[state.current + 1];
      };

      // 文本
      if (token.type === "text") {
        increment();
        return previousToken.value;
      }
      // 注释
      if (token.type === "comment") {
        increment();
        return null;
      }
    
      // 标签
      if (token.type === "tag") {
        var tagType = token.value;
        var closeStart = token.closeStart;
        var closeEnd = token.closeEnd;
    
        var isSVGElement = SVG_ELEMENTS.indexOf(tagType) !== -1;
        var isVoidElement = VOID_ELEMENTS.indexOf(tagType) !== -1;
    
        var node = createParseNode(tagType, token.attributes, []);
    
        increment();
    
        // If it is an svg element, let code generator know
        if (isSVGElement) {
          node.isSVG = true;
        }
    
        if (isVoidElement) {
          // Self closing, don't process further
          return node;
        } else if (closeStart === true) {
          // Unmatched closing tag on non void element
          return null;
        } else if (token !== undefined) {
          // 处理子节点，形成递归
          var current = state.current;
          while (token.type !== "tag" || token.type === "tag" && (token.closeStart === undefined && token.closeEnd === undefined || token.value !== tagType)) {
            var parsedChildState = walk(state);
            if (parsedChildState !== null) {
              node.children.push(parsedChildState);
            }
            increment(0);
            if (token === undefined) {
              // No token means a tag was most likely left unclosed
              if ("development" !== "production") {
                error('The element "' + node.type + '" was left unclosed.');
              }
              break;
            }
          }
    
          increment();
        }
    
        return node;
      }
    
      increment();
      return;
    };
    
    /**
     * Delimiters (updated every time generation is called)
     */
    var delimiters = null;
    
    /**
     * Escaped Delimiters
     */
    var escapedDelimiters = null;
    
    /**
     * h函数参数（标签属性）的构建
     * @param {Object} vnode
     * @param {Object} parentVNode
     * @return {String} generated code
     */
    var generateProps = function (vnode, parentVNode) {
      var attrs = vnode.props.attrs;
      var generatedObject = "{attrs: {";
    
      // Array of all directives (to be generated later)
      vnode.props.directives = [];
    
      if (attrs) {
        // Invoke any special directives that need to change values before code generation
        for (var beforeAttr in attrs) {
          var beforeAttrInfo = attrs[beforeAttr];
          var beforeAttrName = beforeAttrInfo.name;
          var beforeSpecialDirective = null;
    
          if ((beforeSpecialDirective = specialDirectives[beforeAttrName]) !== undefined && beforeSpecialDirective.beforeGenerate) {
            beforeSpecialDirective.beforeGenerate(beforeAttrInfo.value, beforeAttrInfo.meta, vnode, parentVNode);
          }
        }
    
        // Generate all other attributes
        for (var attr in attrs) {
          // Attribute Info
          var attrInfo = attrs[attr];
    
          // Get attr by it's actual name (in case it had any arguments)
          var attrName = attrInfo.name;
    
          // Late bind for special directive
          var specialDirective = null;
    
          // If it is a directive, mark it as dynamic
          if ((specialDirective = specialDirectives[attrName]) !== undefined) {
            // Generate Special Directives
            // Special directive found that generates code after initial generation, push it to its known special directives to run afterGenerate later
            if (specialDirective.afterGenerate !== undefined) {
              if (vnode.specialDirectivesAfter === undefined) {
                vnode.specialDirectivesAfter = {};
              }
              vnode.specialDirectivesAfter[attr] = attrInfo;
            }
    
            // Invoke any special directives that need to change values of props during code generation
            if (specialDirective.duringPropGenerate !== undefined) {
              generatedObject += specialDirective.duringPropGenerate(attrInfo.value, attrInfo.meta, vnode);
            }
    
            // Keep a flag to know to always rerender this
            vnode.meta.shouldRender = true;
    
            // Remove special directive
            delete attrs[attr];
          } else if (directives[attrName] !== undefined) {
            vnode.props.directives.push(attrInfo);
            vnode.meta.shouldRender = true;
          } else {
            var normalizedProp = JSON.stringify(attrInfo.value);
            var compiledProp = compileTemplate(normalizedProp, delimiters, escapedDelimiters, true);
            if (normalizedProp !== compiledProp) {
              vnode.meta.shouldRender = true;
            }
            generatedObject += '"' + attr + '": ' + compiledProp + ', ';
          }
        }
    
        // Close object
        if (Object.keys(attrs).length !== 0) {
          generatedObject = generatedObject.slice(0, -2) + "}";
        } else {
          generatedObject += "}";
        }
      }
    
      // Check for DOM Properties
      var dom = vnode.props.dom;
      if (dom !== undefined) {
        vnode.meta.shouldRender = true;
        // Add dom property
        generatedObject += ", dom: {";
    
        // Generate all properties
        for (var domProp in dom) {
          generatedObject += '"' + domProp + '": ' + dom[domProp] + ', ';
        }
    
        // Close object
        generatedObject = generatedObject.slice(0, -2) + "}";
      }
    
      // Check for Directives
      var allDirectives = vnode.props.directives;
      if (allDirectives.length !== 0) {
        generatedObject += ", directives: {";
    
        for (var i = 0; i < allDirectives.length; i++) {
          var directiveInfo = allDirectives[i];
          // If literal, then add value as a literal expression, or escape it
          var normalizedValue = directiveInfo.literal ? directiveInfo.value : JSON.stringify(directiveInfo.value);
          generatedObject += '"' + directiveInfo.name + '": ' + normalizedValue + ', ';
        }
    
        // Close object
        generatedObject = generatedObject.slice(0, -2) + "}";
      }
    
      // Close the final generated object
      generatedObject += "}";
      return generatedObject;
    };
    
    /**
     * Generates Code for Event Listeners
     * @param {Object} listeners
     * @return {String} generated code
     */
    var generateEventListeners = function (listeners) {
      // If no listeners, return empty object
      if (Object.keys(listeners).length === 0) {
        return "{}";
      }
    
      // Begin object
      var generatedObject = "{";
    
      // Generate an array for all listeners
      for (var type in listeners) {
        generatedObject += '"' + type + '": [' + generateArray(listeners[type]) + '], ';
      }
    
      // Close object
      generatedObject = generatedObject.slice(0, -2) + "}";
    
      return generatedObject;
    };
    
    /**
     * meta元数据函数体部分构建
     * @param {Object} meta
     * @return {String} generated code
     */
    var generateMeta = function (meta) {
      var generatedObject = "{";
      for (var key in meta) {
        if (key === 'eventListeners') {
          generatedObject += '"' + key + '": ' + generateEventListeners(meta[key]) + ', ';
        } else {
          generatedObject += '"' + key + '": ' + meta[key] + ', ';
        }
      }
    
      // Close object
      generatedObject = generatedObject.slice(0, -2) + "}";
    
      return generatedObject;
    };
    
    /**
     * 子节点函数体构建部分
     * @param {Array} arr
     * @return {String} generated array
     */
    var generateArray = function (arr) {
      var generatedArray = "";
      for (var i = 0; i < arr.length; i++) {
        generatedArray += arr[i] + ', ';
      }
    
      // Close array
      generatedArray = generatedArray.slice(0, -2);
    
      return generatedArray;
    };
    
    /**
     * 构建指定结构的函数体
     * @param {Object} vnode
     * @param {Object} parentVNode
     * @return {String} "h" call
     */
    var createCall = function (vnode, parentVNode) {
      // 每一个虚拟DOM对象都要被h()包裹
      var call = 'h("' + vnode.type + '", ';
    
      // 构建属性集部分
      call += generateProps(vnode, parentVNode) + ", ";
    
      // 如果存在子节点，调用generateEL,形成递归
      var children = vnode.children.map(function (vchild) {
        return generateEl(vchild, vnode);
      });
    
      // 如果子节点需要更新，那么它的父节点也需要更新
      if (vnode.meta.shouldRender === true && parentVNode !== undefined) {
        parentVNode.meta.shouldRender = true;
      }
    
      // 构建meta元数据部分
      call += generateMeta(vnode.meta);
    
      // 如果存在子节点
      if (children.length !== 0) {
        if (vnode.deep === true) {
          call += ', [].concat.apply([], [' + generateArray(children) + '])';
        } else {
          // 集中处理子节点，构建子节点参数部分
          call += ', [' + generateArray(children) + ']';
        }
      } else {
        // No children, empty array
        call += ", []";
      }
    
      // Close Call
      call += ")";
      return call;
    };
    
    var generateEl = function (vnode, parentVNode) {
      var code = "";
      // 虚拟DOM是否是字符串类型
      if (typeof vnode === "string") {
        // Escape newlines and double quotes, and compile the string
        var escapedString = escapeString(vnode);
        var compiledText = compileTemplate(escapedString, delimiters, escapedDelimiters, true);
        var textMeta = defaultMetadata();
    
        if (escapedString !== compiledText) {
          parentVNode.meta.shouldRender = true;
          textMeta.shouldRender = true;
        }
    
        code += 'h("#text", ' + generateMeta(textMeta) + ', "' + compiledText + '")';
      } else {
        // 虚拟DOM对象是否存在meta
        if (!vnode.meta) {
          vnode.meta = defaultMetadata();
        }
    
        // svg
        if (vnode.isSVG) {
          vnode.meta.isSVG = true;
        }
    
        // Setup Nested Attributes within Properties
        vnode.props = {
          attrs: vnode.props
        };
    
        // Create a Call for the Element, or Register a Slot
        var compiledCode = "";
        // 是否存在插槽slot
        if (vnode.type === "slot") {
          parentVNode.meta.shouldRender = true;
          parentVNode.deep = true;
    
          var slotNameAttr = vnode.props.attrs.name;
          compiledCode = 'instance.$slots[\'' + (slotNameAttr && slotNameAttr.value || "default") + '\']';
        } else {
          // 创建函数体
          compiledCode = createCall(vnode, parentVNode);
        }
    
        // 是否存在指令
        if (vnode.specialDirectivesAfter !== undefined) {
          for (var specialDirectiveAfterInfo in vnode.specialDirectivesAfter) {
            var specialDirectiveAfter = vnode.specialDirectivesAfter[specialDirectiveAfterInfo];
            compiledCode = specialDirectives[specialDirectiveAfter.name].afterGenerate(specialDirectiveAfter.value, specialDirectiveAfter.meta, compiledCode, vnode);
          }
        }
        code += compiledCode;
      }
      return code;
    };
    // 根据虚拟DOM树形结构构建render函数
    var generate = function (ast) {
      // 根节点
      var root = ast.children[0];
    
      // Update delimiters if needed
      var newDelimeters = null;
      if ((newDelimeters = Moon.config.delimiters) !== delimiters) {
        delimiters = newDelimeters;
    
        // Escape delimiters
        escapedDelimiters = new Array(2);
        escapedDelimiters[0] = escapeRegex(delimiters[0]);
        escapedDelimiters[1] = escapeRegex(delimiters[1]);
      }
    
      // 获取函数体
      var code = "var instance = this; return " + generateEl(root);
    
      try {
        return new Function("h", code);
      } catch (e) {
        error("Could not create render function");
        return noop;
      }
    };
    
    // 私有方法，处理html成render函数
    var compile = function (template) {
      // 将html装换成指定格式的token对象
      var tokens = lex(template);
      // 根据tokens构建虚拟DOM树结构
      var ast = parse(tokens);
      // 根据虚拟DOM树结构返回固定格式的函数
      return generate(ast);
    };
    
    // Moon构造函数
    function Moon(opts) {
      this.$opts = opts || {};
      var self = this;
      // id初始为0, 全局变量
      this.$id = id++;
      // Moon实例名称
      this.$name = this.$opts.name || "root";
      // data数据中心
      this.$data = this.$opts.data || {};
      // $render创建虚拟DOM方法
      this.$render = this.$opts.render || noop;
      // 生命周期函数容器
      // Moon提供的生命周期函数有：init、mounted、updated、destoryed
      this.$hooks = this.$opts.hooks || {};
      // methods的处理
      var methods = this.$opts.methods;
      if (methods !== undefined) {
        initMethods(self, methods);
      }
      // 自定义事件中心
      this.$events = {};
      // 虚拟DOM
      this.$dom = {};
      // 观察对象，主要用于处理计算属性的
      this.$observer = new Observer(this);
      // 实例销毁状态
      this.$destroyed = true;
      // 标志位,主要用于更新DOM
      this.$queued = false;
      // 计算属性初始化处理
      var computed = this.$opts.computed;
      if (computed !== undefined) {
        initComputed(this, computed);
      }

      // 实例初始化
      this.init();
    }
    
    /* ======= Instance Methods ======= */
    
    /**
     * 用于获取data中数据
     * @param {String} key
     * @return {String} Value of key in data
     */
    Moon.prototype.get = function (key) {
      var observer = this.$observer;
      var target = null;
      if ((target = observer.target) !== null) {
        if (observer.map[key] === undefined) {
          observer.map[key] = [target];
        } else if (observer.map[key].indexOf(target) === -1) {
          observer.map[key].push(target);
        }
      }
      return this.$data[key];
    };
    
    /**
     * 用于更新data中数据，Moon双向绑定的实现
     * @param {String} key
     * @param {String} val
     */
    Moon.prototype.set = function (key, val) {
      // Get observer
      var observer = this.$observer;
    
      // Get base of keypath
      var base = resolveKeyPath(this, this.$data, key, val);
    
      // Invoke custom setter
      var setter = null;
      if ((setter = observer.setters[base]) !== undefined) {
        setter.call(this, val);
      }
    
      // Notify observer of change
      observer.notify(base, val);
    
      // Queue a build
      queueBuild(this);
    };
    
    /**
     * Destroys Moon Instance
     */
    Moon.prototype.destroy = function () {
      // Remove event listeners
      this.off();
    
      // Remove reference to element
      this.$el = null;
    
      // Setup destroyed state
      this.$destroyed = true;
    
      // Call destroyed hook
      callHook(this, 'destroyed');
    };
    
    /**
     * 调用method
     * @param {String} method
     */
    Moon.prototype.callMethod = function (method, args) {
      args = args || [];
      this.$data[method].apply(this, args);
    };
    
    // Event Emitter, adapted from https://github.com/KingPixil/voke
    
    /**
     * 自定义事件绑定
     * @param {String} eventName
     * @param {Function} handler
     */
    Moon.prototype.on = function (eventName, handler) {
      // Get list of handlers
      var handlers = this.$events[eventName];
    
      if (handlers === undefined) {
        // If no handlers, create them
        this.$events[eventName] = [handler];
      } else {
        // If there are already handlers, add it to the list of them
        handlers.push(handler);
      }
    };
    
    /**
     * 事件解绑
     * @param {String} eventName
     * @param {Function} handler
     */
    Moon.prototype.off = function (eventName, handler) {
      if (eventName === undefined) {
        // No event name provided, remove all events
        this.$events = {};
      } else if (handler === undefined) {
        // No handler provided, remove all handlers for the event name
        this.$events[eventName] = [];
      } else {
        // Get handlers from event name
        var handlers = this.$events[eventName];
    
        // Get index of the handler to remove
        var index = handlers.indexOf(handler);
    
        // Remove the handler
        handlers.splice(index, 1);
      }
    };
    
    /**
     * 事件触发
     * @param {String} eventName
     * @param {Object} customMeta
     */
    Moon.prototype.emit = function (eventName, customMeta) {
      // Setup metadata to pass to event
      var meta = customMeta || {};
      meta.type = eventName;
    
      // Get handlers and global handlers
      var handlers = this.$events[eventName];
      var globalHandlers = this.$events["*"];
    
      // Call all handlers for the event name
      for (var i = 0; i < handlers.length; i++) {
        handlers[i](meta);
      }
    
      if (globalHandlers !== undefined) {
        // Call all of the global handlers if present
        for (var i = 0; i < globalHandlers.length; i++) {
          globalHandlers[i](meta);
        }
      }
    };
    
    /**
     * Renders "m-for" Directive Array
     * @param {Array} arr
     * @param {Function} item
     */
    Moon.prototype.renderLoop = function (arr, item) {
      // Get the amount of items (vnodes) to be created
      var items = new Array(arr.length);
    
      // Call the function and get the item for the current index
      for (var i = 0; i < arr.length; i++) {
        items[i] = item(arr[i], i);
      }
    
      return items;
    };
    
    /**
     * Renders a Class in Array/Object Form
     * @param {Array|Object|String} classNames
     * @return {String} renderedClassNames
     */
    Moon.prototype.renderClass = function (classNames) {
      if (typeof classNames === "string") {
        // If they are a string, no need for any more processing
        return classNames;
      }
    
      var renderedClassNames = "";
      if (Array.isArray(classNames)) {
        // It's an array, so go through them all and generate a string
        for (var i = 0; i < classNames.length; i++) {
          renderedClassNames += this.renderClass(classNames[i]) + ' ';
        }
      } else if (typeof classNames === "object") {
        // It's an object, so to through and render them to a string if the corresponding condition is true
        for (var className in classNames) {
          if (classNames[className]) {
            renderedClassNames += className + ' ';
          }
        }
      }
    
      // Remove trailing space and return
      renderedClassNames = renderedClassNames.slice(0, -1);
      return renderedClassNames;
    };
    
    /**
     * 处理DOM相关事情
     * @param {Object} el
     */
    Moon.prototype.mount = function (el) {
      // 获取挂载点DOM
      this.$el = document.querySelector(el);
      this.$destroyed = false;
      // 判断是否有挂载点
      if ("development" !== "production" && this.$el === null) {
        // Element not found
        error("Element " + this.$opts.el + " not found");
      }
    
      // 添加属性__moon__,指向Moon实例
      this.$el.__moon__ = this;
      // 获取template
      this.$template = this.$opts.template || this.$el.outerHTML;
      // 生成$render函数
      if (this.$render === noop) {
        this.$render = Moon.compile(this.$template);
      }
    
      // 生成虚拟DOM并转换成浏览器DOM
      this.build();
    
      // 存在mounted函数，就调用
      callHook(this, 'mounted');
    };
    
    /**
     * Renders Virtual DOM
     * @return Virtual DOM
     */
    Moon.prototype.render = function () {
      // Call render function
      return this.$render(h);
    };
    
    /**
     * 虚拟DOM转换
     * @param {Object} old
     * @param {Object} vnode
     * @param {Object} parent
     */
    Moon.prototype.patch = function (old, vnode, parent) {

      // 区分是否是虚拟DOM还是浏览器DOM
      if (old.meta !== undefined && old.meta.el !== undefined) {
        // 内容是否改变
        if (vnode.type !== old.type) {
          // 替换内容
          replaceChild(old.meta.el, createNodeFromVNode(vnode, this), parent);
          // 更新实例的挂载点
          this.$el = vnode.meta.el;
          this.$el.__moon__ = this;
        } else {
          // 比较不同并替换
          diff(old, vnode, parent, this);
        }
      } else if (old instanceof Node) {
        // 虚拟DOM与浏览器DOM之间的转换
        var newNode = hydrate(old, vnode, parent, this);
        if (newNode !== old) {
          this.$el = vnode.meta.el;
          this.$el.__moon__ = this;
        }
      }
    };
    
    /**
     * 生成虚拟DOM，并转换成浏览器DOM
     */
    Moon.prototype.build = function () {
      // 生成虚拟DOM
      var dom = this.render();
      var old = null;
      // 是否存在虚拟DOM
      if (this.$dom.meta !== undefined) {
        old = this.$dom;
      } else {
        old = this.$el;
        this.$dom = dom;
      }
      // 虚拟DOM转换成浏览器DOM
      this.patch(old, dom, this.$el.parentNode);
    };
    
    /**
     * Moon实例初始化
     */
    Moon.prototype.init = function () {
      log("======= Moon =======");
      // 如果存在init，则调用
      callHook(this, 'init');
      // 挂载点存在，调用Moon实例的mount方法
      if (this.$opts.el !== undefined) {
        this.mount(this.$opts.el);
      }
    };
    
    /* ======= Global API ======= */
    
    /**
     * Configuration of Moon
     */
    Moon.config = {
      silent: "development" === "production" || typeof console === 'undefined',
      prefix: "m-",
      delimiters: ["{{", "}}"],
      keyCodes: function (keyCodes) {
        for (var keyCode in keyCodes) {
          eventModifiersCode[keyCode] = 'if(event.keyCode !== ' + keyCodes[keyCode] + ') {return;};';
        }
      }
    };
    
    /**
     * Version of Moon
     */
    Moon.version = '0.9.0';
    
    /**
     * Moon Utilities
     */
    Moon.util = {
      noop: noop,
      error: error,
      log: log,
      merge: merge,
      extend: extend,
      h: h
    };
    
    /**
     * 第三方符合Moon插件使用
     * @param {Object} plugin
     */
    Moon.use = function (plugin) {
      plugin.init(Moon);
    };
    
    /**
     * 将HTML转换成对应的render函数
     * @param {String} template
     * @return {Function} render function
     */
    Moon.compile = function (template) {
      return compile(template);
    };
    
    /**
     * 保证当前DOM更新完毕才运行任务
     * @param {Function} task
     */
    Moon.nextTick = function (task) {
      setTimeout(task, 0);
    };
    
    /**
     * 自定义指令
     * @param {String} name
     * @param {Function} action
     */
    Moon.directive = function (name, action) {
      directives[Moon.config.prefix + name] = action;
    };
    
    /**
     * 自定义组件
     * @param {String} name
     * @param {Function} action
     */
    Moon.component = function (name, opts) {
      var Parent = this;

      if (opts.name) {
        name = opts.name;
      } else {
        opts.name = name;
      }
    
      function MoonComponent() {
        Moon.call(this, opts);
      }
    
      MoonComponent.prototype = Object.create(Parent.prototype);
      MoonComponent.prototype.constructor = MoonComponent;
    
      MoonComponent.prototype.init = function () {
        callHook(this, 'init');
        this.$destroyed = false;
        this.$props = this.$opts.props || [];
    
        this.$template = this.$opts.template;
    
        if (this.$render === noop) {
          this.$render = Moon.compile(this.$template);
        }
      };
      // 全局components注册
      components[name] = {
        CTor: MoonComponent,
        opts: opts
      };
    
      return MoonComponent;
    };
    
    /* ======= Default Directives ======= */
    
    specialDirectives[Moon.config.prefix + "if"] = {
      afterGenerate: function (value, meta, code, vnode) {
        return '(' + compileTemplate(value, delimiters, escapedDelimiters, false) + ') ? ' + code + ' : h("#text", ' + generateMeta(defaultMetadata()) + ', "")';
      }
    };
    
    specialDirectives[Moon.config.prefix + "show"] = {
      beforeGenerate: function (value, meta, vnode, parentVNode) {
        var runTimeShowDirective = {
          name: Moon.config.prefix + "show",
          value: compileTemplate(value, delimiters, escapedDelimiters, false),
          literal: true
        };
    
        vnode.props.directives.push(runTimeShowDirective);
      }
    };
    
    specialDirectives[Moon.config.prefix + "for"] = {
      beforeGenerate: function (value, meta, vnode, parentVNode) {
        // Setup Deep Flag to Flatten Array
        parentVNode.deep = true;
      },
      afterGenerate: function (value, meta, code, vnode) {
        // Get Parts
        var parts = value.split(" in ");
        // Aliases
        var aliases = parts[0].split(",");
        // The Iteratable
        var iteratable = compileTemplate(parts[1], delimiters, escapedDelimiters, false);
    
        // Get any parameters
        var params = aliases.join(",");
    
        // Change any references to the parameters in children
        code.replace(new RegExp('instance\\.get\\("(' + aliases.join("|") + ')"\\)', 'g'), function (match, alias) {
          code = code.replace(new RegExp('instance.get\\("' + alias + '"\\)', "g"), alias);
        });
    
        // Use the renderLoop runtime helper
        return 'instance.renderLoop(' + iteratable + ', function(' + params + ') { return ' + code + '; })';
      }
    };
    
    specialDirectives[Moon.config.prefix + "on"] = {
      beforeGenerate: function (value, meta, vnode) {
    
        // Extract modifiers and the event
        var rawModifiers = meta.arg.split(".");
        var eventToCall = rawModifiers[0];
        var params = "event";
        var methodToCall = compileTemplate(value, delimiters, escapedDelimiters, false);
        var rawParams = methodToCall.split("(");
    
        if (rawParams.length > 1) {
          methodToCall = rawParams.shift();
          params = rawParams.join("(").slice(0, -1);
        }
        var modifiers = "";
    
        rawModifiers.shift();
    
        for (var i = 0; i < rawModifiers.length; i++) {
          modifiers += eventModifiersCode[rawModifiers[i]];
        }
    
        var code = 'function(event) {' + modifiers + 'instance.callMethod("' + methodToCall + '", [' + params + '])}';
        if (vnode.meta.eventListeners[eventToCall] === undefined) {
          vnode.meta.eventListeners[eventToCall] = [code];
        } else {
          vnode.meta.eventListeners[eventToCall].push(code);
        }
      }
    };
    
    specialDirectives[Moon.config.prefix + "model"] = {
      beforeGenerate: function (value, meta, vnode) {
        // Compile a string value for the keypath
        var compiledStringValue = compileTemplate(value, delimiters, escapedDelimiters, true);
        // Setup default event types and dom property to change
        var eventType = "input";
        var valueProp = "value";
    
        // If input type is checkbox, listen on 'change' and change the 'checked' dom property
        if (vnode.props.attrs.type !== undefined && vnode.props.attrs.type.value === "checkbox") {
          eventType = "change";
          valueProp = "checked";
        }
    
        // Generate event listener code
        var code = 'function(event) {instance.set("' + compiledStringValue + '", event.target.' + valueProp + ')}';
    
        // Push the listener to it's event listeners
        if (vnode.meta.eventListeners[eventType] === undefined) {
          vnode.meta.eventListeners[eventType] = [code];
        } else {
          vnode.meta.eventListeners[eventType].push(code);
        }
    
        // Setup a query used to get the value, and set the corresponding dom property
        var getQuery = compileTemplate('' + delimiters[0] + compileTemplate(value, delimiters, escapedDelimiters, false) + delimiters[1], delimiters, escapedDelimiters, false);
        if (vnode.props.dom === undefined) {
          vnode.props.dom = {};
        }
        vnode.props.dom[valueProp] = getQuery;
      }
    };
    
    specialDirectives[Moon.config.prefix + "literal"] = {
      duringPropGenerate: function (value, meta, vnode) {
        var prop = meta.arg;
    
        if (prop === "class") {
          // Classes need to be rendered differently
          return '"class": instance.renderClass(' + compileTemplate(value, delimiters, escapedDelimiters, false) + '), ';
        } else if (directives[prop]) {
          vnode.props.directives.push({
            name: prop,
            value: compileTemplate(value, delimiters, escapedDelimiters, false),
            meta: {}
          });
          return "";
        } else {
          return '"' + prop + '": ' + compileTemplate(value, delimiters, escapedDelimiters, false) + ', ';
        }
      }
    };
    
    specialDirectives[Moon.config.prefix + "html"] = {
      beforeGenerate: function (value, meta, vnode) {
        if (vnode.props.dom === undefined) {
          vnode.props.dom = {};
        }
        vnode.props.dom.innerHTML = '"' + compileTemplate(value, delimiters, escapedDelimiters, true) + '"';
      }
    };
    
    directives[Moon.config.prefix + "show"] = function (el, val, vnode) {
      el.style.display = val ? '' : 'none';
    };
    
    directives[Moon.config.prefix + "mask"] = function (el, val, vnode) {};
    return Moon;
}));
