#-*- coding: utf-8 -*-
import sys
import os
import time
import datetime
from flask import request
from mrq.queue import Queue
from mrq.dashboard.utils import jsonify, requires_auth
from mrq.context import connections

if sys.argv and len(sys.argv) > 1:
    sys.argv = sys.argv[0:1]

from mrq.dashboard import app as FlaskApp

cfg = FlaskApp.cfg
build_api_datatables_query = FlaskApp.build_api_datatables_query

app = FlaskApp.app

app.static_folder = os.path.join(os.path.dirname(__file__), 'dashboard', 'static')
app.template_folder = os.path.join(os.path.dirname(__file__), 'dashboard', 'templates')


#######################################################################
############################ 修改 MRQ API #############################
#######################################################################

def _get_sort_args(request, defaultField = '_id', defaultDirection = 'asc', nameField = 'sSortField', nameDirection = 'sSortDirection'):
    '''  sSortField=_id&sSortDirection=asc  '''
    sSortField = request.args.get(nameField, defaultField)
    sSortDirection = request.args.get(nameDirection, defaultDirection)
    sSortDirection = 'desc' if sSortDirection == 'desc' else 'asc'
    return (sSortField, sSortDirection)


del app.view_functions['api_jobstatuses']
@app.route('/api/datatables/status')
@requires_auth
def api_jobstatuses():
    stats = list(connections.mongodb_jobs.mrq_jobs.aggregate([
        # https://jira.mongodb.org/browse/SERVER-11447
        {"$sort": {"status": 1}},
        {"$group": {"_id": "$status", "jobs": {"$sum": 1}}}
    ]))

    sSortField, sSortDirection = _get_sort_args(request)

    stats.sort(key=lambda x: x.get(sSortField, ''), reverse=sSortDirection=='desc')

    data = {
        "aaData": stats,
        "iTotalDisplayRecords": len(stats)
    }

    data["sEcho"] = request.args["sEcho"]

    return jsonify(data)

del app.view_functions['api_taskpaths']
@app.route('/api/datatables/taskpaths')
@requires_auth
def api_taskpaths():
    stats = list(connections.mongodb_jobs.mrq_jobs.aggregate([
        {"$sort": {"path": 1}},  # https://jira.mongodb.org/browse/SERVER-11447
        {"$group": {"_id": "$path", "jobs": {"$sum": 1}}}
    ]))

    sSortField, sSortDirection = _get_sort_args(request, 'jobs', 'desc')
    stats.sort(key=lambda x: x.get(sSortField, ''), reverse=sSortDirection=='desc')

    data = {
        "aaData": stats,
        "iTotalDisplayRecords": len(stats)
    }

    data["sEcho"] = request.args["sEcho"]

    return jsonify(data)

del app.view_functions['api_task_exceptions']
@app.route('/api/datatables/taskexceptions')
@requires_auth
def api_task_exceptions():
    stats = list(connections.mongodb_jobs.mrq_jobs.aggregate([
        {"$match": {"status": "failed"}},
        {"$group": {"_id": {"path": "$path", "exceptiontype": "$exceptiontype"},
                    "jobs": {"$sum": 1}}},
    ]))


    sSortField, sSortDirection = _get_sort_args(request, 'jobs', 'desc')
    stats.sort(key=lambda x: x.get(sSortField, ''), reverse=sSortDirection=='desc')

    start = int(request.args.get("iDisplayStart", 0))
    end = int(request.args.get("iDisplayLength", 20)) + start

    data = {
        "aaData": stats[start:end],
        "iTotalDisplayRecords": len(stats)
    }

    data["sEcho"] = request.args["sEcho"]

    return jsonify(data)

