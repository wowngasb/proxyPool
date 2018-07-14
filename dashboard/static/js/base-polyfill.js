"object"!=typeof JSON&&(JSON={}),function(){"use strict";function f(t){return t<10?"0"+t:t}function this_value(){return this.valueOf()}function quote(t){return rx_escapable.lastIndex=0,rx_escapable.test(t)?'"'+t.replace(rx_escapable,function(t){var e=meta[t];return"string"==typeof e?e:"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+t+'"'}function str(t,e){var r,n,o,u,f,a=gap,i=e[t];switch(i&&"object"==typeof i&&"function"==typeof i.toJSON&&(i=i.toJSON(t)),"function"==typeof rep&&(i=rep.call(e,t,i)),typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i)return"null";if(gap+=indent,f=[],"[object Array]"===Object.prototype.toString.apply(i)){for(u=i.length,r=0;r<u;r+=1)f[r]=str(r,i)||"null";return o=0===f.length?"[]":gap?"[\n"+gap+f.join(",\n"+gap)+"\n"+a+"]":"["+f.join(",")+"]",gap=a,o}if(rep&&"object"==typeof rep)for(u=rep.length,r=0;r<u;r+=1)"string"==typeof rep[r]&&(n=rep[r],o=str(n,i),o&&f.push(quote(n)+(gap?": ":":")+o));else for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(o=str(n,i),o&&f.push(quote(n)+(gap?": ":":")+o));return o=0===f.length?"{}":gap?"{\n"+gap+f.join(",\n"+gap)+"\n"+a+"}":"{"+f.join(",")+"}",gap=a,o}}var rx_one=/^[\],:{}\s]*$/,rx_two=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,rx_three=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,rx_four=/(?:^|:|,)(?:\s*\[)+/g,rx_escapable=/[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,rx_dangerous=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=this_value,Number.prototype.toJSON=this_value,String.prototype.toJSON=this_value);var gap,indent,meta,rep;"function"!=typeof JSON.stringify&&(meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(t,e,r){var n;if(gap="",indent="","number"==typeof r)for(n=0;n<r;n+=1)indent+=" ";else"string"==typeof r&&(indent=r);if(rep=e,e&&"function"!=typeof e&&("object"!=typeof e||"number"!=typeof e.length))throw new Error("JSON.stringify");return str("",{"":t})}),"function"!=typeof JSON.parse&&(JSON.parse=function(text,reviver){function walk(t,e){var r,n,o=t[e];if(o&&"object"==typeof o)for(r in o)Object.prototype.hasOwnProperty.call(o,r)&&(n=walk(o,r),void 0!==n?o[r]=n:delete o[r]);return reviver.call(t,e,o)}var j;if(text=String(text),rx_dangerous.lastIndex=0,rx_dangerous.test(text)&&(text=text.replace(rx_dangerous,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})),rx_one.test(text.replace(rx_two,"@").replace(rx_three,"]").replace(rx_four,"")))return j=eval("("+text+")"),"function"==typeof reviver?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}();

if (!window.localStorage) {
    Object.defineProperty(window, "localStorage", new (function () {
        var aKeys = [], oStorage = {};
        Object.defineProperty(oStorage, "getItem", {
            value: function (sKey) { return sKey ? this[sKey] : null; },
            writable: false,
            configurable: false,
            enumerable: false
        });
        Object.defineProperty(oStorage, "key", {
            value: function (nKeyId) { return aKeys[nKeyId]; },
            writable: false,
            configurable: false,
            enumerable: false
        });
        Object.defineProperty(oStorage, "setItem", {
            value: function (sKey, sValue) {
                if(!sKey) { return; }
                document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/";
            },
            writable: false,
            configurable: false,
            enumerable: false
        });
        Object.defineProperty(oStorage, "length", {
            get: function () { return aKeys.length; },
            configurable: false,
            enumerable: false
        });
        Object.defineProperty(oStorage, "removeItem", {
            value: function (sKey) {
                if(!sKey) { return; }
                document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
            },
            writable: false,
            configurable: false,
            enumerable: false
        });
        Object.defineProperty(oStorage, "clear", {
            value: function () {
                if(!aKeys.length) { return; }
                for (var sKey in aKeys) {
                    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
                }
            },
            writable: false,
            configurable: false,
            enumerable: false
        });
        this.get = function () {
            var iThisIndx;
            for (var sKey in oStorage) {
                iThisIndx = aKeys.indexOf(sKey);
                if (iThisIndx === -1) { oStorage.setItem(sKey, oStorage[sKey]); }
                else { aKeys.splice(iThisIndx, 1); }
                delete oStorage[sKey];
            }
            for (aKeys; aKeys.length > 0; aKeys.splice(0, 1)) { oStorage.removeItem(aKeys[0]); }
            for (var aCouple, iKey, nIdx = 0, aCouples = document.cookie.split(/\s*;\s*/); nIdx < aCouples.length; nIdx++) {
                aCouple = aCouples[nIdx].split(/\s*=\s*/);
                if (aCouple.length > 1) {
                    oStorage[iKey = unescape(aCouple[0])] = unescape(aCouple[1]);
                    aKeys.push(iKey);
                }
            }
            return oStorage;
        };
        this.configurable = false;
        this.enumerable = true;
    })());
}

// 修复IE10及以下版本不支持dataset属性的问题，兼容transfer-dom.js中使用了dataset的问题
if (window.navigator.userAgent.indexOf("MSIE") >= 1 && window.HTMLElement) {
    if (Object.getOwnPropertyNames(HTMLElement.prototype).indexOf('dataset') === -1) {
        Object.defineProperty(HTMLElement.prototype, 'dataset', {
            get: function() {
                var attributes = this.attributes;
                var name = [],
                    value = [];
                var obj = {};
                for (var i = 0; i < attributes.length; i++) {
                    if (attributes[i].nodeName.slice(0, 5) == 'data-') {
                        name.push(attributes[i].nodeName.slice(5));
                        value.push(attributes[i].nodeValue);
                    }
                }
                for (var j = 0; j < name.length; j++) {
                    obj[name[j]] = value[j];
                }
                return obj;
            }
        });
    }
}

//before IE10 fix Function.bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }
    var aArgs = Array.prototype.slice.call(arguments, 1),
      fToBind = this,
      fNOP = function () {},
      fBound = function () {
        return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments)));
      };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}

