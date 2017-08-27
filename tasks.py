#-*- coding: utf-8 -*-
import os
import time
import random
from mrq.task import Task
from mrq.job import queue_job
from mrq.context import log, connections, get_current_job, retry_current_job, abort_current_job, set_current_config, get_current_config
from mrq.config import get_config


from utils import Config, TaskSchemaWrapper, IPSchema, Regex, And, Use, Optional, run_gdom_page, crc32_mod, get_dict_of_dir

from mrq.job import queue_raw_jobs, queue_job

CONF = Config(get_config())

CONF_CHECK_PROXY_FUNC = CONF.CONF_CHECK_PROXY_FUNC
CONF_FETCHQL_PATH = CONF.CONF_FETCHQL_PATH
CONF_DATA_OK_KEY = CONF.CONF_DATA_OK_KEY
CONF_DATA_ALL_KEY = CONF.CONF_DATA_ALL_KEY
CONF_DATA_RANK_KEY = CONF.CONF_DATA_RANK_KEY
CONF_CHECK_INTERVAL = CONF.CONF_CHECK_INTERVAL

_check_t = lambda p: p.get('ts', 0) * p.get('ti', 0) + 1 < int(time.time()) - p.get('ts', 0)

class CheckProxy(Task):

    @TaskSchemaWrapper({
        't': And(int, lambda n: n >= int(time.time()) - 10 ),
        'h': IPSchema,
        'p': And(int, lambda n: n >= 0),
        'ts': And(int, lambda n: n >= 0),
        'ti': And(int, lambda n: n >= 0)
    }, ignore_extra_keys=True)
    def run(self, params):
        host = params.get('h', '').strip()
        port = params.get('p', 80)
        hkey = '%s:%d' % (host, port)
        if _check_t(params):
            abort_current_job()

        connections.redis.sadd(CONF_DATA_ALL_KEY, hkey)
        tmp = connections.redis.hget(CONF_DATA_RANK_KEY, hkey)
        now_num = int(tmp) if tmp else 0
        test = CONF_CHECK_PROXY_FUNC(host, port)
        test and log.info('CHECK OK proxy:%s, num:%d'  % (hkey, now_num))
        if test:
            if now_num <= 0:
                now_num = 1 if connections.redis.sismember(CONF_DATA_OK_KEY, hkey) else 10
                connections.redis.hset(CONF_DATA_RANK_KEY, hkey, now_num)
            elif 0 < now_num < 20:
                connections.redis.hincrby(CONF_DATA_RANK_KEY, hkey, 1)
                now_num += 1
        else:
            if now_num >= -10:
                connections.redis.hincrby(CONF_DATA_RANK_KEY, hkey, -1)
            now_num -= 1

        if now_num > 0:
            connections.redis.sadd(CONF_DATA_OK_KEY, hkey)
        else:
            connections.redis.srem(CONF_DATA_OK_KEY, hkey)
        return {'proxy': hkey, 'num': now_num, 'test': test}

class FetchProxy(Task):

    @TaskSchemaWrapper({
        't': And(int, lambda n: n >= int(time.time()) - 10 ),
        'f': And(basestring, len, lambda s: os.path.isfile(s)),
        'ts': And(int, lambda n: n >= 0),
        'ti': And(int, lambda n: n >= 0),
    }, ignore_extra_keys=True)
    def run(self, params):
        filename = params.get('f', '').strip()
        if _check_t(params):
            abort_current_job()

        timer_num = 3
        timer_seq = CONF_CHECK_INTERVAL

        proxy_list = run_gdom_page(filename)
        proxy_list and log.info('FETCH OK filename:%s, num:%d'  % (filename, len(proxy_list)))

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
        return proxy_list

class AddFetchTask(Task):

    @TaskSchemaWrapper({
        'p': And(basestring, len, lambda s: os.path.isdir(s)),
        'ts': And(int, lambda n: n >= 0),
        'tn': And(int, lambda n: n >= 0),
    }, ignore_extra_keys=True)
    def run(self, params):
        dirname = params.get('p', '').strip()
        timer_seq = params.get('ts', 60)
        timer_num = params.get('tn', 1)

        file_map = get_dict_of_dir(dirname, filter_func = lambda s: s.endswith('.gql'))
        timestamp = int(time.time())
        task_map = {}
        for filename, _ in file_map.items():
            for t_idx in range(timer_num):
                next_tick = timestamp + crc32_mod(filename, timer_seq) + t_idx * timer_seq
                rawparam = '%s#%d#%d' % (filename, timer_seq, int(next_tick / timer_seq))
                task_map.setdefault(rawparam, next_tick)

        queue_raw_jobs('fetch_proxy_timed_set', task_map)
        return file_map.values()

class AddCheckTask(Task):

    @TaskSchemaWrapper({
        'rkey': And(basestring, len),
        'max_num': And(int, lambda n: n >= 0),
        'min_num': And(int, lambda n: n >= 0),
        'ratio': And(float, lambda f: 0 <= f <= 1),
        'ts': And(int, lambda n: n >= 0),
        'tn': And(int, lambda n: n >= 0),
    }, ignore_extra_keys=True)
    def run(self, params):
        rkey = params.get('rkey', '').strip()
        max_num = params.get('max_num', 100)
        min_num = params.get('min_num', 1)
        ratio = params.get('ratio', 0.1)
        timer_seq = params.get('ts', 60)
        timer_num = params.get('tn', 1)

        total = connections.redis.scard(rkey)
        num = int(round(total * ratio))
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
        return {'num': len(proxy_list), 'total': total}

def get_proxy(ip_file=os.path.join(os.getcwd(), 'ip.txt')):
    with open(ip_file, 'r') as rf:
        proxy_list = [i.strip() for i in rf if ':' in i]
    return proxy_list

def main():
    set_current_config(get_config())
    print "======== START ========="
    add_num = 0

    '''test = CONF_CHECK_PROXY_FUNC('42.202.130.246', 3128)
    print test

    proxy_list = get_proxy()
    for proxy in proxy_list:
        add_num += connections.redis.sadd(CONF_DATA_OK_KEY, proxy)
        connections.redis.hset(CONF_DATA_RANK_KEY, proxy, 10)'''

    print 'all:', add_num
    print "======== END ========="

if __name__ == '__main__':
    main()
