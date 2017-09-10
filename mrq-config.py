#-*- coding: utf-8 -*-
import requests
import pykl
import time
import os
import json
from config import mrqconfig
from config.mrqconfig import *

from utils import check_proxy

USE_LARGE_JOB_IDS = getattr(mrqconfig, 'USE_LARGE_JOB_IDS', True)

RAW_QUEUES = getattr(mrqconfig, 'RAW_QUEUES', {})
SCHEDULER_TASKS = getattr(mrqconfig, 'SCHEDULER_TASKS', [])

CONF_FETCHQL_PATH = os.path.join(os.getcwd(), 'fetchQL')
CONF_DATA_OK_KEY = 'proxy_ok_set'
CONF_DATA_ALL_KEY = 'proxy_all_set'
CONF_DATA_RANK_KEY = 'proxy_rank_hash'
CONF_CHECK_INTERVAL = 60

_json = lambda s: pykl.pyjson.loads(s, evaluation=lambda s:s, strictkey=False)
_this_ip = _json(requests.get('http://ip.chinaz.com/getip.aspx').content).get('ip', '')
_this_ip = 'xxx'

CONF_CHECK_PROXY_FUNC = lambda host, port: check_proxy('http://ip.chinaz.com/getip.aspx', (host, port), lambda headers, data: _json(data).get('ip', '')==host or _json(data).get('ip', '')==_this_ip)

PARAMS_CHECK_PROXY = lambda rawparam: {k:v for (k, v) in [ \
    ('t', int(time.time())), \
    ('h', rawparam.split('#')[0]), \
    ('p', int(rawparam.split('#')[1])), \
    ('ts', int(rawparam.split('#')[2])), \
    ('ti', int(rawparam.split('#')[3])), \
]}
RAW_QUEUES.update({
    'check_proxy_timed_set': {
        'dashboard_graph': lambda: {
            'start': time.time() - (1 * 3600),
            'stop': time.time() + (1 * 3600),
            'slices': 60,
            'include_inf': True,
            'exact': False
        },
        'job_factory': lambda rawparam: {
            'path': 'tasks.CheckProxy',
            'params': PARAMS_CHECK_PROXY(rawparam)
        }
    },
})

PARAMS_FETCH_PROXY = lambda rawparam: {k:v for (k, v) in [ \
    ('t', int(time.time())), \
    ('f', rawparam.split('#')[0]), \
    ('ts', int(rawparam.split('#')[1])), \
    ('ti', int(rawparam.split('#')[2])), \
]}
RAW_QUEUES.update({
    'fetch_proxy_timed_set': {
        'dashboard_graph': lambda: {
            'start': time.time() - (1 * 3600),
            'stop': time.time() + (1 * 3600),
            'slices': 60,
            'include_inf': True,
            'exact': False
        },
        'job_factory': lambda rawparam: {
            'path': 'tasks.FetchProxy',
            'params': PARAMS_FETCH_PROXY(rawparam)
        }
    },
})

SCHEDULER_TASKS += [
    {
        'path': 'tasks.AddFetchTask',
        'params': {
            'p': CONF_FETCHQL_PATH,
            'ts': 600,
            'tn': 1,
        },
        'interval': 30,
    }
]

SCHEDULER_TASKS += [
    {
        'path': 'tasks.AddCheckTask',
        'params': {
            'rkey': CONF_DATA_OK_KEY,
            'max_num': 999999,
            'min_num': 1,
            'ratio': 1,
            'ts': CONF_CHECK_INTERVAL,
            'tn': 3,
        },
        'interval': 60,
    }
]

SCHEDULER_TASKS += [
    {
        'path': 'tasks.AddCheckTask',
        'params': {
            'rkey': CONF_DATA_ALL_KEY,
            'max_num': 100,
            'min_num': 10,
            'ratio': 0.1,
            'ts': CONF_CHECK_INTERVAL,
            'tn': 1,
        },
        'interval': 60,
    }
]


SCHEDULER_TASKS += [
    {
        'path': 'tasks.ReCheckTask',
        'params': {
            'hkey': CONF_DATA_RANK_KEY,
            'max_num': 100,
            'min_num': 10,
            'ratio': 0.1,
            'ts': CONF_CHECK_INTERVAL,
            'tn': 1,
        },
        'interval': 300,
    }
]


SCHEDULER_INTERVAL = 1

##################################
####### MRQ AUTO SCHEDULER #######
##################################

SCHEDULER_TASKS += [
  # This will requeue jobs in the 'retry' status, until they reach their max_retries.
  {
    'path': 'mrq.basetasks.cleaning.RequeueRetryJobs',
    'params': {},
    'interval': 60
  },
  # This will requeue jobs marked as interrupted, for instance when a worker received SIGTERM
  {
    'path': 'mrq.basetasks.cleaning.RequeueInterruptedJobs',
    'params': {},
    'interval': 5 * 60
  },
  # This will requeue jobs marked as started for a long time (more than their own timeout)
  # They can exist if a worker was killed with SIGKILL and not given any time to mark
  # its current jobs as interrupted.
  {
    'path': 'mrq.basetasks.cleaning.RequeueStartedJobs',
    'params': {},
    'interval': 3600
  },
  # This will requeue jobs 'lost' between redis.blpop() and mongo.update(status=started).
  # This can happen only when the worker is killed brutally in the middle of dequeue_jobs()
  {
    'path': 'mrq.basetasks.cleaning.RequeueLostJobs',
    'params': {},
    'interval': 24 * 3600
  }
]
