import os
from pykl import gdom, pyhttp
from pyquery import PyQuery as pq
import requests
import json
from urlparse import urlparse, parse_qs


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

def main():
    test = '''
{
  kuaidaili: page(url: "https://www.kuaidaili.com/free/intr/9") {
    items: query(selector: "tr", filter: "lambda el: len(el.children('td'))>=2 and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func: "lambda el: el[0].text() + ':' + el[1].text()")
    }
  }
  w66ip: page(url: "http://www.66ip.cn/1.html") {
    items: query(selector: "tr", filter: "lambda el: len(el.children('td'))>=2 and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func: "lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''")
    }
  }
  mimiip: page(url: "http://www.mimiip.com/gngao/1") {
    items: query(selector: "tr", filter: "lambda el: len(el.children('td'))>=2 and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func: "lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''")
    }
  }
  ip181: page(url: "http://www.ip181.com/daili/1.html?json_to_html=1") {
    items: query(selector: "tr", filter: "lambda el: len(el.children('td'))>=2 and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func: "lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''")
    }
  }
  xicidaili: page(url: "http://www.xicidaili.com/nn/1") {
    items: query(selector: "tr", filter:"lambda el: len(el.children('td'))>=3 and el.children('td')[2].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[1].text()+':'+el[2].text() if len(el)>=3 else ''"),
    }
  }
}

'''
    tmp = gdom.schema.execute(test)
    print 'data', json.dumps(tmp.data, indent=2)
    print 'errors', tmp.errors

if __name__ == '__main__':
    main()