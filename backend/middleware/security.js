/**
 * Security middleware for HFL Mobile Backend
 */

const rateLimit = require('express-rate-limit');

/**
 * IP whitelist for admin endpoints
 */
const adminIPWhitelist = [
  '127.0.0.1',
  '::1',
  'localhost'
];

/**
 * Check if IP is whitelisted for admin access
 */
const checkAdminIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (adminIPWhitelist.includes(clientIP)) {
    return next();
  }
  
  // For production, you might want to add your server IPs here
  if (process.env.NODE_ENV === 'production') {
    const allowedIPs = process.env.ALLOWED_ADMIN_IPS?.split(',') || [];
    if (allowedIPs.includes(clientIP)) {
      return next();
    }
  }
  
  return res.status(403).json({
    success: false,
    error: 'Admin access denied from this IP'
  });
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request too large'
    });
  }
  
  next();
};

/**
 * SQL injection protection
 */
const sqlInjectionProtection = (req, res, next) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(UNION\s+SELECT)/i,
    /(DROP\s+TABLE)/i,
    /(DELETE\s+FROM)/i,
    /(INSERT\s+INTO)/i,
    /(UPDATE\s+SET)/i
  ];
  
  const checkObject = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return res.status(400).json({
              success: false,
              error: `Potentially malicious input detected in ${currentPath}`
            });
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };
  
  if (req.body && typeof req.body === 'object') {
    const result = checkObject(req.body);
    if (result) return result;
  }
  
  if (req.query && typeof req.query === 'object') {
    const result = checkObject(req.query);
    if (result) return result;
  }
  
  next();
};

/**
 * XSS protection
 */
const xssProtection = (req, res, next) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  const checkString = (str, fieldName) => {
    for (const pattern of xssPatterns) {
      if (pattern.test(str)) {
        return res.status(400).json({
          success: false,
          error: `Potentially malicious input detected in ${fieldName}`
        });
      }
    }
  };
  
  const checkObject = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        const result = checkString(value, currentPath);
        if (result) return result;
      } else if (typeof value === 'object' && value !== null) {
        const result = checkObject(value, currentPath);
        if (result) return result;
      }
    }
    return null;
  };
  
  if (req.body && typeof req.body === 'object') {
    const result = checkObject(req.body);
    if (result) return result;
  }
  
  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout'
        });
      }
    });
    next();
  };
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

module.exports = {
  checkAdminIP,
  requestSizeLimiter,
  sqlInjectionProtection,
  xssProtection,
  requestTimeout,
  securityHeaders
};