function rem2px(a) {
  var _rem = window.lib && window.lib.flexible && window.lib.flexible.rem || 37.5;
  var b = parseFloat(a) * _rem;
  b = parseFloat(b.toFixed(4));
  if ("string" === typeof a && a.match(/rem$/)) {
    b += "px";
  }
  return b;
}

function px2rem(a) {
  var _rem = window.lib && window.lib.flexible && window.lib.flexible.rem || 37.5;
  var b = parseFloat(a) / _rem;
  b = parseFloat(b.toFixed(4));
  if ("string" === typeof a && a.match(/px$/)) {
    b += "rem";
  }
  return b;
}

function _px(a) {
  var _rem = window.lib && window.lib.flexible && window.lib.flexible.rem || 37.5;
  var b = parseFloat(a) / 37.5 * _rem;
  b = parseFloat(b.toFixed(4));
  if ("string" === typeof a && a.match(/px$/)) {
    b += "px";
  }
  return b;
}


typeof $ === 'function' && !(function (jQuery) {
  jQuery.fn.sortElements = (function () {
    var sort = [].sort;
    return function (comparator, getSortable) {
      getSortable = getSortable ||
        function () {
          return this;
        };
      var placements = this.map(function () {
        var sortElement = getSortable.call(this),
          parentNode = sortElement.parentNode,
          nextSibling = parentNode.insertBefore(document.createTextNode(''), sortElement.nextSibling);

        return function () {
          if (parentNode === this) {
            throw new Error("You can't sort elements if any one is a descendant of another.");
          }
          parentNode.insertBefore(this, nextSibling);
          parentNode.removeChild(nextSibling);
        };
      });

      return sort.call(this, comparator).each(function (i) {
        placements[i].call(getSortable.call(this));
      });
    };
  })();

  jQuery.fn.wait = function (func) {
    var _self = this,
      _selector = this.selector,
      _iIntervalID = null;
    if (this.length) {
      func && func.call(this);
    } else {
      _iIntervalID = setInterval(function () {
        _self = $(_selector);
        if (_self.length) {
          func && setTimeout(function () {
            func.call(_self);
          }, 20);
          clearInterval(_iIntervalID);
        }
      }, 100);
    }
    return this;
  };

  //里面容器滚动，外部容器不滚动
  jQuery.fn.scrollUnique = function() {
    return $(this).each(function() {
        var eventType = 'mousewheel';
        if (document.mozHidden !== undefined) {
            eventType = 'DOMMouseScroll';
        }
        $(this).on(eventType, function(event) {
            // 一些数据
            var scrollTop = this.scrollTop,
                scrollHeight = this.scrollHeight,
                height = this.clientHeight;

            var delta = (event.originalEvent.wheelDelta) ? event.originalEvent.wheelDelta : -(event.originalEvent.detail || 0);

            if ((delta > 0 && scrollTop <= delta) || (delta < 0 && scrollHeight - height - scrollTop <= -1 * delta)) {
                // IE浏览器下滚动会跨越边界直接影响父级滚动，因此，临界时候手动边界滚动定位
                this.scrollTop = delta > 0? 0: scrollHeight;
                // 向上滚 || 向下滚
                event.preventDefault();
            }
        });
    });
};
  jQuery.fn.serializeJson = function () {
    var serializeObj = {};
    var tmp_list = this.serializeArray();
    $(tmp_list).each(function () {
      if (serializeObj[this.name]) {
        if ($.isArray(serializeObj[this.name])) {
          serializeObj[this.name].push(this.value);
        } else {
          serializeObj[this.name] = [serializeObj[this.name], this.value];
        }
      } else {
        serializeObj[this.name] = this.value;
      }
    });
    return serializeObj;
  };
})($);

