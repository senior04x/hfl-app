const express = require('express');
const router = express.Router();
const mongoService = require('../services/mongodbService');

// Register device for push notifications
router.post('/register', async (req, res) => {
  try {
    const { token, userId, platform, deviceId } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Push token is required' 
      });
    }

    const deviceData = {
      token,
      userId: userId || null,
      platform: platform || 'unknown',
      deviceId: deviceId || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store device token in database
    const result = await mongoService.registerDeviceToken(deviceData);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unregister device
router.delete('/unregister/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await mongoService.unregisterDeviceToken(token);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get device tokens for user
router.get('/tokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokens = await mongoService.getDeviceTokens(userId);
    res.json({ success: true, data: tokens });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send notification to specific user
router.post('/send/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and body are required' 
      });
    }

    const result = await mongoService.sendNotificationToUser(userId, {
      title,
      body,
      data: data || {},
    });
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send notification to all users
router.post('/broadcast', async (req, res) => {
  try {
    const { title, body, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and body are required' 
      });
    }

    const result = await mongoService.broadcastNotification({
      title,
      body,
      data: data || {},
    });
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
