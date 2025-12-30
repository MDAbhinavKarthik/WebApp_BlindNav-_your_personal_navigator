"""
BlindNav+ Web Application Server
Simple HTTP server for serving the web application
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import socket
import ssl
import argparse

# Default configuration
PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP handler with CORS support for local development"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(204)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[{self.address_string()}] {format % args}")


def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"


def print_banner(port, local_ip):
    """Print startup banner"""
    print("\n" + "="*60)
    print("  BlindNav+ Web Application Server")
    print("="*60)
    print(f"\n  Local URL:    http://localhost:{port}")
    print(f"  Network URL:  http://{local_ip}:{port}")
    print("\n  Access the app from any device on your network")
    print("  using the Network URL above.")
    print("\n  Press Ctrl+C to stop the server")
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(description='BlindNav+ Web Server')
    parser.add_argument('-p', '--port', type=int, default=PORT,
                       help=f'Port to run the server on (default: {PORT})')
    parser.add_argument('-o', '--open', action='store_true',
                       help='Open browser automatically')
    parser.add_argument('--https', action='store_true',
                       help='Enable HTTPS (requires certificates)')
    
    args = parser.parse_args()
    
    local_ip = get_local_ip()
    port = args.port
    
    # Change to webapp directory
    os.chdir(DIRECTORY)
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            print_banner(port, local_ip)
            
            if args.open:
                webbrowser.open(f"http://localhost:{port}")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\nShutting down server...")
                httpd.shutdown()
                
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\nError: Port {port} is already in use.")
            print(f"Try a different port: python server.py -p {port + 1}")
        else:
            print(f"\nError starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
