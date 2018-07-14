#-*- coding: utf-8 -*-
import os
import re
from pyquery import PyQuery as pq
from pykl import gdom, pyhttp, pyutils, pyfile
from schema import Schema, SchemaError, Regex, And, Use, Optional
from flask import request
from mrq.dashboard.utils import jsonify

from functools import update_wrapper
from urlparse import urlparse, parse_qs

HttpUrlSchema = And(basestring, len, Regex(r'^(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?$'))
IPSchema = And(basestring, len, Regex(r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'))

def TaskSchemaWrapper(*args, **kwgs):
    schema = Schema(*args, **kwgs)
    def _wrapper(func):
        func.params_schema = schema
        return func
    return _wrapper

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

def json_to_html(td_list):
    ret_html = ''
    for item in td_list:
        ip, port, position = item
        ret_html += "<tr>\n\t<td>%s</td>\n\t<td>%s</td>\n\t<td>%s</td>\n</tr>\n" % (ip, port, position)
    return ret_html

def run_gdom_page(gql, get_proxy=None):
    def _fix_gdom_pq():
        def _get_page(page_url):
            http = pyhttp.MultiHttpDownLoad(spawn_num=1, error_max=5, get_proxy=get_proxy)
            data, headers = http._get_data(page_url, isok_func=lambda d, h: len(d) > 1000, use_gzip=True)

            u = urlparse(page_url)
            if u.query and 'json_to_html' in parse_qs(u.query, True):
                json_data = json.loads(data)
                f_map = {
                    'http://www.ip181.com': lambda s: [(i.get("ip", ''), i.get("port", ''), i.get("position", '')) for i in s.get('RESULT', [])]
                }
                for tag, func in f_map.items():
                    if page_url.startswith(tag):
                        data = json_to_html(func(json_data))
                        break
            return pq(data)

        gdom.HookProxy.set_get_page(_get_page)

    _fix_gdom_pq()
    gret = gdom.schema.execute(gql)
    page_data = gret.data.get('page', {}) if gret.data else {}
    proxy_items = page_data.get('items', []) if page_data else []
    proxy_list = [i['proxy'].strip() for i in proxy_items if i.get('proxy', '')]
    ret_list = []
    for proxy in proxy_list:
        tmp_proxy = proxy.split(':', 1)
        host, port = (tmp_proxy[0], pyutils.try_int(tmp_proxy[1])) if len(tmp_proxy)==2 else ('', 0)
        if pyutils.is_ipv4(host) and 0 < port < 65536:
            ret_list.append( '%s:%d' % (host, port) )
    return ret_list, gret

def check_proxy(url, proxy_info, ok_func):
    try:
        headers, data = pyhttp.get_url(url, proxy_info=proxy_info)
        return ok_func(headers, data)
    except pyhttp.ALL_ERROR as ex:
        return False

def main():
    filename = r'D:\github\proxyPool\fetchQL\mimiip\mimiip_gngao_528.gql'
    gql = pyfile.load_str(filename).strip()
    if not gql:
        return

    proxy_list, gret = run_gdom_page(gql)
    print 'FETCH OK filename:%s, num:%d'  % (filename, len(proxy_list))
    if gret.errors:
        print 'FETCH ERROR filename:%s, errors:%s'  % (filename, gret.errors)


    print "======== START ========="
    add_num = 0

    print 'all:', add_num
    print "======== END ========="

if __name__ == '__main__':
    main()