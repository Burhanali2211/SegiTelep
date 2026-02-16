
import { WebSocketServer } from 'ws';
import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';

const PORT = 8765;
const WS_PORT = 8766;

// Shared state between browser tab and phone
let status = {
    is_playing: false,
    current_speed: 1.0,
    current_segment: 0,
    total_segments: 1,
    project_name: "Connecting to App...",
    timestamp: Date.now()
};

// --- HTTP Server ---
const httpServer = http.createServer((req, res) => {
    // Serve the Mobile Remote HTML
    if (req.url === '/' || req.url === '/remote') {
        const filePath = path.join(process.cwd(), 'src-tauri', 'src', 'assets', 'mobile_remote.html');
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading remote interface');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        });
        return;
    }

    if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(status));
    } else if (req.url === '/command' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const cmd = JSON.parse(body);
                console.log('🎮 [Phone -> App] Command:', cmd.type);

                // Broadcast this command to the Browser Tab
                broadcastToBrowser({ type: 'dev-command', command: cmd });

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400); res.end();
            }
        });
    } else {
        res.writeHead(404); res.end();
    }
});

// --- WebSocket Server ---
const wss = new WebSocketServer({ port: WS_PORT });

function broadcastToBrowser(data) {
    wss.clients.forEach(client => {
        // Clients with "isBrowser" attribute
        if (client.readyState === 1 && client.isBrowser) {
            client.send(JSON.stringify(data));
        }
    });
}

function broadcastToPhone(data) {
    wss.clients.forEach(client => {
        // Clients WITHOUT "isBrowser" (the phone)
        if (client.readyState === 1 && !client.isBrowser) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('🔌 New connection established');

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            // 1. Browser Tab identification and status sync
            if (msg.type === 'browser-register') {
                ws.isBrowser = true;
                console.log('🖥️  Browser Tab registered as Host');
                return;
            }

            if (msg.type === 'status-sync') {
                status = msg.status;
                // Forward updated status to the phone
                broadcastToPhone(status);
                return;
            }

            // 2. Commands from Phone (WebSocket)
            console.log('🎮 [Phone -> App] Command:', msg.type);
            broadcastToBrowser({ type: 'dev-command', command: msg });

        } catch (e) { }
    });

    // Send initial status
    ws.send(JSON.stringify(status));
});

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIp = getLocalIp();

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 DEV REMOTE SERVER READY (Simulation Mode)
--------------------------------------------
LATEST IP: ${localIp}
PHONE URL: http://${localIp}:${PORT}

Status:
- Serving HTML: Yes (src-tauri/src/assets/mobile_remote.html)
- WebSocket Synchronization: Enabled on port ${WS_PORT}

Keep this terminal running. 
Open your app in the browser to start the sync.
--------------------------------------------
    `);
});