typeof $ === 'function' && !(function ($) {
    var pluses = /\+/g;
    function encode(s) {
        return config.raw ? s : encodeURIComponent(s);
    }
    function decode(s) {
        return config.raw ? s : decodeURIComponent(s);
    }
    function stringifyCookieValue(value) {
        return encode(config.json ? JSON.stringify(value) : String(value));
    }
    function parseCookieValue(s) {
        if (s.indexOf('"') === 0) {
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        try {
            s = decodeURIComponent(s.replace(pluses, ' '));
            return config.json ? JSON.parse(s) : s;
        } catch(e) {}
    }
    function read(s, converter) {
        var value = config.raw ? s : parseCookieValue(s);
        return $.isFunction(converter) ? converter(value) : value;
    }
    var config = $.cookie = function (key, value, options) {
        if (value !== undefined && !$.isFunction(value)) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setTime(+t + days * 864e+5);
            }
            return (document.cookie = [
                encode(key), '=', stringifyCookieValue(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path    ? '; path=' + options.path : '',
                options.domain  ? '; domain=' + options.domain : '',
                options.secure  ? '; secure' : ''
            ].join(''));
        }
        var result = key ? undefined : {};
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = parts.join('=');
            if (key && key === name) {
                result = read(cookie, value);
                break;
            }
            if (!key && (cookie = read(cookie)) !== undefined) {
                result[name] = cookie;
            }
        }
        return result;
    };
    config.defaults = {};
    $.removeCookie = function (key, options) {
        if ($.cookie(key) === undefined) {
            return false;
        }
        $.cookie(key, '', $.extend({}, options, { expires: -1 }));
        return !$.cookie(key);
    };
})($);

var browser = {
  versions: function () {
    var u = navigator.userAgent,
      app = navigator.appVersion;
    return { //移动终端浏览器版本信息
      ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
      android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器
      iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
      iPad: u.indexOf('iPad') > -1, //是否iPad
    };
  }()
};

//判断访问终端
var $_BROWSER = {
  versions: function () {
    var u = navigator.userAgent,
      app = navigator.appVersion;
    return {
      trident: u.indexOf('Trident') > -1, //IE内核
      presto: u.indexOf('Presto') > -1, //opera内核
      webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
      gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
      mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
      ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
      android: u.indexOf('Android') > -1 || u.indexOf('Adr') > -1, //android终端
      iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
      iPad: u.indexOf('iPad') > -1, //是否iPad
      webApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
      weixin: u.indexOf('MicroMessenger') > -1, //是否微信 （2015-01-22新增）
      qq: u.match(/\sQQ/i) == " qq" //是否QQ
    };
  }(),
  language: (navigator.browserLanguage || navigator.language).toLowerCase()
};

var $_GET = (function () {
  var url = window.document.location.href.toString();
  var u = url.split("?");
  if (typeof (u[1]) === "string") {
    u = u[1].split("&");
    var _get = {};
    for (var idx = 0; idx < u.length; idx++) {
      var j = u[idx].split("=");
      _get[j[0]] = decodeURIComponent(j[1]);
    }
    return _get;
  } else {
    return {};
  }
})();

/**
 * 类ES6 rest参数的实现,使某个函数具备支持rest参数的能力
 * @param func 需要rest参数的函数
 * @param startIndex 从哪里开始标识rest参数, 如果不传递, 默认最后一个参数为rest参数
 * @returns {Function} 返回一个具有rest参数的函数
 */
