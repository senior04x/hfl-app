# OTP Login Test Checklist

## Pre-Test Setup

- [ ] Firebase emulators running (`firebase emulators:start`)
- [ ] Environment variables configured (`.env` file)
- [ ] ngrok tunnel active (for mobile testing)
- [ ] Test phone number available (+998XXXXXXXXX)

## Backend Tests

### Health Check
- [ ] `GET /api/health` returns 200 with status: "healthy"
- [ ] CORS headers properly set
- [ ] Response includes timestamp and version

### OTP Request Tests
- [ ] `POST /api/request-otp` with valid phone number (+998XXXXXXXXX)
  - [ ] Returns 200 with success: true
  - [ ] SMS sent successfully
  - [ ] OTP stored in Firestore with hash
- [ ] `POST /api/request-otp` with invalid phone format
  - [ ] Returns 400 with error message
- [ ] Rate limiting test
  - [ ] First request succeeds
  - [ ] Second request within 1 minute returns 429
- [ ] Blocked phone test
  - [ ] After 3 failed attempts, phone blocked for 15 minutes

### OTP Verification Tests
- [ ] `POST /api/verify-otp` with correct code
  - [ ] Returns 200 with success: true
  - [ ] Player created/updated in Firestore
  - [ ] OTP document deleted
- [ ] `POST /api/verify-otp` with incorrect code
  - [ ] Returns 401 with error message
  - [ ] Attempts counter incremented
- [ ] `POST /api/verify-otp` with expired OTP
  - [ ] Returns 410 with "OTP expired" message
- [ ] `POST /api/verify-otp` with missing fields
  - [ ] Returns 400 with validation error

## Frontend Tests

### PlayerLoginScreen Tests
- [ ] Phone number input validation
  - [ ] Accepts +998XXXXXXXXX format
  - [ ] Rejects invalid formats
- [ ] OTP request flow
  - [ ] Loading state shows during request
  - [ ] Success message displays
  - [ ] Error handling for network issues
  - [ ] Error handling for rate limiting
- [ ] OTP verification flow
  - [ ] 6-digit code input validation
  - [ ] Loading state during verification
  - [ ] Success redirect to dashboard
  - [ ] Error handling for invalid codes
  - [ ] Error handling for expired OTPs
- [ ] Resend OTP functionality
  - [ ] 60-second countdown timer
  - [ ] Resend button disabled during countdown
  - [ ] Rate limiting respected

### Network Configuration Tests
- [ ] Local development (localhost:3001)
- [ ] Mobile testing (ngrok tunnel)
- [ ] Production (Firebase Functions URL)

## Security Tests

- [ ] OTP codes are hashed before storage
- [ ] Salt is unique for each OTP
- [ ] Rate limiting prevents abuse
- [ ] Blocked phones cannot request OTP
- [ ] Expired OTPs are cleaned up
- [ ] No sensitive data in client-side code

## Performance Tests

- [ ] OTP request completes within 5 seconds
- [ ] OTP verification completes within 2 seconds
- [ ] Health check responds within 1 second
- [ ] No memory leaks during repeated requests

## Error Scenarios

- [ ] Network connectivity issues
- [ ] Server unavailable
- [ ] Invalid API responses
- [ ] Timeout scenarios
- [ ] Rate limit exceeded
- [ ] Phone number blocked

## Test Data

### Valid Test Phone Numbers
- +998901234567
- +998901234568
- +998901234569

### Invalid Test Phone Numbers
- 998901234567 (missing +)
- +99890123456 (too short)
- +9989012345678 (too long)
- +99890123456a (contains letter)

## Expected Results

### Successful OTP Request
```json
{
  "success": true,
  "ttl": 300,
  "message": "OTP sent successfully"
}
```

### Successful OTP Verification
```json
{
  "success": true,
  "player": {
    "id": "player_id",
    "phone": "+998901234567",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  },
  "message": "OTP verified successfully"
}
```

### Error Responses
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 45 seconds"
}
```

## Notes

- Test with real SMS service in staging environment
- Monitor Firebase Functions logs for errors
- Check Firestore for proper data structure
- Verify CORS configuration for web clients
- Test with different network conditions