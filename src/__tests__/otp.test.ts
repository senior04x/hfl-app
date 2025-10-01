import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Firebase Functions
const mockRequest = (body: any) => ({
  method: 'POST',
  body,
  headers: {}
});

const mockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  return res;
};

// Mock crypto module
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'hashed_value')
  })),
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'random_salt')
  }))
}));

// Mock fetch
global.fetch = jest.fn();

describe('OTP Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables
    process.env.ESKIZ_EMAIL = 'test@example.com';
    process.env.ESKIZ_PASSWORD = 'test_password';
    process.env.ESKIZ_FROM = '4546';
    process.env.OTP_TTL_SECONDS = '300';
    process.env.OTP_RATE_LIMIT_PER_MINUTE = '1';
    process.env.OTP_RATE_LIMIT_PER_DAY = '10';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('requestOTP', () => {
    it('should validate phone number format', async () => {
      const req = mockRequest({ phone: 'invalid_phone' });
      const res = mockResponse();

      // Mock successful SMS response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ token: 'test_token' })
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'waiting', id: '123' })
      });

      // Import and test the function
      const { requestOTP } = await import('../../functions/src/otp');
      
      await requestOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid phone number format'
      });
    });

    it('should accept valid phone number', async () => {
      const req = mockRequest({ phone: '+998901234567' });
      const res = mockResponse();

      // Mock successful SMS response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ token: 'test_token' })
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'waiting', id: '123' })
      });

      // Mock Firestore
      const mockFirestore = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: () => false })),
            set: jest.fn(() => Promise.resolve())
          }))
        }))
      };

      jest.doMock('firebase-admin', () => ({
        firestore: () => mockFirestore,
        FieldValue: {
          serverTimestamp: () => 'server_timestamp'
        },
        Timestamp: {
          fromDate: () => 'timestamp'
        }
      }));

      const { requestOTP } = await import('../../functions/src/otp');
      
      await requestOTP(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ttl: 300,
        message: 'OTP sent successfully'
      });
    });
  });

  describe('verifyOTP', () => {
    it('should validate required fields', async () => {
      const req = mockRequest({ phone: '+998901234567' }); // Missing code
      const res = mockResponse();

      const { verifyOTP } = await import('../../functions/src/otp');
      
      await verifyOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Phone number and code are required'
      });
    });

    it('should validate code format', async () => {
      const req = mockRequest({ phone: '+998901234567', code: '123' }); // Invalid code length
      const res = mockResponse();

      const { verifyOTP } = await import('../../functions/src/otp');
      
      await verifyOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid code format'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const req = mockRequest({ phone: '+998901234567' });
      const res = mockResponse();

      // Mock successful SMS response
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ status: 'waiting', id: '123' })
      });

      const { requestOTP } = await import('../../functions/src/otp');
      
      // First request should succeed
      await requestOTP(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        ttl: 300,
        message: 'OTP sent successfully'
      });

      // Reset response mock
      res.json.mockClear();
      res.status.mockClear();

      // Second request within rate limit should fail
      await requestOTP(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Hash Functions', () => {
    it('should generate consistent hashes', () => {
      const { hashOTP } = require('../../functions/src/otp');
      
      const code = '123456';
      const salt = 'test_salt';
      const hash1 = hashOTP(code, salt);
      const hash2 = hashOTP(code, salt);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('hashed_value');
    });
  });
});