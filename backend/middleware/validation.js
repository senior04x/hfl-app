/**
 * Validate phone number format
 */
const validatePhoneNumber = (req, res, next) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Telefon raqami kiritilmagan'
    });
  }
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if phone number is valid (Uzbekistan format)
  const phoneRegex = /^998[0-9]{9}$/;
  
  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: 'Telefon raqami noto\'g\'ri formatda. +998 90 123 45 67 ko\'rinishida kiriting'
    });
  }
  
  // Add cleaned phone to request body
  req.body.phone = `+${cleanPhone}`;
  
  next();
};

/**
 * Validate OTP code format
 */
const validateOtpCode = (req, res, next) => {
  const { phone, code } = req.body;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Telefon raqami kiritilmagan'
    });
  }
  
  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Tasdiqlash kodi kiritilmagan'
    });
  }
  
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  req.body.phone = `+${cleanPhone}`;
  
  // Validate OTP code format (4 digits)
  const otpRegex = /^[0-9]{4}$/;
  
  if (!otpRegex.test(code)) {
    return res.status(400).json({
      success: false,
      error: 'Tasdiqlash kodi 4 xonali raqam bo\'lishi kerak'
    });
  }
  
  next();
};

/**
 * Validate request body
 */
const validateRequestBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Quyidagi maydonlar kiritilmagan: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  validatePhoneNumber,
  validateOtpCode,
  validateRequestBody
};
