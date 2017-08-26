#!/bin/bash
nohup gunicorn -w 4 -b 0.0.0.0:5555 mrqdashboard:app > ./logs/'dashboard_log_'`date +%y-%m-%d_%H%M%S`'.out' 2>&1 &