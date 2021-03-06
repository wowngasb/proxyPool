FROM python:2.7.8
MAINTAINER konglin

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

RUN pip install -r requirements.txt

RUN python /usr/src/app/fetchQL/write_gql.py

CMD [ "python", "mrqworker.py", "--scheduler", "--greenlets", "80", "default", "fetch_proxy_timed_set", "check_proxy_timed_set"]
