/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Default error response
  let statusCode = 500;
  let message = 'Ichki server xatoligi';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Ma\'lumotlar noto\'g\'ri formatda';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Ruxsat yo\'q';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Kirish taqiqlangan';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Ma\'lumot topilmadi';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Tashqi xizmat bilan bog\'lanishda xatolik';
  } else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'So\'rov vaqti tugadi';
  }
  
  // Send error response
  const errorResponse = {
    success: false,
    error: message
  };
  
  // Only include details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = {
  errorHandler
};
