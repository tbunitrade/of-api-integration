# uploads_server.py
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        return super().end_headers()

if __name__ == "__main__":
    os.chdir("/Users/oleksandrsonich/sites/joefans/backend/of-software/uploads")
    server = HTTPServer(("127.0.0.1", 3001), CORSRequestHandler)
    print("Serving uploads on http://127.0.0.1:3001")
    server.serve_forever()