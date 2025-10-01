// HFL Database Configuration
// Bitta MongoDB database, turli collections

const DATABASE_CONFIG = {
  // Database name
  DATABASE_NAME: 'hfl_football_league',
  
  // Collections structure
  COLLECTIONS: {
    // Players (hfl-mobile dan)
    PLAYERS: 'players',
    
    // Admins (hfl-admin dan) 
    ADMINS: 'admins',
    
    // Teams
    TEAMS: 'teams',
    
    // Matches
    MATCHES: 'matches',
    
    // League Applications
    LEAGUE_APPLICATIONS: 'leagueApplications',
    
    // OTP Sessions (temporary)
    OTP_SESSIONS: 'otp_sessions',
    
    // User Sessions
    USER_SESSIONS: 'user_sessions',
    
    // Notifications
    NOTIFICATIONS: 'notifications',
    
    // Settings
    SETTINGS: 'settings'
  },
  
  // Indexes for better performance
  INDEXES: {
    PLAYERS: [
      { phone: 1 },
      { email: 1 },
      { teamId: 1 },
      { status: 1 }
    ],
    ADMINS: [
      { email: 1 },
      { role: 1 },
      { isActive: 1 }
    ],
    MATCHES: [
      { date: 1 },
      { team1Id: 1 },
      { team2Id: 1 },
      { status: 1 }
    ],
    OTP_SESSIONS: [
      { phone: 1 },
      { expiresAt: 1 }
    ]
  }
};

module.exports = DATABASE_CONFIG;
