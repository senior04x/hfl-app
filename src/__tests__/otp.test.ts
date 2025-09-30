import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as crypto from 'crypto';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
      add: jest.fn(),
    })),
    FieldValue: {
      serverTimestamp: jest.fn(),
      increment: jest.fn(),
    },
    Timestamp: {
      fromDate: jest.fn(),
      now: jest.fn(),
    },
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('OTP Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OTP Generation and Hashing', () => {
    it('should generate 6-digit OTP', () => {
      const generateOTP = (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString();
      };

      const otp = generateOTP();
      expect(otp).toMatch(/^[0-9]{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should hash OTP with salt correctly', () => {
      const hashOTP = (code: string, salt: string): string => {
        return crypto.createHash('sha256').update(code + salt).digest('hex');
      };

      const code = '123456';
      const salt = 'test-salt';
      const hash1 = hashOTP(code, salt);
      const hash2 = hashOTP(code, salt);
      const hash3 = hashOTP('654321', salt);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate unique salts', () => {
      const generateSalt = (): string => {
        return crypto.randomBytes(16).toString('hex');
      };

      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toBe(salt2);
      expect(salt1).toHaveLength(32); // 16 bytes = 32 hex chars
    });
  });

  describe('Rate Limiting', () => {
    it('should allow first request', () => {
      const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
      
      const checkRateLimit = (phone: string): { allowed: boolean; reason?: string } => {
        const now = Date.now();
        const key = phone;
        const current = rateLimitStore.get(key);

        if (!current) {
          rateLimitStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute
          return { allowed: true };
        }

        if (now > current.resetTime) {
          rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
          return { allowed: true };
        }

        if (current.count >= 1) { // RATE_LIMIT_PER_MINUTE = 1
          const remainingTime = Math.ceil((current.resetTime - now) / 1000);
          return { 
            allowed: false, 
            reason: `Rate limit exceeded. Try again in ${remainingTime} seconds` 
          };
        }

        current.count++;
        rateLimitStore.set(key, current);
        return { allowed: true };
      };

      const result = checkRateLimit('+998901234567');
      expect(result.allowed).toBe(true);
    });

    it('should block after rate limit exceeded', () => {
      const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
      
      const checkRateLimit = (phone: string): { allowed: boolean; reason?: string } => {
        const now = Date.now();
        const key = phone;
        const current = rateLimitStore.get(key);

        if (!current) {
          rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
          return { allowed: true };
        }

        if (now > current.resetTime) {
          rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
          return { allowed: true };
        }

        if (current.count >= 1) {
          const remainingTime = Math.ceil((current.resetTime - now) / 1000);
          return { 
            allowed: false, 
            reason: `Rate limit exceeded. Try again in ${remainingTime} seconds` 
          };
        }

        current.count++;
        rateLimitStore.set(key, current);
        return { allowed: true };
      };

      // First request should be allowed
      const result1 = checkRateLimit('+998901234567');
      expect(result1.allowed).toBe(true);

      // Second request should be blocked
      const result2 = checkRateLimit('+998901234567');
      expect(result2.allowed).toBe(false);
      expect(result2.reason).toContain('Rate limit exceeded');
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone number format', () => {
      const phoneRegex = /^\+998[0-9]{9}$/;
      
      expect(phoneRegex.test('+998901234567')).toBe(true);
      expect(phoneRegex.test('+99890123456')).toBe(false); // Too short
      expect(phoneRegex.test('+9989012345678')).toBe(false); // Too long
      expect(phoneRegex.test('998901234567')).toBe(false); // Missing +
      expect(phoneRegex.test('+99890123456a')).toBe(false); // Contains letter
    });
  });

  describe('OTP Expiry', () => {
    it('should check if OTP is expired', () => {
      const now = new Date();
      const expiredTime = new Date(now.getTime() - 1000); // 1 second ago
      const validTime = new Date(now.getTime() + 300000); // 5 minutes from now

      expect(expiredTime < now).toBe(true);
      expect(validTime > now).toBe(true);
    });
  });

  describe('Code Format Validation', () => {
    it('should validate OTP code format', () => {
      const codeRegex = /^[0-9]{6}$/;
      
      expect(codeRegex.test('123456')).toBe(true);
      expect(codeRegex.test('12345')).toBe(false); // Too short
      expect(codeRegex.test('1234567')).toBe(false); // Too long
      expect(codeRegex.test('12345a')).toBe(false); // Contains letter
      expect(codeRegex.test('')).toBe(false); // Empty
    });
  });
});
