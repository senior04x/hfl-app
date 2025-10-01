const { sendSmsViaEskiz, generateOtpCode, storeOtpData, verifyOtpData, cleanupOtpData } = require('../services/otpService');
const { getPlayerByPhone, createPlayerSession } = require('../services/playerService');

/**
 * Request OTP code for phone number
 */
const requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    
    console.log(`📱 OTP request for phone: ${phone}`);
    
    // Generate 4-digit OTP code
    const otpCode = generateOtpCode();
    console.log(`🔐 Generated OTP: ${otpCode}`);
    
    // Store OTP data in cache and MongoDB
    const otpData = {
      phone: phone,
      code: otpCode,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES) || 5) * 60 * 1000)
    };
    
    await storeOtpData(phone, otpData);
    
    // Send SMS via Eskiz.uz
    const smsResult = await sendSmsViaEskiz(phone, otpCode);
    
    if (smsResult.success) {
      console.log(`✅ SMS sent successfully to ${phone}`);
      
      res.json({
        success: true,
        message: 'Tasdiqlash kodi yuborildi',
        phone: phone,
        expiresIn: parseInt(process.env.OTP_EXPIRE_MINUTES) || 5
      });
    } else {
      console.error(`❌ SMS sending failed: ${smsResult.error}`);
      
      res.status(500).json({
        success: false,
        error: 'SMS yuborishda xatolik yuz berdi',
        details: smsResult.error
      });
    }
    
  } catch (error) {
    console.error('❌ OTP request error:', error);
    
    res.status(500).json({
      success: false,
      error: 'OTP yuborishda xatolik yuz berdi',
      details: error.message
    });
  }
};

/**
 * Verify OTP code
 */
const verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    console.log(`🔍 Verifying OTP for phone: ${phone}, code: ${code}`);
    
    // Verify OTP code
    const verificationResult = await verifyOtpData(phone, code);
    
    if (!verificationResult.success) {
      console.log(`❌ OTP verification failed: ${verificationResult.reason}`);
      
      return res.status(400).json({
        success: false,
        reason: verificationResult.reason
      });
    }
    
    console.log(`✅ OTP verified successfully for ${phone}`);
    
    // Get or create player data
    let playerData = await getPlayerByPhone(phone);
    
    if (!playerData) {
      // Create new player if not exists
      playerData = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phone: phone,
        firstName: 'O\'yinchi',
        lastName: '',
        position: 'Unknown',
        number: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`👤 New player created: ${playerData.id}`);
    } else {
      console.log(`👤 Existing player found: ${playerData.id}`);
    }
    
    // Create player session
    const sessionData = await createPlayerSession(playerData);
    
    // Cleanup OTP data after successful verification
    await cleanupOtpData(phone);
    
    res.json({
      success: true,
      message: 'Muvaffaqiyatli tasdiqlandi',
      player: playerData,
      session: sessionData
    });
    
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Kod tekshirishda xatolik yuz berdi',
      details: error.message
    });
  }
};

module.exports = {
  requestOtp,
  verifyOtp
};
