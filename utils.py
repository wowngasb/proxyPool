#-*- coding: utf-8 -*-
import binascii
import urllib2
import httplib
import socket
import gzip
import StringIO

from schema import Schema, SchemaError, Regex, And, Use, Optional
from flask import request
from mrq.dashboard.utils import jsonify

from mrq.task import Task
from functools import update_wrapper

ALL_ERROR = Exception

HTTP_TIME_OUT = 30

ADD_HEADER = (
    ('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'),
    ('Accept-Encoding', 'gzip, deflate, sdch'),
    ('Accept-Language', 'zh-CN,zh;q=0.8'),
    ('Cache-Control', 'max-age=0'),
    ('Upgrade-Insecure-Requests', '1'),
    ('User-Agent', 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'),
)

USER_AGENTS = [
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; AcooBrowser; .NET CLR 1.1.4322; .NET CLR 2.0.50727)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)",
    "Mozilla/4.0 (compatible; MSIE 7.0; AOL 9.5; AOLBuild 4337.35; Windows NT 5.1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)",
    "Mozilla/5.0 (Windows; U; MSIE 9.0; Windows NT 9.0; en-US)",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 2.0.50727; Media Center PC 6.0)",
    "Mozilla/5.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; WOW64; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; .NET CLR 1.0.3705; .NET CLR 1.1.4322)",
    "Mozilla/4.0 (compatible; MSIE 7.0b; Windows NT 5.2; .NET CLR 1.1.4322; .NET CLR 2.0.50727; InfoPath.2; .NET CLR 3.0.04506.30)",
    "Mozilla/5.0 (Windows; U; Windows NT 5.1; zh-CN) AppleWebKit/523.15 (KHTML, like Gecko, Safari/419.3) Arora/0.3 (Change: 287 c9dfb30)",
    "Mozilla/5.0 (X11; U; Linux; en-US) AppleWebKit/527+ (KHTML, like Gecko, Safari/419.3) Arora/0.6",
    "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.2pre) Gecko/20070215 K-Ninja/2.1.1",
    "Mozilla/5.0 (Windows; U; Windows NT 5.1; zh-CN; rv:1.9) Gecko/20080705 Firefox/3.0 Kapiko/3.0",
    "Mozilla/5.0 (X11; Linux i686; U;) Gecko/20070322 Kazehakase/0.4.5",
    "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20",
    "Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.11 TaoBrowser/2.0 Safari/536.11",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; LBBROWSER)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E; LBBROWSER)",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.84 Safari/535.11 LBBROWSER",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)",
    "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; SV1; QQDownload 732; .NET4.0C; .NET4.0E; 360SE)",
    "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)",
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E)",
    "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1",
    "Mozilla/5.0 (iPad; U; CPU OS 4_2_1 like Mac OS X; zh-cn) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8C148 Safari/6533.18.5",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) Gecko/20100101 Firefox/16.0",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11",
    "Mozilla/5.0 (X11; U; Linux x86_64; zh-CN; rv:1.9.2.10) Gecko/20100922 Ubuntu/10.10 (maverick) Firefox/3.6.10"
]

class HttpError(Exception):
    pass
    
class HttpNetError(HttpError):
    pass

def check_proxy(proxy_info, url, ok_func):
    try:
        headers, data = getUrl(url, proxy_info=proxy_info)
        return ok_func(headers, data)
    except ALL_ERROR:
        return False
        
def getUrl(url, use_gzip=True, proxy_info=None, timeout=HTTP_TIME_OUT, add_header=ADD_HEADER, random_agent=True):
    url = url.strip()
    if not url:
        return ''
        
    try:
        return _getUrl(url, use_gzip=use_gzip, proxy_info=proxy_info, timeout=timeout, add_header=add_header, random_agent=random_agent)
    except urllib2.HTTPError as ex:
        status_code = getattr(ex, 'code', 0)
        error_cls = type('HttpError%d' % (status_code, ), (HttpError, ), {}) if status_code > 0 else HttpError
        raise error_cls('get_data http error:%d %s <%s>' % (ex.code, ex, proxy_info))
    except urllib2.URLError as ex:
        if isinstance(getattr(ex, 'reason', None), socket.error):
            raise HttpNetError('get_data socket error:%d %s <%s>' % (ex.reason.errno if ex.reason.errno else 0, ex, proxy_info))
        else:
            raise HttpNetError('get_data urlerror error:%d %s <%s>' % (ex.code, ex, proxy_info))
    except socket.error as ex:
        raise HttpNetError('get_data socket error:%d %s <%s>' % (ex.errno if ex.errno else 0, ex, proxy_info))
    except httplib.BadStatusLine as ex:
        raise HttpNetError('get_data httplib BadStatusLine:%s <%s>' % (ex, proxy_info))
    except ALL_ERROR as ex:
        raise ex

