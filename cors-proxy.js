// Simple CORS proxy server
const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3003;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse the target URL
  const targetUrl = 'https://hfl-backend-360d7733bad1.herokuapp.com' + req.url;
  console.log('Proxying request to:', targetUrl);
  
  // Make request to target server
  const targetReq = https.request(targetUrl, (targetRes) => {
    // Copy headers
    res.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(res);
  });
  
  targetReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error: ' + err.message);
  });
  
  req.pipe(targetReq);
});

server.listen(PORT, () => {
  console.log(`🚀 CORS Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying requests to backend API`);
});
