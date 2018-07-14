function DmsHub(opt) {
    opt = opt || {};
    this.debug = opt.debug && (typeof console !== "undefined" && typeof console.log === "function");
    this.token = opt.token || '';
    this.cdn = opt.cdn || '';
    this.ver = opt.ver || '';
    this.useDmsData = opt.useDmsData || 0;
    this.admin_id = opt.admin_id || 0;
    this.hostname = opt.hostname || location.hostname;
    this.http_scheme = 'https:' === document.location.protocol ? 'https' : 'http';
    this.dmsConfig = {};
    this.api_map = {};
    this.event_map = {};
    this.subscribe_map = {};
    this._log_func = (typeof console !== "undefined" && typeof console.info === "function" && typeof console.warn === "function") ? {
        INFO: console.info.bind(console),
        ERROR: console.warn.bind(console)
    } : {};

    this._initApi();
}

DmsHub.prototype.reload = function (r) {
    r = r || 0;
    window.location.reload(r);
};

DmsHub.prototype.empty = function (r) {
    r = r || {};
    return !r || JSON.stringify(r)=='{}' || JSON.stringify(r)=='[]';
};

/* 通用接口注册器 */
DmsHub.prototype.apiCall = function (api_name, args, success, failure, logHandler, logLevelHandler, fixArgs) {
    if (typeof this.api_map[api_name] === "function") {
        return this.api_map[api_name](args, success, failure, logHandler, logLevelHandler, fixArgs);
    }
};
DmsHub.prototype.apiRegister = function (api_name, api_func) {
    this.api_map[api_name] = api_func;
};
/* 预定义接口 */
DmsHub.prototype._initApi = function () {
    var self = this;

    var res = require.loadResourceMap ? require.loadResourceMap() : {};
    var resMap = res.resMap || {};
    for (k in resMap) {
        if (resMap.hasOwnProperty(k)) {
            var tmp = k.split('/');
            var tag = tmp[tmp.length - 1];
            tag = tag ? tag.replace('.js', '') : tag;
            if(tag){
                !(function (tag) {
                    require.async(['static/api/' + tag], function (obj) {
                        obj.debug = self.debug;
                        self[tag] = obj;
                    });
                })(tag);
            }
        }
    }
};

