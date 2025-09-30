# OTP Login Manual Test Checklist

## Pre-Test Setup
- [ ] Ensure Firebase Functions are deployed with OTP endpoints
- [ ] Configure environment variables (ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM)
- [ ] Verify Eskiz API credentials are valid
- [ ] Test phone number format: +998901234567

## 1. Basic OTP Flow Testing

### 1.1 Request OTP
- [ ] **Test Case**: Valid phone number
  - Enter phone number: +998 90 123 45 67
  - Click "Tasdiqlash kodi yuborish"
  - **Expected**: Success message, SMS received, UI switches to OTP input
  - **Actual**: ___________

- [ ] **Test Case**: Invalid phone format
  - Enter phone: 998901234567 (missing +)
  - Click "Tasdiqlash kodi yuborish"
  - **Expected**: Error message about phone format
  - **Actual**: ___________

- [ ] **Test Case**: Empty phone number
  - Leave phone field empty
  - Click "Tasdiqlash kodi yuborish"
  - **Expected**: Error message "Telefon raqamini kiriting"
  - **Actual**: ___________

### 1.2 Verify OTP
- [ ] **Test Case**: Correct OTP code
  - Enter the 6-digit code received via SMS
  - Click "Tasdiqlash"
  - **Expected**: Login successful, navigate to PlayerDashboard
  - **Actual**: ___________

- [ ] **Test Case**: Wrong OTP code
  - Enter incorrect 6-digit code (e.g., 000000)
  - Click "Tasdiqlash"
  - **Expected**: Error message "Noto'g'ri kod"
  - **Actual**: ___________

- [ ] **Test Case**: Invalid code format
  - Enter code with letters (e.g., 12345a)
  - Click "Tasdiqlash"
  - **Expected**: Error message about code format
  - **Actual**: ___________

## 2. Rate Limiting Tests

### 2.1 Request Rate Limiting
- [ ] **Test Case**: Multiple requests within 1 minute
  - Request OTP for same phone number
  - Immediately request OTP again
  - **Expected**: Second request blocked with rate limit message
  - **Actual**: ___________

- [ ] **Test Case**: Request after rate limit period
  - Wait 60+ seconds after first request
  - Request OTP again
  - **Expected**: OTP sent successfully
  - **Actual**: ___________

### 2.2 Resend Functionality
- [ ] **Test Case**: Resend button countdown
  - Request OTP
  - Check resend button shows countdown (60s)
  - **Expected**: Button disabled during countdown
  - **Actual**: ___________

- [ ] **Test Case**: Resend after countdown
  - Wait for countdown to finish
  - Click "Qayta yuborish"
  - **Expected**: New OTP sent, new countdown starts
  - **Actual**: ___________

## 3. Security Tests

### 3.1 Attempt Limiting
- [ ] **Test Case**: Multiple wrong attempts
  - Enter wrong OTP 3 times
  - **Expected**: Phone number blocked for 15 minutes
  - **Actual**: ___________

- [ ] **Test Case**: Blocked phone number
  - Try to request OTP for blocked number
  - **Expected**: Error message about phone being blocked
  - **Actual**: ___________

### 3.2 OTP Expiry
- [ ] **Test Case**: Expired OTP
  - Request OTP
  - Wait 5+ minutes (TTL_SECONDS = 300)
  - Try to verify with correct code
  - **Expected**: Error message "OTP expired"
  - **Actual**: ___________

## 4. UI/UX Tests

### 4.1 Navigation
- [ ] **Test Case**: Back to phone number
  - In OTP step, click "Telefon raqamni o'zgartirish"
  - **Expected**: Return to phone input step
  - **Actual**: ___________

- [ ] **Test Case**: Back button
  - Click "Orqaga qaytish" from any step
  - **Expected**: Return to previous screen
  - **Actual**: ___________

### 4.2 Loading States
- [ ] **Test Case**: Request OTP loading
  - Click "Tasdiqlash kodi yuborish"
  - **Expected**: Button shows "Kod yuborilmoqda..." and is disabled
  - **Actual**: ___________

- [ ] **Test Case**: Verify OTP loading
  - Click "Tasdiqlash"
  - **Expected**: Button shows "Tekshirilmoqda..." and is disabled
  - **Actual**: ___________

## 5. Integration Tests

### 5.1 Player Creation
- [ ] **Test Case**: New player registration
  - Use phone number not in database
  - Complete OTP verification
  - **Expected**: New player created in Firestore
  - **Actual**: ___________

- [ ] **Test Case**: Existing player login
  - Use phone number already in database
  - Complete OTP verification
  - **Expected**: Existing player data retrieved, lastLogin updated
  - **Actual**: ___________

### 5.2 SMS Delivery
- [ ] **Test Case**: SMS received
  - Request OTP
  - **Expected**: SMS received within 30 seconds
  - **Actual**: ___________

- [ ] **Test Case**: SMS content
  - Check SMS message content
  - **Expected**: "Sizning tasdiqlash kodingiz: XXXXXX. Kod 5 daqiqa amal qiladi."
  - **Actual**: ___________

## 6. Error Handling Tests

### 6.1 Network Errors
- [ ] **Test Case**: No internet connection
  - Disconnect internet
  - Try to request OTP
  - **Expected**: Appropriate error message
  - **Actual**: ___________

- [ ] **Test Case**: Server timeout
  - Simulate slow network
  - **Expected**: Timeout handling
  - **Actual**: ___________

### 6.2 API Errors
- [ ] **Test Case**: Eskiz API failure
  - Simulate Eskiz API down
  - **Expected**: Error message about SMS service
  - **Actual**: ___________

## 7. Performance Tests

### 7.1 Response Times
- [ ] **Test Case**: OTP request response time
  - Measure time from request to success message
  - **Expected**: < 10 seconds
  - **Actual**: ___________

- [ ] **Test Case**: OTP verification response time
  - Measure time from verification to success
  - **Expected**: < 3 seconds
  - **Actual**: ___________

## 8. Cleanup Tests

### 8.1 Data Cleanup
- [ ] **Test Case**: Expired OTP cleanup
  - Check Firestore otps collection
  - **Expected**: No expired OTPs remain after cleanup function runs
  - **Actual**: ___________

- [ ] **Test Case**: Successful verification cleanup
  - Verify OTP successfully
  - **Expected**: OTP document deleted from Firestore
  - **Actual**: ___________

## Test Results Summary

**Total Test Cases**: 25
**Passed**: ___ / 25
**Failed**: ___ / 25
**Blocked**: ___ / 25

### Critical Issues Found:
1. ___________
2. ___________
3. ___________

### Minor Issues Found:
1. ___________
2. ___________
3. ___________

### Recommendations:
1. ___________
2. ___________
3. ___________

**Tested By**: ___________
**Date**: ___________
**Environment**: ___________
