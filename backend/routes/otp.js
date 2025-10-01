const express = require('express');
const router = express.Router();

const { requestOtp, verifyOtp } = require('../controllers/otpController');
const { validatePhoneNumber, validateOtpCode } = require('../middleware/validation');

/**
 * @route POST /api/request-otp
 * @desc Send OTP code to phone number
 * @access Public
 */
router.post('/request-otp', validatePhoneNumber, requestOtp);

/**
 * @route POST /api/verify-otp
 * @desc Verify OTP code
 * @access Public
 */
router.post('/verify-otp', validateOtpCode, verifyOtp);

module.exports = router;
