#!/bin/bash
pid_num=`ps -ef |grep "python" |grep "check_proxy_timed_set" |grep -v "grep" |wc -l`
num=`expr  $RANDOM %  $pid_num + 1`
pid=`ps -ef |grep "python" |grep "check_proxy_timed_set" |grep -v "grep" |head -n $num |tail -1 |awk '{print $2}'`
kill -2 $pid
