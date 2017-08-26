@ECHO ON
SET CURDATE=%DATE:~0,4%-%DATE:~5,2%-%DATE:~8,2%
SET CURTIME=%TIME:~0,2%_%TIME:~3,2%_%TIME:~6,2%
SET CURTIME=%CURTIME: =0%
ECHO ".\logs\worker_proxy_%CURDATE%_%CURTIME%.log"
python mrqworker.py --scheduler --greenlets 40 default fetch_proxy_timed_set check_proxy_timed_set > ".\logs\worker_proxy_%CURDATE%_%CURTIME%.log"