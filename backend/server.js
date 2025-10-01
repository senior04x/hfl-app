const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize Firebase Admin SDK
const { initializeFirebaseAdmin } = require('./services/firebaseAdmin');
initializeFirebaseAdmin();

// Initialize MongoDB
const mongoService = require('./services/mongodbService');
mongoService.connect();

const otpRoutes = require('./routes/otp');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Juda ko\'p so\'rov yuborildi. Iltimos, keyinroq urinib ko\'ring.'
  }
});

app.use('/api/', limiter);

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
app.listen(PORT, () => {
  console.log(`🚀 HFL Mobile Backend server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
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
