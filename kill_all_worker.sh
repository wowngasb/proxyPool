#!/bin/bash
ps -ef |grep "python" |grep "check_proxy_timed_set" |grep -v "grep" |awk '{print "kill -2 " $2}' |sh