var restArgs = function (func, startIndex) {
    // rest参数从哪里开始,如果没有,则默认视函数最后一个参数为rest参数
    // 注意, 函数对象的length属性, 揭示了函数的参数个数
    /*
     ex: function add(a,b) {return a+b;}
     console.log(add.length;) // 2
     */
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    // 返回一个支持rest参数的函数
    return function () {
        // 校正参数, 以免出现负值情况
        var length = Math.max(arguments.length - startIndex, 0);
        // 为rest参数开辟数组存放
        var rest = Array(length);
        // 假设参数从2个开始: func(a,b,*rest)
        // 调用: func(1,2,3,4,5); 实际的调用是:func.call(this, 1,2, [3,4,5]);
        for (var index = 0; index < length; index++) {
            rest[index] = arguments[index + startIndex];
        }
        // 根据rest参数不同, 分情况调用函数, 需要注意的是, rest参数总是最后一个参数, 否则会有歧义
        switch (startIndex) {
            case 0:
                // call的参数一个个传
                return func.call(this, rest);
            case 1:
                return func.call(this, arguments[0], rest);
            case 2:
                return func.call(this, arguments[0], arguments[1], rest);
        }
        // 如果不是上面三种情况, 而是更通用的(应该是作者写着写着发现这个switch case可能越写越长, 就用了apply)
        var args = Array(startIndex + 1);
        // 先拿到前面参数
        for (index = 0; index < startIndex; index++) {
            args[index] = arguments[index];
        }
        // 拼接上剩余参数
        args[startIndex] = rest;
        return func.apply(this, args);
    };
};

var debounce = function (func, wait, immediate) {
    var timeout, result;

    var later = function (context, args) {
        timeout = null;
        if (args) result = func.apply(context, args);
    };

    var debounced = restArgs(function (args) {
        // 一旦存在timeout， 意味之前尝试调用过func
        // 由于debounce只认最新的一次调用， 所以之前等待执行的func都会被终止
        if (timeout) clearTimeout(timeout);
        // 如果允许新的调用尝试立即执行，
        if (immediate) {
            // 如果之前尚没有调用尝试，那么此次调用可以立马执行，否则一定得等待之前的执行完毕
            var callNow = !timeout;
            // 刷新timeout
            timeout = setTimeout(later, wait);
            // 如果能被立即执行，立即执行
            if (callNow) result = func.apply(this, args);
        } else {
            // 否则，这次尝试调用会延时wait个时间
            timeout = delay(later, wait, this, args);
        }

        return result;
    });

    debounced.cancel = function () {
        clearTimeout(timeout);
        timeout = null;
    };

    return debounced;
};

var throttle = function (func, wait, options) {

    var timeout, context, args, result;
    // 最近一次func被调用的时间点
    var previous = 0;
    if (!options) options = {};

    // 创建一个延后执行的函数包裹住func的执行过程
    var later = function () {
        // 执行时，刷新最近一次调用时间
        previous = options.leading === false ? 0 : new Date();
        // 清空定时器
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };

    // 返回一个throttled的函数
    var throttled = function () {
        // ----- 节流函数开始执行----
        // 我们尝试调用func时，会首先记录当前时间戳
        var now = new Date();
        // 是否是第一次调用
        if (!previous && options.leading === false) previous = now;
        // func还要等待多久才能被调用 =  预设的最小等待期-（当前时间-上一次调用的时间）
        // 显然，如果第一次调用，且未设置options.leading = false，那么remaing=0，func会被立即执行
        var remaining = wait - (now - previous);
        // 记录之后执行时需要的上下文和参数
        context = this;
        args = arguments;

        // 如果计算后能被立即执行
        if (remaining <= 0 || remaining > wait) {
            // 清除之前的“最新调用”
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            // 刷新最近一次func调用的时间点
            previous = now;
            // 执行func调用
            result = func.apply(context, args);
            // 如果timeout被清空了，
            if (!timeout) context = args = null;

        } else if (!timeout && options.trailing !== false) {
            // 如果设置了trailing edge，那么暂缓此次调用尝试的执行
            timeout = setTimeout(later, remaining);
        }
        return result;
    };

    // 可以取消函数的节流化
    throttled.cancel = function () {
        clearTimeout(timeout);
        previous = 0;
        timeout = context = args = null;
    };

    return throttled;
};