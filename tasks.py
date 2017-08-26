#-*- coding: utf-8 -*-
import os
import time
import random
from mrq.task import Task
from mrq.job import queue_job
from mrq.context import log, connections, get_current_job, retry_current_job, abort_current_job, set_current_config, get_current_config
from mrq.config import get_config


from utils import TaskSchemaWrapper, HttpUrlSchema, IPSchema, Regex, And, Use, Optional, run_gdom_page, crc32_mod, get_dict_of_dir

from mrq.job import queue_raw_jobs, queue_job

class Error(Exception):
    pass

class HttpError(Error):
    pass

ALL_ERROR = Exception


CONF = get_config()

CONF_CHECK_PROXY_FUNC = CONF.CONF_CHECK_PROXY_FUNC
CONF_FETCHQL_PATH = CONF.CONF_FETCHQL_PATH
CONF_DATA_OK_KEY = CONF.CONF_DATA_OK_KEY
CONF_DATA_ALL_KEY = CONF.CONF_DATA_ALL_KEY
CONF_DATA_RANK_KEY = CONF.CONF_DATA_RANK_KEY
CONF_CHECK_INTERVAL = CONF.CONF_CHECK_INTERVAL

_check_t = lambda p: p.get('ts', 0) * p.get('ti', 0) + 1 < int(time.time()) - p.get('ts', 0)

class CheckProxy(Task):

    @TaskSchemaWrapper({
        't': And(int, lambda n: n >= int(time.time()) - 10 )
        'h': IPSchema,
        'p': And(int, lambda n: n >= 0)��
        'ts': And(int, lambda n: n >= 0)��
        'ti': And(int, lambda n: n >= 0)
    }, ignore_extra_keys=True)
    def run(self, params):
        host = params.get('h', '').strip()
        port = params.get('p', 0)
        hkey = '%s:%d' % (host, port)
        if _check_t(params):
            abort_current_job()

        tmp = connections.redis.hget(CONF_DATA_RANK_KEY, hkey)
        now_num = int(tmp) if tmp else 0
        if CONF_CHECK_PROXY_FUNC(host, port):
            if now_num <= 0:
                connections.redis.hset(CONF_DATA_RANK_KEY, hkey, 1)
            elif 0 < now_num < 100:
                connections.redis.hincrby(CONF_DATA_RANK_KEY, hkey, 1)
            now_num = 1 if now_num <= 0 else now_num + 1
        else:
            if now_num > - 100:
                connections.redis.hincrby(CONF_DATA_RANK_KEY, hkey, -1)
            now_num -= 1

        if now_num > 0:
            connections.redis.sadd(CONF_DATA_OK_KEY, hkey)
        else:
            connections.redis.srem(CONF_DATA_OK_KEY, hkey)

class FetchProxy(Task):

    @TaskSchemaWrapper({
        't': And(int, lambda n: n >= int(time.time()) - 10 )
        'f': And(basestring, len, lambda s: os.path.isfile(s)),
        'ts': And(int, lambda n: n >= 0)��
        'ti': And(int, lambda n: n >= 0)
    }, ignore_extra_keys=True)
    def run(self, params):
        filename = params.get('f', '').strip()
        if _check_t(params):
            abort_current_job()
        proxy_list = run_gdom_page(filename)
        timestamp = int(time.time())
        task_map = {}
        for proxy_str in proxy_list:
            host = proxy_str.split(':', 1)[0]
            port = int(proxy_str.split(':', 1)[1])
            next_tick = timestamp + crc32_mod(proxy_str, CONF_CHECK_INTERVAL)
            rawparam = '%s#%d#%d#%d' % (host, port, CONF_CHECK_INTERVAL, int(next_tick / CONF_CHECK_INTERVAL))
            task_map.setdefault(rawparam, next_tick)
            
        queue_raw_jobs('check_proxy_timed_set', task_map)

class AddFetchTask(Task):

    @TaskSchemaWrapper({
        'p': And(basestring, len, lambda s: os.path.isdir(s)),
        'ts': And(int, lambda n: n >= 0)��
        'tn': And(int, lambda n: n >= 0)
    }, ignore_extra_keys=True)
    def run(self, params):
        dirname = params.get('p', '').strip()
        timer_seq = params.get('ts', 10)
        timer_num = params.get('tn', 1)
        
        file_map = get_dict_of_dir(dirname)
        timestamp = int(time.time())
        task_map = {}
        for filename, _ in file_map:
            for t_idx in range(timer_num):
                next_tick = timestamp + crc32_mod(filename, timer_seq) + t_idx * timer_seq
                rawparam = '%s#%d#%d' % (filename, timer_seq, int(next_tick / timer_seq))
                task_map.setdefault(rawparam, next_tick)
            
        queue_raw_jobs('fetch_proxy_timed_set', task_map)

class AddCheckTask(Task):

    @TaskSchemaWrapper({
        'rkey': And(basestring, len),
        'max_num': And(int, lambda n: n >= 0)��
        'min_num': And(int, lambda n: n >= 0)��
        'ratio': And(float, lambda f: 0 <= f <= 1)��
        'ts': And(int, lambda n: n >= 0)��
        'tn': And(int, lambda n: n >= 0)
    }, ignore_extra_keys=True)
    def run(self, params):
        rkey = params.get('rkey', '').strip()
        max_num = params.get('max_num', 100)
        min_num = params.get('min_num', 1)
        ratio = params.get('ratio', 0.1)
        timer_seq = params.get('ts', 10)
        timer_num = params.get('tn', 1)

        total = connections.redis.scard(rkey)
        num = round(total * ratio)
        num = num if min_num <= num <= max_num else (max_num if num > max_num else min_num)
        
        proxy_list = connections.redis.srandmember(rkey, num)
        timestamp = int(time.time())
        task_map = {}
        for proxy_str in proxy_list:
            host = proxy_str.split(':', 1)[0]
            port = int(proxy_str.split(':', 1)[1])
            for t_idx in range(timer_num):
                next_tick = timestamp + crc32_mod(proxy_str, timer_seq) + t_idx * timer_seq
                rawparam = '%s#%d#%d#%d' % (host, port, timer_seq, int(next_tick / timer_seq))
                task_map.setdefault(rawparam, next_tick)
            
        queue_raw_jobs('check_proxy_timed_set', task_map)
        
def main():
    set_current_config(get_config())
    print "======== START ========="
    add_num = 0
    print 'all:', add_num
    print "======== END ========="

if __name__ == '__main__':
    main()