del app.view_functions['api_datatables']
@app.route('/api/datatables/<unit>')
@requires_auth
def api_datatables(unit):
    collection = None
    sort = None
    skip = int(request.args.get("iDisplayStart", 0))
    limit = int(request.args.get("iDisplayLength", 20))
    with_mongodb_size = bool(request.args.get("with_mongodb_size"))

    if unit == "queues":

        queues = []
        for name in Queue.all_known():
            queue = Queue(name)

            jobs = None
            if with_mongodb_size:
                jobs = connections.mongodb_jobs.mrq_jobs.count({
                    "queue": name,
                    "status": request.args.get("status") or "queued"
                })

            q = {
                "name": name,
                "jobs": jobs,  # MongoDB size
                "size": queue.size(),  # Redis size
                "is_sorted": queue.is_sorted,
                "is_timed": queue.is_timed,
                "is_raw": queue.is_raw,
                "is_set": queue.is_set
            }

            if queue.is_sorted:
                raw_config = cfg.get("raw_queues", {}).get(name, {})
                q["graph_config"] = raw_config.get("dashboard_graph", lambda: {
                    "start": time.time() - (7 * 24 * 3600),
                    "stop": time.time() + (7 * 24 * 3600),
                    "slices": 30
                } if queue.is_timed else {
                    "start": 0,
                    "stop": 100,
                    "slices": 30
                })()
                if q["graph_config"]:
                    q["graph"] = queue.get_sorted_graph(**q["graph_config"])

            if queue.is_timed:
                q["jobs_to_dequeue"] = queue.count_jobs_to_dequeue()

            queues.append(q)

        sSortField, sSortDirection = _get_sort_args(request, 'size', 'desc')
        queues.sort(key=lambda x: x.get(sSortField, 0), reverse=sSortDirection=='desc')

        data = {
            "aaData": queues,
            "iTotalDisplayRecords": len(queues)
        }

    elif unit == "workers":
        fields = None
        query = {"status": {"$nin": ["stop"]}}
        collection = connections.mongodb_jobs.mrq_workers
        sSortField, sSortDirection = _get_sort_args(request, 'datestarted', 'desc')
        sort = [(sSortField, -1 if sSortDirection == 'desc' else 1)]

        if request.args.get("showstopped"):
            query = {}

    elif unit == "scheduled_jobs":
        collection = connections.mongodb_jobs.mrq_scheduled_jobs
        fields = None
        query = {}
        sSortField, sSortDirection = _get_sort_args(request, 'interval', 'desc')
        sort = [(sSortField, -1 if sSortDirection == 'desc' else 1)]

    elif unit == "jobs":

        fields = None
        query = build_api_datatables_query(request)
        sSortField, sSortDirection = _get_sort_args(request)
        sort = [(sSortField, -1 if sSortDirection == 'desc' else 1)]

        time_s = request.args.get("time_s", '')
        time_e = request.args.get("time_e", '')
        if time_s and not time_e:
            print 'datestarted', time_s
            query.update({
                'datestarted': {'$gte': str2datetime(time_s)}
            })
        elif time_e and not time_s:
            print 'datestarted', time_e
            query.update({
                'datestarted': {'$lte': str2datetime(time_e)}
            })
        elif time_s and time_e:
            print 'datestarted', time_s, time_e
            query.update({
                'datestarted': {'$gte': str2datetime(time_s), '$lte': str2datetime(time_e)}
            })

        # We can't search easily params because we store it as decoded JSON in mongo :(
        # Add a string index?
        # if request.args.get("sSearch"):
        #   query.update(json.loads(request.args.get("sSearch")))
        collection = connections.mongodb_jobs.mrq_jobs


    if collection is not None:

        cursor = collection.find(query, projection=fields)

        if sort:
            cursor.sort(sort)

        if skip is not None:
            cursor.skip(skip)

        if limit is not None:
            cursor.limit(limit)

        data = {
            "aaData": list(cursor),
            "iTotalDisplayRecords": collection.find(query).count()
        }

    data["sEcho"] = request.args["sEcho"]

    return jsonify(data)

#######################################################################
############################ 修改 MRQ API #############################
#######################################################################



def str2datetime(time_str):
    test = datetime.datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
    timestamp = time.mktime(test.timetuple()) - 8 * 3600
    time_local = time.localtime(timestamp)
    dt = time.strftime("%Y-%m-%d %H:%M:%S", time_local)
    return datetime.datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, debug=True, threaded=False)

