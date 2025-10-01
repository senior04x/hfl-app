import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// OTP configuration
const OTP_CONFIG = {
  TTL_SECONDS: parseInt(process.env.OTP_TTL_SECONDS || '300'), // 5 minutes
  RATE_LIMIT_PER_MINUTE: parseInt(process.env.OTP_RATE_LIMIT_PER_MINUTE || '1'),
  RATE_LIMIT_PER_DAY: parseInt(process.env.OTP_RATE_LIMIT_PER_DAY || '10'),
  MAX_ATTEMPTS: 3,
  BLOCK_DURATION_MINUTES: 15,
};

// Eskiz API configuration
const ESKIZ_CONFIG = {
  EMAIL: process.env.ESKIZ_EMAIL || 'gcccc406@gmail.com',
  PASSWORD: process.env.ESKIZ_PASSWORD || 'DcPU5pJr9TkkDQYzUV4PmY3ljyqWYJZjRLwKut1f',
  FROM: process.env.ESKIZ_FROM || '4546',
  LOGIN_URL: process.env.ESKIZ_LOGIN_URL || 'https://notify.eskiz.uz/api/auth/login',
  SEND_URL: process.env.ESKIZ_API_URL || 'https://notify.eskiz.uz/api/message/sms/send',
};

// Generate 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP code with salt
function hashOTP(code: string, salt: string): string {
  return crypto.createHash('sha256').update(code + salt).digest('hex');
}

// Generate salt
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Check rate limiting
function checkRateLimit(phone: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = phone;
  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute
    return { allowed: true };
  }

  // Check if reset time has passed
  if (now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return { allowed: true };
  }

  // Check minute limit
  if (current.count >= OTP_CONFIG.RATE_LIMIT_PER_MINUTE) {
    const remainingTime = Math.ceil((current.resetTime - now) / 1000);
    return { 
      allowed: false, 
      reason: `Rate limit exceeded. Try again in ${remainingTime} seconds` 
    };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);
  return { allowed: true };
}

// Get Eskiz API token
async function getEskizToken(): Promise<string> {
  try {
    const response = await fetch(ESKIZ_CONFIG.LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ESKIZ_CONFIG.EMAIL,
        password: ESKIZ_CONFIG.PASSWORD,
      }),
    });

    const data = await response.json();
    
    if (!data.token) {
      throw new Error('Failed to get Eskiz token');
    }

    return data.token;
  } catch (error) {
    console.error('Error getting Eskiz token:', error);
    throw new Error('SMS service unavailable');
  }
}

