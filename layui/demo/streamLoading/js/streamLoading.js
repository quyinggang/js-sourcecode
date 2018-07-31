/**
 * 流加载
 * quyinggang
 * 2017-08-03 09:34
 */

(function(window, undefined) {
    // column: 内容区共分为几列展示，images：数据,type：加载类型, isAuto：是否自动滚动
    let doc = document,
        utils = {},
        config = {
            column: 3,
            images: [],
            type: 'iconAuto',
            isAuto: true
        };

    // 配置参数合并
    utils.extend = function(config, options) {
        let extend = {};
        let keys = [];
        config = config || {};
        options = options || {};
        keys = Object.keys(config);
        if (!options) return config;
        keys.forEach(function(item, index) {
            extend[item] = item && item in options ? options[item] : config[item];
        });
        return extend;
    };

    // 获取元素DOM节点
    utils.getElement = function(type, targetName) {
        if (!type || !targetName) return;
        return doc[type](targetName);
    };

    // 动态计算每列元素的宽度
    utils.setFigureWidth = function(scrollWidth, clientWidth, settings) {
        let columnWidth = 0;
        scrollWidth = 0 || scrollWidth || parseFloat(scrollWidth);
        if (settings.column > 0) {
            let column = parseInt(settings.column);
            columnWidth = Math.floor((clientWidth - column * 12 - scrollWidth) / column);
        }
        return columnWidth;
    };

    // 图标区域的外部容器的创建
    utils.createLoadingContainer = function(streamLoading) {
        if (!streamLoading || !streamLoading.nodeName) return;
        let container = utils.getElement('getElementsByClassName', 'loading'),
            node = null;
        if (container.length === 0) {
            let span = doc.createElement('span');
            span.className = 'loading';
            streamLoading.appendChild(span);
            node = span;
        }
        return node;
    };

    // 添加figure元素并设置其样式等
    utils.setFigure = function(options) {
        let FIGURE = 'figure',
            IMG = 'img',
            tagName = 'getElementsByTagName',
            { streamLoading: streamLoading, settings: settings, start: start, end: end } = options,
            clientWidth = streamLoading.clientWidth,
            columnWidth = utils.setFigureWidth(0, clientWidth, settings);

        // 动态添加元素
        for (let index = start; index < end; index++) {
            let item = settings.images[index];
            let figure = doc.createElement(FIGURE);
            let img = doc.createElement(IMG);
            if (item) {
                img.src = item;
            }
            img.alt = index + 1;
            figure.style.width = columnWidth + 'px';
            figure.appendChild(img);
            streamLoading.appendChild(figure);
        }
        // 获取滚动条宽度重新设置figure的宽度
        let nowClientWidth = streamLoading.clientWidth;
        if (nowClientWidth <= clientWidth) {
            cWidth = nowClientWidth < clientWidth ? clientWidth : nowClientWidth;
            let figures = utils.getElement(tagName, FIGURE);
            for (let i = start; i < end; i++) {
                let figure = figures[i];
                if (figure) {
                    figure.style.width = utils.setFigureWidth(clientWidth - nowClientWidth, cWidth, settings) + 'px';
                }
            }
        }
    };

    // 加载图标创建以及回调函数的指定
    var createIcon = function(streamLoading, container, callback) {
        let icon = doc.createElement('i');
        icon.className = 'fa fa-spinner fa-pulse loading-icon';
        container.appendChild(icon);
        setTimeout(function() {
            streamLoading.removeChild(container);
            typeof callback === 'function' ? callback() : '';
        }, 2000);
    };
    // 定义二种加载方式
    /**
     * 第一种: 带图标自动加载
     * 第二种: 手动点击加载
     */
    // 加载图标构建
    utils.addLoading = function(options) {
        let [streamLoading, isDown, callback, type, isOver] = options;
        let container = utils.createLoadingContainer(streamLoading);
        if (!container) return;
        if (isDown && !isOver) {
            switch (type) {
                case 'iconAuto':
                    createIcon(streamLoading, container, callback);
                    break;
                case 'click':
                    (function() {
                        let button = doc.createElement('button');
                        button.className = 'sl-button';
                        button.innerText = '点击加载';
                        container.appendChild(button);
                        button.addEventListener('click', function() {
                            container.removeChild(button);
                            createIcon(streamLoading, container, callback);
                        });
                    })();
            }
        } else if (isOver) {
            container.appendChild(doc.createTextNode('没有多余的数据了'));
        }
    };

    // 加载内容区数据
    utils.autoLoad = function(streamLoading, settings, start, end) {
        let parames = {
            streamLoading: streamLoading,
            settings: settings,
            start: start,
            end: end
        };
        utils.setFigure(parames);
    };

    // 构造函数
    let SLoading = function(options) {
        this.options = utils.extend(config, options);
    };

    // 原型对象
    SLoading.fn = SLoading.prototype;

    // 配置参数合并对外API
    SLoading.fn.set = function(options) {
        this.options = utils.extend(config, options);
    };

    // 开始执行流加载程序，绑定相关事件
    SLoading.fn.start = function(id) {
        let streamLoading = utils.getElement('getElementById', id),
            settings = this.options,
            column = settings.column,
            initCount = column * 2,
            length = settings.images.length,
            end = length,
            clientHeight = streamLoading.clientHeight,
            record = [0],
            timer = null;
        if (settings.images) {
            // 初始化时加载initCount条数据，
            initCount = initCount > length ? length :
                ((clientHeight - 200 * 2 + 18) >= 0 ? initCount + column : initCount);
            utils.autoLoad(streamLoading, settings, 0, initCount);
        }
        //  处理自动滚动
        if (settings.isAuto) {
            setInterval(function() {
                streamLoading.scrollTop += 1;
                settings.type = 'auto';
            }, 1000 / 60);
        }

        // 对内容区进行scroll事件监听
        streamLoading.addEventListener('scroll', function() {
            // 获取scrollTop、scrollHeight等
            let scrollTop = this.scrollTop,
                scrollHeight = this.scrollHeight;
            clientHeight = this.clientHeight, currentScrollPosition = clientHeight + scrollTop,
                figures = utils.getElement('getElementsByTagName', 'figure'), figuresLength = figures.length,
                compareTarget = record[record.length - 1];

            // 为了处理向上滚动带来的重复加载的问题
            if (scrollTop > compareTarget) {
                record.shift();
                record.push(scrollTop);
            }
            // 每次向下滚动需要加载的数据的结束下标, 在数据范围内, 每次加载2 * column条
            let end = figuresLength + column * 2 < length ? figuresLength + column * 2 : length;
            // 判断滚动到底部：scrollTop + clientHeigt === scrollHeight, 并且还有数据需要加载
            if (currentScrollPosition === scrollHeight && end <= length) {
                let callback = function() {
                        utils.autoLoad(streamLoading, settings, figuresLength, end);
                    },
                    isOver = figures.length >= length ? true : false,
                    isDown = scrollTop >= record[0] ? true : false;
                utils.addLoading([this, isDown, callback, settings.type, isOver]);
            }
        });
    };

    window.StreamingLoading = SLoading;
})(window);