DmsHub.prototype.deepExtend = function (obj1, obj2) {
    if (Object.prototype.toString.call(obj1) === '[object Object]' && Object.prototype.toString.call(obj2) === '[object Object]') {
        for (prop2 in obj2) { //obj1无值,都有取obj2
            if(obj2.hasOwnProperty(prop2)){
                if (!obj1[prop2]) {
                    obj1[prop2] = obj2[prop2];
                } else { //递归赋值
                    obj1[prop2] = DmsHub.prototype.deepExtend(obj1[prop2], obj2[prop2]);
                }
            }
        }
    } else if (Object.prototype.toString.call(obj1) === '[object Array]' && Object.prototype.toString.call(obj2) === '[object Array]') {
        // 两个都是数组，进行合并
        obj1 = obj2;
    } else { //其他情况，取obj2的值
        obj1 = obj2;
    }
    return obj1;
};
DmsHub.prototype.up2camel = function (str) {
    str.toLowerCase().replace(/_(\w)/g, function (all, letter) {
        return letter.toUpperCase();
    }).replace(/\b\w+\b/g, function (word) {
        return word.substring(0, 1).toUpperCase() + word.substring(1);
    });
    return str;
};
/* 初始化入口 */
DmsHub.prototype.initDmsConfig = function (dmsConfig) {
    var self = this;
    this.dmsConfig = $.extend({}, dmsConfig);

    var dmsFunName, dmsFunUrl;
    dmsFunName = 'ROP';
    dmsFunUrl = self.http_scheme + '://staticzy.xdysoft.com/js/black_clientv3.js?v=1.1.6';
    if (dmsFunName in window && typeof window[dmsFunName] === "object") {
        self.debug && console.log("ROP is already load initDms");
        self.initDms(dmsConfig);
    } else {
        var dmsScript = document.createElement('script');
        dmsScript.type = 'text/javascript';
        dmsScript.charset = 'UTF-8';
        dmsScript.src = dmsFunUrl;
        document.getElementsByTagName("body")[0].appendChild(dmsScript);

        var dmsLoadInterval = setInterval(function () {
            if (dmsFunName in window && typeof window[dmsFunName] === "object") {
                clearInterval(dmsLoadInterval);
                self.debug && console.log("ROP has load initDms");
                self.initDms(dmsConfig);
            }
        }, 100);
    }
};
DmsHub.prototype.Enter = function (pubKey, subKey, clientId, useSSL) {
    ROP.Enter(pubKey, subKey, clientId, useSSL);
};
DmsHub.prototype.ReEnter = function (config) {
    config = config || {};
    var dmsConfig = $.extend(this.dmsConfig, config);
    this.Enter(dmsConfig.pubKey, dmsConfig.subKey, dmsConfig.clientId, 'https:' === document.location.protocol);
    this.dmsConfig = dmsConfig;
};
DmsHub.prototype.initDms = function (dmsConfig) {
    var self = this;
    self.debug && console.log("dms initDms dmsConfig:", dmsConfig);

    this.Enter(dmsConfig.pubKey, dmsConfig.subKey, dmsConfig.clientId, 'https:' === document.location.protocol);

    for (var i = 0; i < dmsConfig.topicList.length; i++) {
        var topic = dmsConfig.topicList[i];
        if (topic) {
            self.subscribe_map[topic] = 1;
            ROP.Subscribe(topic);
        }
    }
    self.debug && console.log("dms Subscribe:", self.subscribe_map);

    // DMS 连接成功 通过后台接口发送 用户进入消息
    ROP.On('enter_suc', function () {
        self.debug && console.log("dms EnterSuc");
        typeof dmsConfig.enter_suc === 'function' && dmsConfig.enter_suc();
    });

    //// 连接丢失 判断用户没有多开的情况下 尝试重新连接
    ROP.On('losed', function () {
        self.debug && console.warn("dms Losed");
        typeof dmsConfig.losed === 'function' && dmsConfig.losed();
    });

    // 发生连接挤占 被挤掉的连接 设置用户为被挤占 隐藏视频
    ROP.On("connectold", function () {
        self.debug && console.warn("dms Connectold");
        typeof dmsConfig.connectold === 'function' && dmsConfig.connectold();
    });


    //重新连接
    ROP.On("reconnect", function () {
        self.debug && console.warn("dms Reconnect");
        typeof dmsConfig.reconnect === 'function' && dmsConfig.reconnect();
    });

    //进入失败
    ROP.On('enter_fail', function (err) {
        self.debug && console.warn("dms EnterFail");
        typeof dmsConfig.enter_fail === 'function' && dmsConfig.enter_fail();
    });

    //收到关注的话题的消息
    ROP.On("publish_data", function (dms_data_str, dms_topic) {
        var dms_data = JSON.parse(dms_data_str);
        if (dms_data && self.debug) {
            if (dms_data.data && dms_data.data.stream && dms_data.data.stream.mcs_config) {
                // 自动解析信息 方便调试
                dms_data.data._mcs_config = JSON.parse(dms_data.data.stream.mcs_config);
            }
        }

        (typeof dms_data.cmd !== "undefined" && dms_data.cmd) && self.processMsg(dms_data.cmd, dms_topic, dms_data)
    });
};

DmsHub.prototype.parseUid = function (clientId) {
    var id = clientId;
    var index = id.indexOf('_');
    if (index === -1) {
        return null;
    }
    id = id.substring(index + 1);
    index = id.indexOf('_');
    if (index === -1) {
        return null;
    }
    return {
        'uid': id.substring(0, index),
        'plat': id.substring(index + 1),
        'clientId': clientId
    };
};
DmsHub.prototype.processMsg = function (cmd, dms_topic, dms_data) {
    var self = this;
    this.debug && console.log(self.date('Y-m-d H:i:s'), ' msg topic:', dms_topic, ', cmd:', cmd, dms_data);
    if (dms_topic === '__p2p__') {
        cmd = '__p2p__#' + cmd;
    }

    if (dms_data.cmd === "dms_fix") { //  检测到 dms host 发生改变  自动尝试重新连接
        this.dmsConfig.dms_msg_enable = data.dms_msg_enable;
        if (dms_data.dms_host && dms_data.dms_host !== ROP.ICS_ADDR) {
            setTimeout(function () {
                ROP.Leave();
                setTimeout(function () {
                    self.debug && console.log('dms host 改变 重试连接');
                    typeof self.dmsConfig.reconnect === 'function' && self.dmsConfig.reconnect();
                }, 3000);
            }, Math.random() * 10 * 1000);
        }
        return;
    }

    var event_list = (this.event_map && cmd in this.event_map) ? this.event_map[cmd] : [];
    for (var idx = 0; idx < event_list.length; idx++) {
        var callback = event_list[idx][0];
        var filter = event_list[idx][1];
        var tmp = typeof filter === 'function' ? filter(dms_topic, dms_data) : true;
        if (!tmp) {
            continue;
        }
        typeof callback === 'function' && callback(dms_topic, dms_data);
    }
};
DmsHub.prototype.p2pMsg = function (cmd, callback, filter) {
    this.onMsg('__p2p__#' + cmd, callback, filter);
};
/*
 onMsg_callback = function(topic, data)
 */
