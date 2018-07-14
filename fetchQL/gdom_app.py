import os
from pykl import gdom, pyhttp
from pyquery import PyQuery as pq
import requests
import json
from urlparse import urlparse, parse_qs

app = gdom.get_test_app()
def json_to_html(td_list):
    ret_html = ''
    for item in td_list:
        ip, port, position = item
        ret_html += "<tr>\n\t<td>%s</td>\n\t<td>%s</td>\n\t<td>%s</td>\n</tr>\n" % (ip, port, position)
    return ret_html

def _get_page(page_url):
    u = urlparse(page_url)
    _, data = pyhttp.get_url(page_url)
    if u.query and 'json_to_html' in parse_qs(u.query, True):
        json_data = json.loads(data)
        f_map = {
            'http://www.ip181.com': lambda s: [(i.get("ip", ''), i.get("port", ''), i.get("position", '')) for i in s.get('RESULT', [])]
        }
        for tag, func in f_map.items():
            if page_url.startswith(tag):
                data = json_to_html(func(json_data))
                break
    return pq(data)

gdom.HookProxy.set_get_page(_get_page)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.debug = True
    app.run(host='0.0.0.0', port=port, threaded=True)
