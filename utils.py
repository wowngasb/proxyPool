#-*- coding: utf-8 -*-
import os
import re
from pyquery import PyQuery as pq
from pykl import gdom, pyhttp, pyutils
from schema import Schema, SchemaError, Regex, And, Use, Optional
from flask import request
from mrq.dashboard.utils import jsonify
from mrq.task import Task
from functools import update_wrapper

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

def run_gdom_page(gql, get_proxy=None):
    def _fix_gdom_pq():
        def _get_page(page_url):
            http = pyhttp.MultiHttpDownLoad(spawn_num=1, error_max=5, get_proxy=get_proxy)
            data, headers = http._get_data(page_url, isok_func=lambda d, h: len(d) > 1000, use_gzip=True)
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
    return ret_list

def check_proxy(url, proxy_info, ok_func):
    try:
        headers, data = pyhttp.get_url(url, proxy_info=proxy_info)
        return ok_func(headers, data)
    except pyhttp.ALL_ERROR as ex:
        return False