DmsHub.prototype.onMsg = function (cmd, callback, filter) {
    var emptyfunc = function () {
        return true;
    };
    callback = typeof callback === 'function' ? callback : emptyfunc;
    filter = typeof filter === 'function' ? filter : emptyfunc;
    this.event_map[cmd] = cmd in this.event_map ? this.event_map[cmd] : [];
    this.event_map[cmd].push([callback.bind(this), filter.bind(this)]);
};

DmsHub.prototype.api_ajax = function (host, path, args, success, failure, logHandler, logLevelHandler, fixArgs) {
    var api_url = this.http_scheme + "://" + host + path,
        start_time = new Date().getTime();

    args = args || {};
    if (this.token) {
        args.token = this.token;
    }
    fixArgs = fixArgs || {};
    logHandler = logHandler || (function (logLevel, use_time, args, data) {
        (this.debug && logLevel in this._log_func) && (this._log_func[logLevel])(this.date('Y-m-d H:i:s'), '[' + logLevel + '] ' + path + '(' + use_time + 'ms)', 'args:', args, 'data:', data)
    }).bind(this);

    // debugger

    logLevelHandler = logLevelHandler || function (res) {
        return (typeof res.code != 'undefined') ? (parseInt(res.code) === 0 ? 'INFO' : 'ERROR') : (!res.error ? 'INFO' : 'ERROR');
    };

    return $.ajax($.extend({}, {

        type: host === location.hostname.toLowerCase() ? "POST" : "GET",
        url: api_url,
        data: args,
        cache: false,
        dataType: host === location.hostname.toLowerCase() ? "json" : "jsonp",
        success: function (res) {
            typeof logHandler == 'function' && logHandler(logLevelHandler(res), Math.round((new Date().getTime() - start_time)), args, res);
            if (typeof res.code !== 'undefined') {
                if (res.code === 0) {
                    typeof success === 'function' && success(res);
                } else {
                    typeof failure === 'function' && failure(res);
                }
            } else {
                if (!res.error) {
                    typeof success === 'function' && success(res);
                } else {
                    typeof failure === 'function' && failure(res);
                }
            }

        }
    }, fixArgs));
};

DmsHub.prototype.uniqueId = function (idStrLen) {
    idStrLen = idStrLen || 8;
    // always start with a letter -- base 36 makes for a nice shortcut
    var idStr = (Math.floor((Math.random() * 25)) + 10).toString(36);
    // add a timestamp in milliseconds (base 36 again) as the base
    idStr += (new Date()).getTime().toString(36);
    // similar to above, complete the Id using random, alphanumeric characters
    do {
        idStr += (Math.floor((Math.random() * 35))).toString(36);
    } while (idStr.length < idStrLen);

    return (idStr);
};

DmsHub.prototype.setCookie = function (name, value) {
    var expdate = new Date();
    expdate.setTime(expdate.getTime() + 30 * 60 * 1000);
    document.cookie = name + "=" + value + ";expires=" + expdate.toGMTString() + ";path=/";
};
DmsHub.prototype.getCookie = function (c_name) {
    if (document.cookie.length > 0) {
        c_start = document.cookie.indexOf(c_name + "=")
        if (c_start != -1) {
            c_start = c_start + c_name.length + 1
            c_end = document.cookie.indexOf(";", c_start)
            if (c_end == -1) c_end = document.cookie.length
            return unescape(document.cookie.substring(c_start, c_end))
        }
    }
    return "";
};
/**
 * 生成一个范围内的随机数
 * nMin 最小值
 * nMax 最大值
 */
