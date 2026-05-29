/**
 * Custom WebRTC Signaling Server (PeerJS)
 * 
 * PREREQUISITES:
 * 1. Install Node.js on your server
 * 2. Create a new directory and initialize a project: `npm init -y`
 * 3. Install the PeerJS server package: `npm install peer`
 * 4. (Optional) Install a process manager: `npm install -g pm2`
 * 
 * RUNNING THE SERVER:
 * - For testing: `node signaling-server.js`
 * - For production: `pm2 start signaling-server.js`
 * 
 * DEPLOYMENT & SSL:
 * It is highly recommended to run this behind an Nginx reverse proxy with an 
 * SSL certificate (e.g., using Certbot/Let's Encrypt) to support `wss://` 
 * (secure WebSockets). WebRTC requires HTTPS for the dashboard to capture 
 * camera/mic streams, which means the signaling server must also be secure.
 */

const { PeerServer } = require('peer');

// Use environment variable PORT or fallback to 9000
const PORT = process.env.PORT || 9000;

// Initialize the signaling server
const peerServer = PeerServer({
  port: PORT,
  path: '/peerjs', // Ensure this matches the dashboard's expected path
  proxied: true,   // Essential if you're running behind NGINX
  corsOptions: {
    origin: '*'    // In production, you should restrict this to your front-end domain
  }
});

peerServer.on('connection', (client) => {
  console.log(`[${new Date().toISOString()}] Client Connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`[${new Date().toISOString()}] Client Disconnected: ${client.getId()}`);
});

console.log(`====================================================`);
console.log(`✅ WebRTC Signaling Server is running!`);
console.log(`====================================================`);
console.log(`Port: ${PORT}`);
console.log(`Path: /peerjs`);
console.log(`To use this server, enter your server's domain/IP`);
console.log(`in the 'Signaling Server Host' field in the dashboard.`);
