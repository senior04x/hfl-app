const express = require('express');
const router = express.Router();
const mongoService = require('../services/mongodbService');

// Teams API
router.get('/teams', async (req, res) => {
  try {
    const teams = await mongoService.getAllTeams();
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Jamoalar yuklanmadi'
    });
  }
});

// Get team by ID
router.get('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const team = await mongoService.getTeamById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Jamoa topilmadi'
      });
    }
    
    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Jamoa yuklanmadi'
    });
  }
});

// Duplicate route removed - already handled above

// Matches API
router.get('/matches', async (req, res) => {
  try {
    const { status } = req.query;
    let matches;
    
    if (status) {
      matches = await mongoService.getMatchesByStatus(status);
    } else {
      matches = await mongoService.getAllMatches();
    }
    
    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'O\'yinlar yuklanmadi'
    });
  }
});

// Players API
router.get('/players', async (req, res) => {
  try {
    const players = await mongoService.getAllPlayers();
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'O\'yinchilar yuklanmadi'
    });
  }
});

// Standings API
router.get('/standings', async (req, res) => {
  try {
    const standings = await mongoService.getStandings();
    res.json({
      success: true,
      data: standings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Reytinglar yuklanmadi'
    });
  }
});

// Leagues API
router.get('/leagues', async (req, res) => {
  try {
    const leagues = await mongoService.getAllLeagues();
    res.json({
      success: true,
      data: leagues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ligalar yuklanmadi'
    });
  }
});

// Tournaments API
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await mongoService.getAllTournaments();
    res.json({
      success: true,
      data: tournaments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Turnirlar yuklanmadi'
    });
  }
});

// Applications API
router.post('/applications', async (req, res) => {
  try {
    const applicationData = req.body;
    const application = await mongoService.createApplication(applicationData);
    
    res.status(201).json({
      success: true,
      data: application,
      message: 'Ariza muvaffaqiyatli yuborildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ariza yuborilmadi'
    });
  }
});

router.get('/applications/:phone', async (req, res) => {
  try {
    const applications = await mongoService.getApplicationsByPhone(req.params.phone);
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Arizalar yuklanmadi'
    });
  }
});

module.exports = router;
