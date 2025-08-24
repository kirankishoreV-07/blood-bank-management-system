const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent'],
  credentials: false
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`📋 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Client IP:', req.ip, req.connection.remoteAddress);
  next();
});

// Simple test endpoints
app.get('/api/test', (req, res) => {
  console.log('✅ GET /api/test called');
  res.json({ 
    success: true, 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
});

app.post('/api/test', (req, res) => {
  console.log('✅ POST /api/test called');
  console.log('📋 Body:', req.body);
  res.json({ 
    success: true, 
    message: 'POST request successful!',
    timestamp: new Date().toISOString(),
    method: 'POST',
    receivedData: req.body
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({ status: 'OK', message: 'Test server is running' });
});

// Network info endpoint
app.get('/api/network-info', (req, res) => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  console.log('✅ Network info requested');
  res.json({
    networkInterfaces,
    serverIP: req.ip,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Test Server running on port ${PORT}`);
  console.log(`🌐 Server accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://10.12.87.10:${PORT}`);
  console.log(`\n🔗 Test endpoints:`);
  console.log(`   - GET  http://10.12.87.10:${PORT}/api/health`);
  console.log(`   - GET  http://10.12.87.10:${PORT}/api/test`);
  console.log(`   - POST http://10.12.87.10:${PORT}/api/test`);
  console.log(`   - GET  http://10.12.87.10:${PORT}/api/network-info`);
  console.log(`\n📱 From React Native, try: http://10.12.87.10:${PORT}/api/test`);
});
