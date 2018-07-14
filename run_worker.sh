#!/bin/bash
nohup python mrqworker.py --scheduler --greenlets 40 default fetch_proxy_timed_set check_proxy_timed_set > ./logs/'worker_proxy_'`date +%y-%m-%d_%H_%M_%S`'.log' 2>&1 &
