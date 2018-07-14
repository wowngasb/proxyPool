import os
from pykl import gdom

import json

def main():
    test = '''{
  page(url: "https://github.com/wowngasb/pykl/") {
    items: query(selector: "table tr.js-navigation-item", filter:"lambda el: len(el.children('td'))==4 ") {
      file: call(selector: "td", func:"lambda el: el[1].text().replace(' ', '')"),
      ext: call(selector: "td", func:"lambda el: el[1].text().split('.')[-1] if el[1].text().find('.')>-1 else '' "),
      commit_text: call(selector: "td", func:"lambda el: el[2].text()"),
      commit_id: call(selector: "td", func:"lambda el: el[2].find('a').attr('href').split('/')[-1] "),
      update_at: call(selector: "td", func:"lambda el: el[3].find('time-ago').attr('datetime') "),
    }
  }
}'''
    tmp = gdom.schema.execute(test)
    print 'data', json.dumps(tmp.data, indent=2)
    print 'errors', tmp.errors

if __name__ == '__main__':
    main()