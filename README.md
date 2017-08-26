# *proxyPool* [![Build Status](https://travis-ci.org/wowngasb/proxyPool.svg?branch=master)](https://travis-ci.org/wowngasb/proxyPool)

proxyPool is a Simple proxy pool powerby MRQ.

## Start
### Clone this repository:

```bash
git clone git@github.com:wowngasb/proxyPool.git
cd proxyPool
```

### Edit config.js and mrq-config.py:

```bash
cp config\mrq-config.py.demo config\mrq-config.py
vi config\mrq-config.py
```

### Install python dependencies by [pip](https://pypi.python.org/pypi):

```bash
pip install -r requirements.txt
```


### Just run it:
```bash
python mrqdashboard.py
python mrqworker.py
```
Visit MRQ Dashboard [http://127.0.0.1:5555/](http://127.0.0.1:5555/) 

Visit mqtt hub list [http://127.0.0.1:5555/dms/](http://127.0.0.1:5555/dms/) 

### It's already running!
<br>
 
## Features

1. MRQ worker queue
2. node mqtt client

## License

The TinyWeb framework is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT)
