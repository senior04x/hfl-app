const axios = require('axios');
const NodeCache = require('node-cache');
const mongoService = require('./mongodbService');

// Cache for storing OTP data (5 minutes TTL)
const otpCache = new NodeCache({ stdTTL: 300 });

/**
 * Generate 4-digit OTP code
 */
const generateOtpCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Store OTP data in cache and MongoDB
 */
const storeOtpData = async (phone, otpData) => {
  // Store in cache
  otpCache.set(phone, otpData);
  
  // Store in MongoDB
  await mongoService.storeOtp(phone, otpData);
  
  console.log(`💾 OTP data stored for ${phone}`);
};

/**
 * Get OTP data from cache or MongoDB
 */
const getOtpData = async (phone) => {
  // Try cache first
  let otpData = otpCache.get(phone);
  
  if (!otpData) {
    // Try MongoDB
    otpData = await mongoService.getOtp(phone);
    if (otpData) {
      // Store in cache for faster access
      otpCache.set(phone, otpData);
    }
  }
  
  return otpData;
};

/**
 * Verify OTP code
 */
const verifyOtpData = async (phone, code) => {
  const otpData = await getOtpData(phone);
  
  if (!otpData) {
    return {
      success: false,
      reason: 'Tasdiqlash kodi topilmadi yoki muddati tugagan'
    };
  }
  
  // Check if OTP has expired
  if (new Date() > otpData.expiresAt) {
    otpCache.del(phone);
    return {
      success: false,
      reason: 'Tasdiqlash kodi muddati tugagan'
    };
  }
  
  // Check attempt limit
  const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS) || 3;
  if (otpData.attempts >= maxAttempts) {
    otpCache.del(phone);
    return {
      success: false,
      reason: 'Juda ko\'p noto\'g\'ri urinish. Yangi kod so\'rang'
    };
  }
  
  // Increment attempts
  otpData.attempts += 1;
  otpCache.set(phone, otpData);
  
  // Check if code matches
  if (otpData.code !== code) {
    return {
      success: false,
      reason: 'Noto\'g\'ri tasdiqlash kodi'
    };
  }
  
  return {
    success: true
  };
};

/**
 * Cleanup OTP data
 */
const cleanupOtpData = async (phone) => {
  // Remove from cache
  otpCache.del(phone);
  
  // Remove from MongoDB
  await mongoService.deleteOtp(phone);
  
  console.log(`🗑️ OTP data cleaned up for ${phone}`);
};

/**
 * Send SMS via Eskiz.uz API
 */
const sendSmsViaEskiz = async (phone, otpCode) => {
  try {
    const eskizEmail = process.env.ESKIZ_EMAIL;
    const eskizPassword = process.env.ESKIZ_PASSWORD;
    const senderName = process.env.ESKIZ_SENDER_NAME || 'HFL Mobile';
    
    if (!eskizEmail || !eskizPassword) {
      throw new Error('Eskiz.uz credentials not configured');
    }
    
    // Step 1: Get authentication token
    const authResponse = await axios.post('https://notify.eskiz.uz/api/auth/login', {
      email: eskizEmail,
      password: eskizPassword
    });
    
    if (!authResponse.data.token) {
      throw new Error('Eskiz.uz authentication failed');
    }
    
    const token = authResponse.data.token;
    console.log('🔑 Eskiz.uz token obtained');
    
    // Step 2: Send SMS
    const message = `HFL Mobile tasdiqlash kodi: ${otpCode}. Bu kodni hech kimga bermang!`;
    
    const smsResponse = await axios.post('https://notify.eskiz.uz/api/message/sms/send', {
      mobile_phone: phone,
      message: message,
      from: senderName
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (smsResponse.data.status === 'success') {
      console.log(`📤 SMS sent via Eskiz.uz to ${phone}`);
      return {
        success: true,
        messageId: smsResponse.data.id
      };
    } else {
      throw new Error(smsResponse.data.message || 'SMS sending failed');
    }
    
  } catch (error) {
    console.error('❌ Eskiz.uz SMS error:', error);
    
    // Fallback: Log OTP for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 DEVELOPMENT MODE - OTP for ${phone}: ${otpCode}`);
      return {
        success: true,
        messageId: 'dev_mode',
        isDevelopment: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get Eskiz.uz balance (optional)
 */
const getEskizBalance = async () => {
  try {
    const eskizEmail = process.env.ESKIZ_EMAIL;
    const eskizPassword = process.env.ESKIZ_PASSWORD;
    
    const authResponse = await axios.post('https://notify.eskiz.uz/api/auth/login', {
      email: eskizEmail,
      password: eskizPassword
    });
    
    const token = authResponse.data.token;
    
    const balanceResponse = await axios.get('https://notify.eskiz.uz/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return {
      success: true,
      balance: balanceResponse.data.balance,
      currency: 'UZS'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateOtpCode,
  storeOtpData,
  getOtpData,
  verifyOtpData,
  cleanupOtpData,
  sendSmsViaEskiz,
  getEskizBalance
};
