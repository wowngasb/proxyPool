#-*- coding: utf-8 -*-
import os
import datetime

def dump_str(strin, filename):
    with open(filename, 'w') as wf:
        wf.write(strin)


def load_str(filename):
    with open(filename, 'r') as rf:
        rf.read()

def do_kuaidaili(max_page=20):
    _pwd = lambda f: os.path.join(os.getcwd(), f)
    add_num, url_map = 0, {
        u'国内高匿代理': {
            'url': 'http://www.kuaidaili.com/free/inha/{idx}/',
            'file': 'kuaidaili_inha_{idx}.gql',
        },
        u'国内普通代理': {
            'url': 'http://www.kuaidaili.com/free/intr/{idx}/',
            'file': 'kuaidaili_intr_{idx}.gql',
        },
    }
    _gql_tpl = lambda url :'''{
  page(url: "''' + url + '''") {
    items: query(selector: "table.table-bordered.table-striped tbody tr") {
      proxy: call(selector: "td", func:"lambda el: el[0].text() + ':' + el[1].text()"),
    }
  }
}'''
    for idx in range(1, max_page + 1):
        for k, v in url_map.items():
            url = v['url'].format(idx=idx)
            filename = _pwd( v['file'].format(idx=idx) )
            gql = _gql_tpl(url)
            print _t(), '[INFO] name:', k, 'idx:', idx, 'file:', filename, 'url', url
            dump_str(gql, filename)
            add_num += 1

    return add_num

def main():
    print "======== START ========="
    add_num = 0

    add_num += do_kuaidaili(20)

    print _t(), '[INFO] all:', add_num
    print "======== END ========="

def _t():
    tmp = str(datetime.datetime.now())
    return tmp if len(tmp) >= 26 else tmp + '0' * (26 - len(tmp))

if __name__ == '__main__':
    main()