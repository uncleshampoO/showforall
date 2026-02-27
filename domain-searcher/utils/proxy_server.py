import socket
import threading
import select

def handle_client(client_socket):
    try:
        request = client_socket.recv(4096)
        if not request:
            return

        # Simple HTTP proxy logic
        # For HTTPS, it needs to handle CONNECT method
        lines = request.split(b'\r\n')
        if not lines:
            return
            
        first_line = lines[0].decode('utf-8')
        method, url, protocol = first_line.split(' ')

        if method == 'CONNECT':
            # HTTPS Proxy
            host, port = url.split(':')
            port = int(port)
            
            # Connect to target
            remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            remote_socket.connect((host, port))
            client_socket.send(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            
            # Forward data bidirectionally
            sockets = [client_socket, remote_socket]
            while True:
                readable, _, _ = select.select(sockets, [], [])
                for s in readable:
                    data = s.recv(4096)
                    if not data:
                        return
                    if s is client_socket:
                        remote_socket.send(data)
                    else:
                        client_socket.send(data)
        else:
            # Simple HTTP Proxy (Forwarding)
            # Find Host header
            host = None
            for line in lines:
                if line.startswith(b'Host: '):
                    host = line[6:].decode('utf-8')
                    break
            
            if not host:
                return
                
            remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            remote_socket.connect((host, 80))
            remote_socket.send(request)
            
            while True:
                data = remote_socket.recv(4096)
                if not data:
                    break
                client_socket.send(data)
            remote_socket.close()
            
    except Exception as e:
        print(f"Proxy error: {e}")
    finally:
        client_socket.close()

def start_proxy(port=8888):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind(('0.0.0.0', port))
    server.listen(100)
    print(f"[*] Custom Proxy Server started on port {port}")
    
    while True:
        client_sock, addr = server.accept()
        # print(f"[*] Accepted connection from {addr}")
        proxy_thread = threading.Thread(target=handle_client, args=(client_sock,))
        proxy_thread.start()

if __name__ == "__main__":
    start_proxy()
