#-*- coding: utf-8 -*-

import unittest

from utils import ApiErrorBuild


class TestQueueJob(unittest.TestCase):

    def test_task_name(self):
        args = {}


    def test_task_args(self):
        args = {}

class TestApiErrorBuild(unittest.TestCase):

    def test_string_build(self):
        err = ApiErrorBuild()
        assert err and err['error']['code']==500

        err = ApiErrorBuild('error')
        assert err and err['error']['message']=='error'

        err = ApiErrorBuild('error 404', 404)
        assert err and err['error']['code']==404

        err = ApiErrorBuild('error 404', 405)
        assert err and err['error']['code']==405
        assert err['error'].get('errors', None) is None

        err = ApiErrorBuild('error 404', 405, [])
        assert err and err['error']['code']==405
        assert err['error'].get('errors', None) is None

        err = ApiErrorBuild('error list', 404, ['err1', 'err2', 'err3'])
        assert err and err['error']['code']==404
        assert len(err['error']['errors'])==3

    def test_exception_build(self):
        err = ApiErrorBuild(Exception())
        assert err and err['error']['code']==551

        err = ApiErrorBuild(Exception('base exception'))
        assert err and err['error']['code']==551
        assert err['error']['message']=='Exception:base exception'

        err = ApiErrorBuild(ValueError('other exception'), 561)
        assert err and err['error']['code']==561
        assert err['error']['message']=='ValueError:other exception'

        ex = TypeError('test type error')
        ex.code = 591
        err = ApiErrorBuild(ex)
        assert err and err['error']['code']==591

        err = ApiErrorBuild(Exception('base exception'), 571, ['a', 'b', 'c'])
        assert err and err['error']['code']==571
        assert len(err['error']['errors'])==3

        ex = TypeError('test type error')
        err = ApiErrorBuild(Exception('base exception'), 571, [(ex,571), ex, ex])
        assert err and err['error']['code']==571
        assert len(err['error']['errors'])==3

    def test_iterator_build(self):
        err = ApiErrorBuild(['list msg', 572])
        assert err and err['error']['code']==572

        err = ApiErrorBuild(['list msg', 572, [], ])
        assert err and err['error']['code']==572
        assert err['error'].get('errors', None) is None

        err = ApiErrorBuild(['list msg', 572, ['a', 'b', 'c'], ])
        assert err and err['error']['code']==572
        assert len(err['error']['errors'])==3

def main():
    unittest.main()

if __name__ == "__main__":
    main()