DmsHub.prototype.getRandomNum = function (nMin, nMax) {
    var Range = nMax - nMin;
    var Rand = Math.random();
    return parseInt(nMin + Math.round(Rand * Range));
};
DmsHub.prototype.time = function () {
    var timestamp = new Date().getTime();
    return parseInt(timestamp / 1000);
};
DmsHub.prototype.strtotime = function (text, now) {
    //  discuss at: http://locutus.io/php/strtotime/
    // original by: Caio Ariede (http://caioariede.com)
    // improved by: Kevin van Zonneveld (http://kvz.io)
    // improved by: Caio Ariede (http://caioariede.com)
    // improved by: A. Matías Quezada (http://amatiasq.com)
    // improved by: preuter
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Mirko Faber
    //    input by: David
    // bugfixed by: Wagner B. Soares
    // bugfixed by: Artur Tchernychev
    // bugfixed by: Stephan Bösch-Plepelits (http://github.com/plepe)
    //      note 1: Examples all have a fixed timestamp to prevent
    //      note 1: tests to fail because of variable time(zones)
    //   example 1: strtotime('+1 day', 1129633200)
    //   returns 1: 1129719600
    //   example 2: strtotime('+1 week 2 days 4 hours 2 seconds', 1129633200)
    //   returns 2: 1130425202
    //   example 3: strtotime('last month', 1129633200)
    //   returns 3: 1127041200
    //   example 4: strtotime('2009-05-04 08:30:00 GMT')
    //   returns 4: 1241425800
    //   example 5: strtotime('2009-05-04 08:30:00+00')
    //   returns 5: 1241425800
    //   example 6: strtotime('2009-05-04 08:30:00+02:00')
    //   returns 6: 1241418600
    //   example 7: strtotime('2009-05-04T08:30:00Z')
    //   returns 7: 1241425800

    var parsed
    var match
    var today
    var year
    var date
    var days
    var ranges
    var len
    var times
    var regex
    var i
    var fail = false

    if (!text) {
        return fail
    }

    // Unecessary spaces
    text = text.replace(/^\s+|\s+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/[\t\r\n]/g, '')
        .toLowerCase()

    // in contrast to php, js Date.parse function interprets:
    // dates given as yyyy-mm-dd as in timezone: UTC,
    // dates with "." or "-" as MDY instead of DMY
    // dates with two-digit years differently
    // etc...etc...
    // ...therefore we manually parse lots of common date formats
    var pattern = new RegExp([
        '^(\\d{1,4})',
        '([\\-\\.\\/:])',
        '(\\d{1,2})',
        '([\\-\\.\\/:])',
        '(\\d{1,4})',
        '(?:\\s(\\d{1,2}):(\\d{2})?:?(\\d{2})?)?',
        '(?:\\s([A-Z]+)?)?$'
    ].join(''))
    match = text.match(pattern)

    if (match && match[2] === match[4]) {
        if (match[1] > 1901) {
            switch (match[2]) {
                case '-':
                    // YYYY-M-D
                    if (match[3] > 12 || match[5] > 31) {
                        return fail
                    }

                    return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                case '.':
                    // YYYY.M.D is not parsed by strtotime()
                    return fail
                case '/':
                    // YYYY/M/D
                    if (match[3] > 12 || match[5] > 31) {
                        return fail
                    }

                    return new Date(match[1], parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
            }
        } else if (match[5] > 1901) {
            switch (match[2]) {
                case '-':
                    // D-M-YYYY
                    if (match[3] > 12 || match[1] > 31) {
                        return fail
                    }

                    return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                case '.':
                    // D.M.YYYY
                    if (match[3] > 12 || match[1] > 31) {
                        return fail
                    }

                    return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                case '/':
                    // M/D/YYYY
                    if (match[1] > 12 || match[3] > 31) {
                        return fail
                    }

                    return new Date(match[5], parseInt(match[1], 10) - 1, match[3],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
            }
        } else {
            switch (match[2]) {
                case '-':
                    // YY-M-D
                    if (match[3] > 12 || match[5] > 31 || (match[1] < 70 && match[1] > 38)) {
                        return fail
                    }

                    year = match[1] >= 0 && match[1] <= 38 ? +match[1] + 2000 : match[1]
                    return new Date(year, parseInt(match[3], 10) - 1, match[5],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                case '.':
                    // D.M.YY or H.MM.SS
                    if (match[5] >= 70) {
                        // D.M.YY
                        if (match[3] > 12 || match[1] > 31) {
                            return fail
                        }

                        return new Date(match[5], parseInt(match[3], 10) - 1, match[1],
                            match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                    }
                    if (match[5] < 60 && !match[6]) {
                        // H.MM.SS
                        if (match[1] > 23 || match[3] > 59) {
                            return fail
                        }

                        today = new Date()
                        return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                            match[1] || 0, match[3] || 0, match[5] || 0, match[9] || 0) / 1000
                    }

                    // invalid format, cannot be parsed
                    return fail
                case '/':
                    // M/D/YY
                    if (match[1] > 12 || match[3] > 31 || (match[5] < 70 && match[5] > 38)) {
                        return fail
                    }

                    year = match[5] >= 0 && match[5] <= 38 ? +match[5] + 2000 : match[5]
                    return new Date(year, parseInt(match[1], 10) - 1, match[3],
                        match[6] || 0, match[7] || 0, match[8] || 0, match[9] || 0) / 1000
                case ':':
                    // HH:MM:SS
                    if (match[1] > 23 || match[3] > 59 || match[5] > 59) {
                        return fail
                    }

                    today = new Date()
                    return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
                        match[1] || 0, match[3] || 0, match[5] || 0) / 1000
            }
        }
    }

    // other formats and "now" should be parsed by Date.parse()
    if (text === 'now') {
        return now === null || isNaN(now)
            ? new Date().getTime() / 1000 | 0
            : now | 0
    }
    if (!isNaN(parsed = Date.parse(text))) {
        return parsed / 1000 | 0
    }
    // Browsers !== Chrome have problems parsing ISO 8601 date strings, as they do
    // not accept lower case characters, space, or shortened time zones.
    // Therefore, fix these problems and try again.
    // Examples:
    //   2015-04-15 20:33:59+02
    //   2015-04-15 20:33:59z
    //   2015-04-15t20:33:59+02:00
    pattern = new RegExp([
        '^([0-9]{4}-[0-9]{2}-[0-9]{2})',
        '[ t]',
        '([0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?)',
        '([\\+-][0-9]{2}(:[0-9]{2})?|z)'
    ].join(''))
    match = text.match(pattern)
    if (match) {
        // @todo: time zone information
        if (match[4] === 'z') {
            match[4] = 'Z'
        } else if (match[4].match(/^([+-][0-9]{2})$/)) {
            match[4] = match[4] + ':00'
        }

        if (!isNaN(parsed = Date.parse(match[1] + 'T' + match[2] + match[4]))) {
            return parsed / 1000 | 0
        }
    }

    date = now ? new Date(now * 1000) : new Date()
    days = {
        'sun': 0,
        'mon': 1,
        'tue': 2,
        'wed': 3,
        'thu': 4,
        'fri': 5,
        'sat': 6
    }
    ranges = {
        'yea': 'FullYear',
        'mon': 'Month',
        'day': 'Date',
        'hou': 'Hours',
        'min': 'Minutes',
        'sec': 'Seconds'
    }

    function lastNext(type, range, modifier) {
        var diff
        var day = days[range]

        if (typeof day !== 'undefined') {
            diff = day - date.getDay()

            if (diff === 0) {
                diff = 7 * modifier
            } else if (diff > 0 && type === 'last') {
                diff -= 7
            } else if (diff < 0 && type === 'next') {
                diff += 7
            }

            date.setDate(date.getDate() + diff)
        }
    }

    function process(val) {
        // @todo: Reconcile this with regex using \s, taking into account
        // browser issues with split and regexes
        var splt = val.split(' ')
        var type = splt[0]
        var range = splt[1].substring(0, 3)
        var typeIsNumber = /\d+/.test(type)
        var ago = splt[2] === 'ago'
        var num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1)

        if (typeIsNumber) {
            num *= parseInt(type, 10)
        }

        if (ranges.hasOwnProperty(range) && !splt[1].match(/^mon(day|\.)?$/i)) {
            return date['set' + ranges[range]](date['get' + ranges[range]]() + num)
        }

        if (range === 'wee') {
            return date.setDate(date.getDate() + (num * 7))
        }

        if (type === 'next' || type === 'last') {
            lastNext(type, range, num)
        } else if (!typeIsNumber) {
            return false
        }

        return true
    }

    times = '(years?|months?|weeks?|days?|hours?|minutes?|min|seconds?|sec' +
        '|sunday|sun\\.?|monday|mon\\.?|tuesday|tue\\.?|wednesday|wed\\.?' +
        '|thursday|thu\\.?|friday|fri\\.?|saturday|sat\\.?)'
    regex = '([+-]?\\d+\\s' + times + '|' + '(last|next)\\s' + times + ')(\\sago)?'

    match = text.match(new RegExp(regex, 'gi'))
    if (!match) {
        return fail
    }

    for (i = 0, len = match.length; i < len; i++) {
        if (!process(match[i])) {
            return fail
        }
    }

    return parseInt(date.getTime() / 1000);
};
DmsHub.prototype.date = function (format, timestamp) {
    //  discuss at: http://locutus.io/php/date/
    // original by: Carlos R. L. Rodrigues (http://www.jsfromhell.com)
    // original by: gettimeofday
    //    parts by: Peter-Paul Koch (http://www.quirksmode.org/js/beat.html)
    // improved by: Kevin van Zonneveld (http://kvz.io)
    // improved by: MeEtc (http://yass.meetcweb.com)
    // improved by: Brad Touesnard
    // improved by: Tim Wiel
    // improved by: Bryan Elliott
    // improved by: David Randall
    // improved by: Theriault (https://github.com/Theriault)
    // improved by: Theriault (https://github.com/Theriault)
    // improved by: Brett Zamir (http://brett-zamir.me)
    // improved by: Theriault (https://github.com/Theriault)
    // improved by: Thomas Beaucourt (http://www.webapp.fr)
    // improved by: JT
    // improved by: Theriault (https://github.com/Theriault)
    // improved by: Rafał Kukawski (http://blog.kukawski.pl)
    // improved by: Theriault (https://github.com/Theriault)
    //    input by: Brett Zamir (http://brett-zamir.me)
    //    input by: majak
    //    input by: Alex
    //    input by: Martin
    //    input by: Alex Wilson
    //    input by: Haravikk
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: majak
    // bugfixed by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Brett Zamir (http://brett-zamir.me)
    // bugfixed by: omid (http://locutus.io/php/380:380#comment_137122)
    // bugfixed by: Chris (http://www.devotis.nl/)
    //      note 1: Uses global: locutus to store the default timezone
    //      note 1: Although the function potentially allows timezone info
    //      note 1: (see notes), it currently does not set
    //      note 1: per a timezone specified by date_default_timezone_set(). Implementers might use
    //      note 1: $locutus.currentTimezoneOffset and
    //      note 1: $locutus.currentTimezoneDST set by that function
    //      note 1: in order to adjust the dates in this function
    //      note 1: (or our other date functions!) accordingly
    //   example 1: date('H:m:s \\m \\i\\s \\m\\o\\n\\t\\h', 1062402400)
    //   returns 1: '07:09:40 m is month'
    //   example 2: date('F j, Y, g:i a', 1062462400)
    //   returns 2: 'September 2, 2003, 12:26 am'
    //   example 3: date('Y W o', 1062462400)
    //   returns 3: '2003 36 2003'
    //   example 4: var $x = date('Y m d', (new Date()).getTime() / 1000)
    //   example 4: $x = $x + ''
    //   example 4: var $result = $x.length // 2009 01 09
    //   returns 4: 10
    //   example 5: date('W', 1104534000)
    //   returns 5: '52'
    //   example 6: date('B t', 1104534000)
    //   returns 6: '999 31'
    //   example 7: date('W U', 1293750000.82); // 2010-12-31
    //   returns 7: '52 1293750000'
    //   example 8: date('W', 1293836400); // 2011-01-01
    //   returns 8: '52'
    //   example 9: date('W Y-m-d', 1293974054); // 2011-01-02
    //   returns 9: '52 2011-01-02'
    //        test: skip-1 skip-2 skip-5
    format = format || 'Y-m-d H:i:s';
    var jsdate, f
    // Keep this here (works, but for code commented-out below for file size reasons)
    // var tal= [];
    var txtWords = [
        'Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur',
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]
    // trailing backslash -> (dropped)
    // a backslash followed by any character (including backslash) -> the character
    // empty string -> empty string
    var formatChr = /\\?(.?)/gi
    var formatChrCb = function (t, s) {
        return f[t] ? f[t]() : s
    }
    var _pad = function (n, c) {
        n = String(n)
        while (n.length < c) {
            n = '0' + n
        }
        return n
    }
    f = {
        // Day
        d: function () {
            // Day of month w/leading 0; 01..31
            return _pad(f.j(), 2)
        },
        D: function () {
            // Shorthand day name; Mon...Sun
            return f.l()
                .slice(0, 3)
        },
        j: function () {
            // Day of month; 1..31
            return jsdate.getDate()
        },
        l: function () {
            // Full day name; Monday...Sunday
            return txtWords[f.w()] + 'day'
        },
        N: function () {
            // ISO-8601 day of week; 1[Mon]..7[Sun]
            return f.w() || 7
        },
        S: function () {
            // Ordinal suffix for day of month; st, nd, rd, th
            var j = f.j()
            var i = j % 10
            if (i <= 3 && parseInt((j % 100) / 10, 10) === 1) {
                i = 0
            }
            return ['st', 'nd', 'rd'][i - 1] || 'th'
        },
        w: function () {
            // Day of week; 0[Sun]..6[Sat]
            return jsdate.getDay()
        },
        z: function () {
            // Day of year; 0..365
            var a = new Date(f.Y(), f.n() - 1, f.j())
            var b = new Date(f.Y(), 0, 1)
            return Math.round((a - b) / 864e5)
        },

        // Week
        W: function () {
            // ISO-8601 week number
            var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3)
            var b = new Date(a.getFullYear(), 0, 4)
            return _pad(1 + Math.round((a - b) / 864e5 / 7), 2)
        },

        // Month
        F: function () {
            // Full month name; January...December
            return txtWords[6 + f.n()]
        },
        m: function () {
            // Month w/leading 0; 01...12
            return _pad(f.n(), 2)
        },
        M: function () {
            // Shorthand month name; Jan...Dec
            return f.F()
                .slice(0, 3)
        },
        n: function () {
            // Month; 1...12
            return jsdate.getMonth() + 1
        },
        t: function () {
            // Days in month; 28...31
            return (new Date(f.Y(), f.n(), 0))
                .getDate()
        },

        // Year
        L: function () {
            // Is leap year?; 0 or 1
            var j = f.Y()
            return j % 4 === 0 & j % 100 !== 0 | j % 400 === 0
        },
        o: function () {
            // ISO-8601 year
            var n = f.n()
            var W = f.W()
            var Y = f.Y()
            return Y + (n === 12 && W < 9 ? 1 : n === 1 && W > 9 ? -1 : 0)
        },
        Y: function () {
            // Full year; e.g. 1980...2010
            return jsdate.getFullYear()
        },
        y: function () {
            // Last two digits of year; 00...99
            return f.Y()
                .toString()
                .slice(-2)
        },

        // Time
        a: function () {
            // am or pm
            return jsdate.getHours() > 11 ? 'pm' : 'am'
        },
        A: function () {
            // AM or PM
            return f.a()
                .toUpperCase()
        },
        B: function () {
            // Swatch Internet time; 000..999
            var H = jsdate.getUTCHours() * 36e2
            // Hours
            var i = jsdate.getUTCMinutes() * 60
            // Minutes
            // Seconds
            var s = jsdate.getUTCSeconds()
            return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3)
        },
        g: function () {
            // 12-Hours; 1..12
            return f.G() % 12 || 12
        },
        G: function () {
            // 24-Hours; 0..23
            return jsdate.getHours()
        },
        h: function () {
            // 12-Hours w/leading 0; 01..12
            return _pad(f.g(), 2)
        },
        H: function () {
            // 24-Hours w/leading 0; 00..23
            return _pad(f.G(), 2)
        },
        i: function () {
            // Minutes w/leading 0; 00..59
            return _pad(jsdate.getMinutes(), 2)
        },
        s: function () {
            // Seconds w/leading 0; 00..59
            return _pad(jsdate.getSeconds(), 2)
        },
        u: function () {
            // Microseconds; 000000-999000
            return _pad(jsdate.getMilliseconds() * 1000, 6)
        },

        // Timezone
        e: function () {
            // Timezone identifier; e.g. Atlantic/Azores, ...
            // The following works, but requires inclusion of the very large
            // timezone_abbreviations_list() function.
            /*              return that.date_default_timezone_get();
             */
            var msg = 'Not supported (see source code of date() for timezone on how to add support)'
            throw new Error(msg)
        },
        I: function () {
            // DST observed?; 0 or 1
            // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
            // If they are not equal, then DST is observed.
            var a = new Date(f.Y(), 0)
            // Jan 1
            var c = Date.UTC(f.Y(), 0)
            // Jan 1 UTC
            var b = new Date(f.Y(), 6)
            // Jul 1
            // Jul 1 UTC
            var d = Date.UTC(f.Y(), 6)
            return ((a - c) !== (b - d)) ? 1 : 0
        },
        O: function () {
            // Difference to GMT in hour format; e.g. +0200
            var tzo = jsdate.getTimezoneOffset()
            var a = Math.abs(tzo)
            return (tzo > 0 ? '-' : '+') + _pad(Math.floor(a / 60) * 100 + a % 60, 4)
        },
        P: function () {
            // Difference to GMT w/colon; e.g. +02:00
            var O = f.O()
            return (O.substr(0, 3) + ':' + O.substr(3, 2))
        },
        T: function () {
            // The following works, but requires inclusion of the very
            // large timezone_abbreviations_list() function.
            /*              var abbr, i, os, _default;
            if (!tal.length) {
              tal = that.timezone_abbreviations_list();
            }
            if ($locutus && $locutus.default_timezone) {
              _default = $locutus.default_timezone;
              for (abbr in tal) {
                for (i = 0; i < tal[abbr].length; i++) {
                  if (tal[abbr][i].timezone_id === _default) {
                    return abbr.toUpperCase();
                  }
                }
              }
            }
            for (abbr in tal) {
              for (i = 0; i < tal[abbr].length; i++) {
                os = -jsdate.getTimezoneOffset() * 60;
                if (tal[abbr][i].offset === os) {
                  return abbr.toUpperCase();
                }
              }
            }
            */
            return 'UTC'
        },
        Z: function () {
            // Timezone offset in seconds (-43200...50400)
            return -jsdate.getTimezoneOffset() * 60
        },

        // Full Date/Time
        c: function () {
            // ISO-8601 date.
            return 'Y-m-d\\TH:i:sP'.replace(formatChr, formatChrCb)
        },
        r: function () {
            // RFC 2822
            return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb)
        },
        U: function () {
            // Seconds since UNIX epoch
            return jsdate / 1000 | 0
        }
    }

    var _date = function (format, timestamp) {
        jsdate = (timestamp === undefined ? new Date() // Not provided
                : (timestamp instanceof Date) ? new Date(timestamp) // JS Date()
                    : new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
        )
        return format.replace(formatChr, formatChrCb)
    }

    return _date(format, timestamp);
};
DmsHub.prototype.htmlspecialchars = function (str) {
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/"/g, '&quot;');
    str = str.replace(/'/g, '&#039;');
    return str;
};
DmsHub.prototype.base64encode = function (input) {
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    input = String(input);
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = this._utf8_encode(input);
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64
        } else if (isNaN(chr3)) {
            enc4 = 64
        }
        output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4)
    }
    return output;
};
DmsHub.prototype.base64decode = function (input) {
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < input.length) {
        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2)
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3)
        }
    }
    output = this._utf8_decode(output);
    return output;
};
DmsHub.prototype._utf8_encode = function (string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
            utftext += String.fromCharCode(c)
        } else if ((c > 127) && (c < 2048)) {
            utftext += String.fromCharCode((c >> 6) | 192);
            utftext += String.fromCharCode((c & 63) | 128)
        } else {
            utftext += String.fromCharCode((c >> 12) | 224);
            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
            utftext += String.fromCharCode((c & 63) | 128)
        }
    }
    return utftext
};
DmsHub.prototype._utf8_decode = function (utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;
    while (i < utftext.length) {
        c = utftext.charCodeAt(i);
        if (c < 128) {
            string += String.fromCharCode(c);
            i++
        } else if ((c > 191) && (c < 224)) {
            c2 = utftext.charCodeAt(i + 1);
            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2
        } else {
            c2 = utftext.charCodeAt(i + 1);
            c3 = utftext.charCodeAt(i + 2);
            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3
        }
    }
    return string
};
DmsHub.prototype.uriDecode = function (uriComponent) {
    if (!uriComponent) {
        return uriComponent;
    }
    var ret;
    try {
        ret = decodeURIComponent(uriComponent);
    } catch (ex) {
        ret = uriComponent;
    }
    return ret;
};
DmsHub.prototype.md5 = function (string) {
    string = string || '';
    var rotateLeft = function (lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
    };
    var addUnsigned = function (lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8)
        } else {
            return (lResult ^ lX8 ^ lY8)
        }
    };
    var F = function (x, y, z) {
        return (x & y) | ((~x) & z)
    };
    var G = function (x, y, z) {
        return (x & z) | (y & (~z))
    };
    var H = function (x, y, z) {
        return (x ^ y ^ z)
    };
    var I = function (x, y, z) {
        return (y ^ (x | (~z)))
    };
    var FF = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b)
    };
    var GG = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b)
    };
    var HH = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b)
    };
    var II = function (a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b)
    };
    var convertToWordArray = function (string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWordsTempOne = lMessageLength + 8;
        var lNumberOfWordsTempTwo = (lNumberOfWordsTempOne - (lNumberOfWordsTempOne % 64)) / 64;
        var lNumberOfWords = (lNumberOfWordsTempTwo + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray
    };
    var wordToHex = function (lValue) {
        var WordToHexValue = "",
            WordToHexValueTemp = "",
            lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValueTemp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2)
        }
        return WordToHexValue
    };
    var uTF8Encode = function (string) {
        string = string.replace(/\x0d\x0a/g, "\x0a");
        var output = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                output += String.fromCharCode(c)
            } else if ((c > 127) && (c < 2048)) {
                output += String.fromCharCode((c >> 6) | 192);
                output += String.fromCharCode((c & 63) | 128)
            } else {
                output += String.fromCharCode((c >> 12) | 224);
                output += String.fromCharCode(((c >> 6) & 63) | 128);
                output += String.fromCharCode((c & 63) | 128)
            }
        }
        return output
    };

    var _md5 = function (string) {
        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7,
            S12 = 12,
            S13 = 17,
            S14 = 22;
        var S21 = 5,
            S22 = 9,
            S23 = 14,
            S24 = 20;
        var S31 = 4,
            S32 = 11,
            S33 = 16,
            S34 = 23;
        var S41 = 6,
            S42 = 10,
            S43 = 15,
            S44 = 21;
        string = uTF8Encode(string);
        x = convertToWordArray(string);
        a = 0x67452301;
        b = 0xEFCDAB89;
        c = 0x98BADCFE;
        d = 0x10325476;
        for (k = 0; k < x.length; k += 16) {
            AA = a;
            BB = b;
            CC = c;
            DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = addUnsigned(a, AA);
            b = addUnsigned(b, BB);
            c = addUnsigned(c, CC);
            d = addUnsigned(d, DD)
        }
        var tempValue = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
        return tempValue.toLowerCase()
    };

    return _md5(string);
};