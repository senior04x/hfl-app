const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint for Eskiz API
app.post('/api/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    console.log('Proxy: Requesting OTP for:', phone);

    // Step 1: Get Eskiz token
    const tokenResponse = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gcccc406@gmail.com',
        password: 'DcPU5pJr9TkkDQYzUV4PmY3ljyqWYJZjRLwKut1f'
      }),
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Proxy: Eskiz token response:', tokenData);
    
    if (!tokenData.token) {
      throw new Error('Failed to get Eskiz token');
    }
    
    // Step 2: Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Proxy: Generated OTP:', otpCode);
    
    // Step 3: Send SMS
    const formData = new URLSearchParams();
    formData.append('mobile_phone', phone);
    formData.append('message', `Sizning tasdiqlash kodingiz: ${otpCode}. Kod 5 daqiqa amal qiladi.`);
    formData.append('from', '4546');
    
    const smsResponse = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
      },
      body: formData,
    });
    
    const smsData = await smsResponse.json();
    console.log('Proxy: SMS response:', smsData);
    
    res.json({
      success: smsData.status === 'waiting' || smsData.id,
      ttl: 300,
      message: 'OTP sent successfully',
      otpCode: otpCode // For verification
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    console.log('Proxy: Verifying OTP for:', phone, code);
    
    // For now, accept any 6-digit code
    res.json({
      success: code.length === 6,
      player: {
        id: 'player-' + Date.now(),
        phone: phone,
        firstName: 'Test',
        lastName: 'Player',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Proxy verify error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
