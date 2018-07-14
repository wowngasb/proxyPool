#!/bin/bash
source /usr/local/mrq/bin/activate
cd /usr/local/mrq/proxyPool
processlist=`ps -ef | grep "python" | grep "check_proxy_timed_set" | grep -v "grep" |wc -l`
if [[ $processlist -lt 4 ]];then
    sh  ./run_worker.sh
fi
