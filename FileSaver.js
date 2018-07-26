(function(global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.FileSaver = mod.exports;
    }
})(this, function(exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    /* FileSaver.js
     * A saveAs() FileSaver implementation.
     * 1.3.8
     * 2018-03-22 14:03:47
     *
     * By Eli Grey, https://eligrey.com
     * License: MIT
     *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
     */

    /*global self */
    /*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

    /*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/src/FileSaver.js */

    var saveAs = exports.saveAs = saveAs || function(view) {
        "use strict";
        // 不支持IE10以下的浏览器

        if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
            return;
        }
        var doc = view.document
            // only get URL when necessary in case Blob.js hasn't overridden it yet

            ,
            get_URL = function get_URL() {
                return view.URL || view.webkitURL || view;
            },

            // 创建a标签，判断是否支持download
            save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"),
            can_use_save_link = "download" in save_link,

            // 创建click事件并触发
            click = function click(node) {
                var event = new MouseEvent("click");
                node.dispatchEvent(event);
            },
            // safari浏览器
            is_safari = /constructor/i.test(view.HTMLElement) || view.safari,
            // ISO下Chrome
            is_chrome_ios = /CriOS\/[\d]+/.test(navigator.userAgent),
            setImmediate = view.setImmediate || view.setTimeout,
            throw_outside = function throw_outside(ex) {
                setImmediate(function() {
                    throw ex;
                }, 0);
            },

            // 流下载的数据内容格式
            force_saveable_type = "application/octet-stream",

            // 超时
            arbitrary_revoke_timeout = 1000 * 40 // in ms

            ,
            revoke = function revoke(file) {
                var revoker = function revoker() {
                    if (typeof file === "string") {
                        // file is an object URL
                        get_URL().revokeObjectURL(file);
                    } else {
                        // file is a File
                        file.remove();
                    }
                };
                setTimeout(revoker, arbitrary_revoke_timeout);
            },
            // 分别处理writestart progress write writeend事件
            dispatch = function dispatch(filesaver, event_types, event) {
                event_types = [].concat(event_types);
                var i = event_types.length;
                while (i--) {
                    var listener = filesaver["on" + event_types[i]];
                    if (typeof listener === "function") {
                        try {
                            listener.call(filesaver, event || filesaver);
                        } catch (ex) {
                            throw_outside(ex);
                        }
                    }
                }
            },

            // 设置了UTF-8格式的，添加BOM 0xFEFF就是BOM的十六进制表示
            auto_bom = function auto_bom(blob) {
                // prepend BOM for UTF-8 XML and text/* types (including HTML)
                // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
                if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
                    return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type });
                }
                return blob;
            },
            FileSaver = function FileSaver(blob, name, no_auto_bom) {
                if (!no_auto_bom) {
                    blob = auto_bom(blob);
                }

                var filesaver = this,
                    type = blob.type,
                    force = type === force_saveable_type,
                    object_url,
                    dispatch_all = function dispatch_all() {
                        dispatch(filesaver, "writestart progress write writeend".split(" "));
                    }
                    // on any filesys errors revert to saving with object URLs

                    ,
                    fs_error = function fs_error() {
                        // Safari不支持使用URL对象下载，使用FileReader对象来实现
                        if ((is_chrome_ios || force && is_safari) && view.FileReader) {
                            // 
                            var reader = new FileReader();
                            // 异步读取文件结束后
                            reader.onloadend = function() {
                                var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
                                // 使用window.open或location.href来实现下载
                                var popup = view.open(url, '_blank');
                                if (!popup) view.location.href = url;
                                url = undefined; // release reference before dispatching
                                filesaver.readyState = filesaver.DONE;
                                dispatch_all();
                            };
                            // 读取blob中的文件内容
                            reader.readAsDataURL(blob);
                            filesaver.readyState = filesaver.INIT;
                            return;
                        }
                        // 非Safari和ios下的浏览器处理，还是使用window.open来实现下载
                        if (!object_url) {
                            object_url = get_URL().createObjectURL(blob);
                        }
                        // 流内容格式下载
                        if (force) {
                            view.location.href = object_url;
                        } else {
                            var opened = view.open(object_url, "_blank");
                            if (!opened) {
                                // Apple不支持window.open下载
                                view.location.href = object_url;
                            }
                        }
                        filesaver.readyState = filesaver.DONE;
                        dispatch_all();
                        revoke(object_url);
                    };

                filesaver.readyState = filesaver.INIT;

                // 支持download属性就使用a标签实现下载
                if (can_use_save_link) {
                    // 根据blob创建URL对象
                    object_url = get_URL().createObjectURL(blob);
                    setImmediate(function() {
                        save_link.href = object_url;
                        save_link.download = name;
                        // 触发click事件
                        click(save_link);
                        // 处理暴露到外面的事件
                        dispatch_all();
                        // 释放URL对象
                        revoke(object_url);
                        filesaver.readyState = filesaver.DONE;
                    }, 0);
                    return;
                }

                fs_error();
            },
            FS_proto = FileSaver.prototype,
            saveAs = function saveAs(blob, name, no_auto_bom) {
                return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
            };

        // IE10以上的使用浏览器本身的msSaveOrOpenBlob实现下载
        if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
            return function(blob, name, no_auto_bom) {
                name = name || blob.name || "download";

                if (!no_auto_bom) {
                    blob = auto_bom(blob);
                }
                return navigator.msSaveOrOpenBlob(blob, name);
            };
        }

        // todo: detect chrome extensions & packaged apps
        //save_link.target = "_blank";

        FS_proto.abort = function() {};
        FS_proto.readyState = FS_proto.INIT = 0;
        FS_proto.WRITING = 1;
        FS_proto.DONE = 2;

        FS_proto.error = FS_proto.onwritestart = FS_proto.onprogress = FS_proto.onwrite = FS_proto.onabort = FS_proto.onerror = FS_proto.onwriteend = null;

        return saveAs;
    }(typeof self !== "undefined" && self || typeof window !== "undefined" && window || undefined);
});