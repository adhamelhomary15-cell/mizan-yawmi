# The static server for the end-to-end tests (dev-only): python's http.server with a longer connection queue. Tests
# run in parallel and each new service worker fetches its files at once; the default queue of 5 refuses some of them
# on Windows, and a worker whose install fails never becomes ready.
#   python serve.py <port> <directory>
import functools
import http.server
import sys


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=sys.argv[2])
Server(('127.0.0.1', int(sys.argv[1])), handler).serve_forever()
