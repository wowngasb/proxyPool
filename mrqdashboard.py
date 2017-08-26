#-*- coding: utf-8 -*-
import sys

if sys.argv and len(sys.argv) > 1:
    sys.argv = sys.argv[0:1]

from mrq.dashboard import app as FlaskApp

app = FlaskApp.app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, threaded=True)