// Send SMS via Eskiz
async function sendSMS(phone: string, message: string): Promise<void> {
  try {
    const token = await getEskizToken();
    
    // Use form-data format as shown in the API documentation
    const formData = new URLSearchParams();
    formData.append('mobile_phone', phone);
    formData.append('message', message);
    formData.append('from', ESKIZ_CONFIG.FROM);
    
    const response = await fetch(ESKIZ_CONFIG.SEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    console.log('SMS API Response:', data);
    
    if (data.status === 'waiting' || data.id) {
      console.log('SMS sent successfully:', data.id);
    } else {
      throw new Error('Failed to send SMS: ' + (data.message || 'Unknown error'));
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    throw new Error('Failed to send SMS: ' + (error?.message || 'Unknown error'));
  }
}

// Request OTP endpoint
export const requestOTP = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ success: false, error: 'Phone number is required' });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+998[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400).json({ success: false, error: 'Invalid phone number format' });
      return;
    }

    // Check rate limiting
    const rateLimit = checkRateLimit(phone);
    if (!rateLimit.allowed) {
      res.status(429).json({ success: false, error: rateLimit.reason });
      return;
    }

    // Check if phone is blocked
    const blockedDoc = await db.collection('blockedPhones').doc(phone).get();
    if (blockedDoc.exists) {
      const blockedData = blockedDoc.data();
      const blockExpiry = blockedData?.blockedUntil?.toDate();
      
      if (blockExpiry && blockExpiry > new Date()) {
        const remainingMinutes = Math.ceil((blockExpiry.getTime() - Date.now()) / 60000);
        res.status(423).json({ 
          success: false, 
          error: `Phone is blocked. Try again in ${remainingMinutes} minutes` 
        });
        return;
      }
    }

    // Generate OTP
    const code = generateOTP();
    const salt = generateSalt();
    const codeHash = hashOTP(code, salt);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.TTL_SECONDS * 1000);

    // Store OTP in Firestore
    await db.collection('otps').doc(phone).set({
      codeHash,
      salt,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    // Send SMS
    const message = `Sizning tasdiqlash kodingiz: ${code}. Kod ${OTP_CONFIG.TTL_SECONDS / 60} daqiqa amal qiladi.`;
    await sendSMS(phone, message);

    console.log(`OTP sent to ${phone}`);

    res.json({ 
      success: true, 
      ttl: OTP_CONFIG.TTL_SECONDS,
      message: 'OTP sent successfully'
    });

  } catch (error: any) {
    console.error('Error in requestOTP:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Verify OTP endpoint
export const verifyOTP = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({ success: false, error: 'Phone number and code are required' });
      return;
    }

    // Validate code format
    if (!/^[0-9]{6}$/.test(code)) {
      res.status(400).json({ success: false, error: 'Invalid code format' });
      return;
    }

    // Get OTP document
    const otpDoc = await db.collection('otps').doc(phone).get();
    
    if (!otpDoc.exists) {
      res.status(404).json({ success: false, error: 'OTP not found or expired' });
      return;
    }

    const otpData = otpDoc.data();
    const { codeHash, salt, attempts, expiresAt } = otpData!;

    // Check if OTP is expired
    if (expiresAt.toDate() < new Date()) {
      await db.collection('otps').doc(phone).delete();
      res.status(410).json({ success: false, error: 'OTP expired' });
      return;
    }

    // Check attempts
    if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      // Block phone for 15 minutes
      const blockedUntil = new Date(Date.now() + OTP_CONFIG.BLOCK_DURATION_MINUTES * 60 * 1000);
      await db.collection('blockedPhones').doc(phone).set({
        blockedUntil: admin.firestore.Timestamp.fromDate(blockedUntil),
        reason: 'Too many failed attempts',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Delete OTP
      await db.collection('otps').doc(phone).delete();

      res.status(423).json({ 
        success: false, 
        error: 'Too many failed attempts. Phone blocked for 15 minutes' 
      });
      return;
    }

    // Verify code
    const providedHash = hashOTP(code, salt);
    if (providedHash !== codeHash) {
      // Increment attempts
      await db.collection('otps').doc(phone).update({
        attempts: admin.firestore.FieldValue.increment(1)
      });

      res.status(401).json({ 
        success: false, 
        error: 'Invalid code',
        remainingAttempts: OTP_CONFIG.MAX_ATTEMPTS - attempts - 1
      });
      return;
    }

    // OTP is valid - delete it
    await db.collection('otps').doc(phone).delete();

    // Check if user exists in players collection
    const playersQuery = db.collection('players').where('phone', '==', phone);
    const playersSnapshot = await playersQuery.get();

    let playerData;
    let playerId;

    if (playersSnapshot.empty) {
      // Create new player
      const newPlayerRef = await db.collection('players').add({
        phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
      });
      
      playerId = newPlayerRef.id;
      playerData = {
        id: playerId,
        phone,
        status: 'active',
        createdAt: new Date(),
        lastLogin: new Date(),
      };
    } else {
      // Get existing player
      const playerDoc = playersSnapshot.docs[0];
      playerId = playerDoc.id;
      const existingData = playerDoc.data();
      
      // Update last login
      await db.collection('players').doc(playerId).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });

      playerData = {
        id: playerId,
        ...existingData,
        lastLogin: new Date(),
      };
    }

    console.log(`OTP verified for ${phone}, player: ${playerId}`);

    res.json({ 
      success: true, 
      player: playerData,
      message: 'OTP verified successfully'
    });

  } catch (error: any) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Cleanup expired OTPs (run every hour)
export const cleanupExpiredOTPs = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const expiredOTPs = await db.collection('otps')
        .where('expiresAt', '<', now)
        .get();

      const batch = db.batch();
      expiredOTPs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Cleaned up ${expiredOTPs.size} expired OTPs`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  });