def _getUrl(url, use_gzip, proxy_info, timeout, add_header, random_agent):
    if proxy_info:
        p_type = 'https' if  isinstance(proxy_info, (tuple, list)) and len(proxy_info)>=3 and proxy_info[2] == 'https' else 'http'
        proxy_support = urllib2.ProxyHandler({p_type : p_type + "://" + ("%s:%d" % proxy_info[:2] if  isinstance(proxy_info, (tuple, list)) and len(proxy_info)>=3 else str(proxy_info))})
        opener = urllib2.build_opener(proxy_support)
        urllib2.install_opener(opener)

    req = urllib2.Request(url)
    for tag, val in add_header:
        if tag == 'Accept-Encoding':
            if not use_gzip:
                val = val.replace('gzip, ', '').replace('gzip,', '').replace('gzip', '')
        if tag == 'User-Agent':
            if random_agent:
                val = random.choice(USER_AGENTS)
        req.add_header(tag, val)

    res = urllib2.urlopen(req, timeout=timeout)

    headers, data = res.headers, res.read()
    if headers.getheader('Content-Encoding', default='').lower()=='gzip':
        try:
            data = gzip.GzipFile(fileobj=StringIO.StringIO(data)).read()
        except KeyboardInterrupt as ex:
            raise ex
        except ALL_ERROR:
            if use_gzip:
                return _getUrl(url, use_gzip=False, timeout=timeout, proxy_info=proxy_info, random_agent=random_agent)
                
    return headers, data


HttpUrlSchema = And(basestring, len, Regex(r'^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?$'))

IPSchema = And(basestring, len, Regex(r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'))

def TaskSchemaWrapper(*args, **kwgs):
    schema = Schema(*args, **kwgs)

    def _wrapper(func):
        func.params_schema = schema
        return func

    return _wrapper

def fixTaskParams(all_dict, task, args):
    cls = all_dict.get(task, None)
    if not cls or not issubclass(cls, Task):
        return None, ApiErrorBuild('task:%s is not allowed' % (task,), 531)
    schema = getattr(cls.run, 'params_schema', None)
    ex = None
    if not schema:
        return  args, ex
    else:
        try:
            return schema.validate(args), ex
        except SchemaError as ex:
            return None, ApiErrorBuild('%s:%s' % (ex.__class__.__name__, ex), 511)

def ApiSchemaWrapper(*args, **kwgs):
    schema = Schema(*args, **kwgs)

    def _wrapper(func):

        def api(*func_args, **func_kwgs):
            args = request.args.to_dict()
            try:
                params = schema.validate(args)
                return jsonify(func(**params))
            except SchemaError as ex:
                return jsonify(ApiErrorBuild('%s:%s' % (ex.__class__.__name__, ex), 511))

        update_wrapper(api, func)
        api.params_schema = schema
        return api

    return _wrapper

def ApiErrorBuild(msg='something is error', code=None, errors=None):
    if msg and isinstance(msg, (list, tuple)) and code is None and errors is None:
        return ApiErrorBuild(*msg)
    elif isinstance(msg, Exception):
        code = getattr(msg, 'code', 551) if code is None else code #默认异常错误码 551
        msg = '%s:%s' % (msg.__class__.__name__, msg.message)

    code = 500 if code is None else abs(int(code))
    err = {'code':code, 'message': msg}
    if errors:
        err['errors'] = [ApiErrorBuild(item) for item in errors]
    return {'error': err}

def run_gdom_page(sql_file):
    return {}


crc32_mod = lambda strin, num: (binascii.crc32(strin) & 0xffffffff) % num

def get_dict_of_dir(str_dir, filter_func=None):
    str_dir = str_dir.encode('gb2312', 'ignore') if isinstance(str_dir, unicode) else str_dir
    if not os.path.isdir(str_dir):
        return {}
    filter_func = filter_func if hasattr(filter_func, '__call__') else lambda s_full_name: True
    all_files, current_files = {}, os.listdir(str_dir)
    for file_name in current_files:
        if file_name=='.' or file_name=='..':
            continue
        full_name = os.path.join(str_dir, file_name)
        if os.path.isfile(full_name):
            if filter_func(full_name):
                all_files.setdefault(full_name, file_name)
        elif os.path.isdir(full_name):
            next_files = get_dict_of_dir(full_name, filter_func)
            for n_full_name, n_file_name in next_files.items():
                all_files.setdefault(n_full_name, n_file_name)

    return all_files