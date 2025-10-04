const express = require('express');
const router = express.Router();
const mongoService = require('../services/mongodbService');
const webSocketService = require('../services/websocketService');
const { validateStringLength } = require('../middleware/validation');

// Get all transfers (admin)
router.get('/', async (req, res) => {
  try {
    const transfers = await mongoService.getAllTransfers();
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit player transfer request
router.post('/player', validateStringLength('reason', 10, 500), async (req, res) => {
  try {
    const { playerId, currentTeamId, newTeamId, reason } = req.body;
    
    if (!playerId || !currentTeamId || !newTeamId || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    if (currentTeamId === newTeamId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current team and new team cannot be the same' 
      });
    }

    const transferData = {
      playerId,
      currentTeamId,
      newTeamId,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mongoService.createPlayerTransfer(transferData);
    
    if (result.success) {
      // Send real-time update
      await webSocketService.sendTransferUpdate(result.data.id, result.data);
      
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit team transfer request
router.post('/team', validateStringLength('reason', 10, 500), async (req, res) => {
  try {
    const { teamId, currentTournamentId, newTournamentId, reason } = req.body;
    
    if (!teamId || !currentTournamentId || !newTournamentId || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    if (currentTournamentId === newTournamentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current tournament and new tournament cannot be the same' 
      });
    }

    const transferData = {
      teamId,
      currentTournamentId,
      newTournamentId,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mongoService.createTeamTransfer(transferData);
    
    if (result.success) {
      // Send real-time update
      await webSocketService.sendTransferUpdate(result.data.id, result.data);
      
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get player transfers
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const transfers = await mongoService.getPlayerTransfers(playerId);
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get team transfers
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const transfers = await mongoService.getTeamTransfers(teamId);
    res.json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update transfer status (admin)
router.put('/:transferId', async (req, res) => {
  try {
    const { transferId } = req.params;
    const { status, adminNotes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status must be approved or rejected' 
      });
    }

    const result = await mongoService.updateTransferStatus(transferId, status, adminNotes);
    
    if (result.success) {
      // Send real-time update
      await webSocketService.sendTransferUpdate(transferId, result.data);
      
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel transfer
router.delete('/:transferId', async (req, res) => {
  try {
    const { transferId } = req.params;
    const result = await mongoService.cancelTransfer(transferId);
    
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
