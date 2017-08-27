#-*- coding: utf-8 -*-
import os
import datetime

from pykl import pyfile, pyutils

def _do_map(url_map, query, path, max_page, ext):
    save_dir = os.path.join(os.getcwd(), path)
    if not os.path.isdir(save_dir):
        os.makedirs(save_dir)

    _pwd = lambda f: os.path.join(save_dir, f)
    _gql_tpl = lambda url :'''{
  page(url: "''' + url + '''") {''' + query + '''  }
}'''

    add_num = 0
    for k, v in url_map.items():
        for idx in range(1, max_page + 1):
            url = v['url'].format(idx=idx)
            filename = _pwd( v['file'].format(idx=idx) )
            gql = _gql_tpl(url)
            print pyutils._t(), '[INFO] name:', k, 'idx:', idx, 'file:', filename, 'url', url
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
    items: query(selector: "table.table-bordered.table-striped tbody tr") {
      proxy: call(selector: "td", func:"lambda el: el[0].text() + ':' + el[1].text()"),
    }
'''
    return _do_map(url_map, query, path, max_page, ext)

def do_66ip(max_page=20, path='66ip', ext='.gql'):
    url_map = {
        u'全国代理ip': {
            'url': 'http://www.66ip.cn/{idx}.html',
            'file': '66ip_{idx}',
        },
    }
    query = '''
    items: query(selector: "tr") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, max_page, ext)

def do_mimiip(max_page=20, path='mimiip', ext='.gql'):
    url_map = {
        u'国内高匿代理': {
            'url': 'http://www.mimiip.com/gngao/{idx}',
            'file': 'mimiip_gngao_{idx}',
        },
        u'国内普匿代理': {
            'url': 'http://www.mimiip.com/gnpu/{idx}',
            'file': 'mimiip_gnpu_{idx}',
        },
        u'国内透明代理': {
            'url': 'http://www.mimiip.com/gntou/{idx}',
            'file': 'mimiip_gntou_{idx}',
        },
        u'国外IP代理': {
            'url': 'http://www.mimiip.com/hw/{idx}',
            'file': 'mimiip_hw_{idx}',
        },
    }
    query = '''
    items: query(selector: "tr") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, max_page, ext)

def do_ip181(max_page=20, path='ip181', ext='.gql'):
    url_map = {
        u'每日免费代理ip': {
            'url': 'http://www.ip181.com/daili/{idx}.html',
            'file': 'ip181_daili_{idx}',
        },
    }
    query = '''
    items: query(selector: "tr") {
      proxy: call(selector: "td", func:"lambda el: el[0].text()+':'+el[1].text() if len(el)>=2 else ''"),
    }
'''
    return _do_map(url_map, query, path, max_page, ext)

def do_xicidaili(max_page=20, path='xicidaili', ext='.gql'):
    url_map = {
        u'国内高匿代理': {
            'url': 'http://www.xicidaili.com/nn/{idx}',
            'file': 'xicidaili_nn_{idx}',
        },
        u'国内普通代理': {
            'url': 'http://www.xicidaili.com/nt/{idx}',
            'file': 'xicidaili_nt_{idx}',
        },
        u'国内HTTPS代理': {
            'url': 'http://www.xicidaili.com/wn/{idx}',
            'file': 'xicidaili_wn_{idx}',
        },
        u'国内HTTP代理': {
            'url': 'http://www.xicidaili.com/wt/{idx}',
            'file': 'xicidaili_wt_{idx}',
        },
    }
    query = '''
    items: query(selector: "tr") {
      proxy: call(selector: "td", func:"lambda el: el[1].text()+':'+el[2].text() if len(el)>=3 else ''"),
    }
'''
    return _do_map(url_map, query, path, max_page, ext)

def main():
    print "======== START ========="
    last_map = pyfile.get_dict_of_dir(os.getcwd(), filter_func = lambda s: s.endswith('.gql'))
    [os.remove(f) for f, _ in last_map.items()]
    add_num = 0

    add_num += do_kuaidaili(10)
    add_num += do_66ip(40)
    add_num += do_mimiip(40)
    add_num += do_ip181(40)
    add_num += do_xicidaili(40)

    print pyutils._t(), '[INFO] all:', add_num
    print "======== END ========="



if __name__ == '__main__':
    main()