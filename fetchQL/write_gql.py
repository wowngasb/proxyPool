#-*- coding: utf-8 -*-
import os
import datetime

from pykl import pyfile, pyutils

def _do_map(url_map, query, path, ext, start_page=1):
    save_dir = os.path.join(os.getcwd(), path)
    if not os.path.isdir(save_dir):
        os.makedirs(save_dir)

    _pwd = lambda f: os.path.join(save_dir, f)
    _gql_tpl = lambda url :'''{
  page(url: "''' + url + '''") {''' + query + '''  }
}'''

    add_num = 0
    for k, v in url_map.items():
        max_page = v.get('max_page', 20)
        for idx in range(start_page, max_page + start_page):
            url = v['url'].format(idx=idx)
            filename = _pwd( v['file'].format(idx=idx) )
            gql = _gql_tpl(url)
            print pyutils._t(), '[INFO] idx:', idx, 'file:', filename, 'url', url
            pyfile.dump_str(gql, filename + ext)
            add_num += 1

    return add_num


def do_kuaidaili(max_page=20, path='kuaidaili', ext='.gql'):
    url_map = {
        u'国内高匿代理': {
            'url': 'http://www.kuaidaili.com/free/inha/{idx}/',
            'file': 'kuaidaili_inha_{idx}',
        },
        u'国内普通代理': {
            'url': 'http://www.kuaidaili.com/free/intr/{idx}/',
            'file': 'kuaidaili_intr_{idx}',
        },
    }

    query = '''
    items: query(selector: "tr", filter:"lambda el: el.children('td') and len(el.children('td'))>=2 and '.' in el.children('td')[0].text and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[0].text() + ':' + el[1].text()"),
    }
'''
    return _do_map(url_map, query, path, ext, 9)


def do_66ip(path='66ip', ext='.gql'):
    url_map = {
        u'全国代理ip': {
            'url': 'http://www.66ip.cn/{idx}.html',
            'file': '66ip_{idx}',
            'max_page': 1308,
        },
    }
    query = '''
    items: query(selector: "tr", filter:"lambda el: el.children('td') and el.children('td') and len(el.children('td'))>=2 and '.' in el.children('td')[0].text and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, ext)

def do_mimiip(path='mimiip', ext='.gql'):
    url_map = {
        u'国内高匿代理': {
            'url': 'http://www.mimiip.com/gngao/{idx}',
            'file': 'mimiip_gngao_{idx}',
            'max_page': 683,
        },
        u'国内普匿代理': {
            'url': 'http://www.mimiip.com/gnpu/{idx}',
            'file': 'mimiip_gnpu_{idx}',
            'max_page': 102,
        },
        u'国内透明代理': {
            'url': 'http://www.mimiip.com/gntou/{idx}',
            'file': 'mimiip_gntou_{idx}',
            'max_page': 123,
        },
        u'国外IP代理': {
            'url': 'http://www.mimiip.com/hw/{idx}',
            'file': 'mimiip_hw_{idx}',
            'max_page': 702,
        },
    }
    query = '''
    items: query(selector: "tr", filter:"lambda el: el.children('td') and len(el.children('td'))>=2 and '.' in el.children('td')[0].text and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, ext)

def do_ip181(path='ip181', ext='.gql'):
    url_map = {
        u'每日免费代理ip': {
            'url': 'http://www.ip181.com/daili/{idx}.html?json_to_html=1',
            'file': 'ip181_daili_{idx}',
            'max_page': 20,
        },
    }
    query = '''
    items: query(selector: "tr", filter:"lambda el: el.children('td') and len(el.children('td'))>=2 and '.' in el.children('td')[0].text and el.children('td')[1].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, ext)

def do_xicidaili(path='xicidaili', ext='.gql'):
    url_map = {
        u'国内高匿代理': {
            'url': 'http://www.xicidaili.com/nn/{idx}',
            'file': 'xicidaili_nn_{idx}',
            'max_page': 3305,
        },
        u'国内普通代理': {
            'url': 'http://www.xicidaili.com/nt/{idx}',
            'file': 'xicidaili_nt_{idx}',
            'max_page': 687,
        },
        u'国内HTTPS代理': {
            'url': 'http://www.xicidaili.com/wn/{idx}',
            'file': 'xicidaili_wn_{idx}',
            'max_page': 1370,
        },
        u'国内HTTP代理': {
            'url': 'http://www.xicidaili.com/wt/{idx}',
            'file': 'xicidaili_wt_{idx}',
            'max_page': 1848,
        },
    }
    query = '''
    items: query(selector: "tr", filter:"lambda el: el.children('td') and len(el.children('td'))>=3 and '.' in el.children('td')[1].text and el.children('td')[2].text.isalnum()") {
      proxy: call(selector: "td", func:"lambda el: el[1].text()+':'+el[2].text() if len(el)>=3 else ''"),
    }
'''
    return _do_map(url_map, query, path, ext)

def main():
    print "======== START ========="
    last_map = pyfile.get_dict_of_dir(os.getcwd(), filter_func = lambda s: s.endswith('.gql'))
    [os.remove(f) for f, _ in last_map.items()]
    add_num = 0

    add_num += do_66ip()
    add_num += do_mimiip()
    add_num += do_ip181()
    add_num += do_xicidaili()

    print pyutils._t(), '[INFO] all:', add_num
    print "======== END ========="



if __name__ == '__main__':
    main()