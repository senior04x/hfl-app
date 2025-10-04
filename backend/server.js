const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();

// Initialize Firebase Admin SDK (optional for now)
// const { initializeFirebaseAdmin } = require('./services/firebaseAdmin');
// initializeFirebaseAdmin();

// Initialize MongoDB
const mongoService = require('./services/mongodbService');
mongoService.connect();

// Initialize WebSocket Service (disabled for now)
// const webSocketService = require('./services/websocketService');

const otpRoutes = require('./routes/otp');
const apiRoutes = require('./routes/api');
const transferRoutes = require('./routes/transfers');
const notificationRoutes = require('./routes/notifications');
const { errorHandler } = require('./middleware/errorHandler');
const { 
  requestSizeLimiter, 
  sqlInjectionProtection, 
  xssProtection, 
  requestTimeout,
  securityHeaders 
} = require('./middleware/security');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// CORS configuration for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://hfl-mobile.vercel.app',
      'https://hfl-admin.vercel.app',
      'exp://192.168.1.100:19000'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:19006',
      'http://localhost:19007',
      'exp://192.168.1.100:19000',
      'exp://localhost:19000',
      'exp://localhost:19007'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting - General API
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Juda ko\'p so\'rov yuborildi. Iltimos, keyinroq urinib ko\'ring.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - OTP endpoints (stricter)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 OTP requests per 15 minutes
  message: {
    success: false,
    error: 'OTP so\'rovlari juda ko\'p. 15 daqiqa kutib turing.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Login urinishlari juda ko\'p. 15 daqiqa kutib turing.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/request-otp', otpLimiter);
app.use('/api/verify-otp', otpLimiter);
app.use('/api/player-login', loginLimiter);

// Additional security middleware
app.use(requestSizeLimiter);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(requestTimeout(30000)); // 30 second timeout
app.use(securityHeaders);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HFL Mobile Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', otpRoutes);
app.use('/api', apiRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint topilmadi'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
// Initialize WebSocket server (disabled for now)
// webSocketService.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 HFL Mobile Backend server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  // console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
