const NodeCache = require('node-cache');
const mongoService = require('./mongodbService');

// Cache for storing player data (1 hour TTL)
const playerCache = new NodeCache({ stdTTL: 3600 });

/**
 * Get player by phone number
 */
const getPlayerByPhone = async (phone) => {
  try {
    // Check cache first
    const cachedPlayer = playerCache.get(phone);
    if (cachedPlayer) {
      console.log(`👤 Player found in cache: ${phone}`);
      return cachedPlayer;
    }
    
    // Query MongoDB for player by phone
    const player = await mongoService.getPlayerByPhone(phone);
    
    if (!player) {
      console.log(`👤 Player not found for phone: ${phone}`);
      return null;
    }
    
    // Convert MongoDB _id to id for consistency
    const playerData = {
      id: player._id.toString(),
      ...player,
      _id: undefined
    };
    
    // Cache the player data
    playerCache.set(phone, playerData);
    console.log(`👤 Player found in MongoDB: ${playerData.firstName} ${playerData.lastName}`);
    return playerData;
    
  } catch (error) {
    console.error('❌ Error getting player by phone:', error);
    return null;
  }
};

/**
 * Create new player
 */
const createPlayer = async (playerData) => {
  try {
    // Create player in MongoDB
    const newPlayer = await mongoService.createPlayer(playerData);
    
    // Cache the new player
    playerCache.set(playerData.phone, newPlayer);
    
    console.log(`👤 New player created in MongoDB: ${newPlayer.id}`);
    return newPlayer;
    
  } catch (error) {
    console.error('❌ Error creating player:', error);
    throw error;
  }
};

/**
 * Create player session
 */
const createPlayerSession = async (playerData) => {
  try {
    const sessionData = {
      playerId: playerData.id,
      phone: playerData.phone,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    console.log(`🔐 Player session created: ${sessionData.sessionId}`);
    return sessionData;
    
  } catch (error) {
    console.error('❌ Error creating player session:', error);
    throw error;
  }
};

/**
 * Update player data
 */
const updatePlayer = async (playerId, updateData) => {
  try {
    // In a real application, you would update the database here
    console.log(`👤 Player updated: ${playerId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating player:', error);
    return false;
  }
};

/**
 * Get all players (for admin purposes)
 */
const getAllPlayers = async () => {
  try {
    // In a real application, you would query the database here
    const players = [
      {
        id: 'player_001',
        phone: '+998901234567',
        firstName: 'Ahmad',
        lastName: 'Karimov',
        position: 'Forward',
        number: '10',
        status: 'active'
      },
      {
        id: 'player_002',
        phone: '+998901234568',
        firstName: 'Sardor',
        lastName: 'Rahimov',
        position: 'Midfielder',
        number: '7',
        status: 'active'
      }
    ];
    
    return players;
    
  } catch (error) {
    console.error('❌ Error getting all players:', error);
    return [];
  }
};

module.exports = {
  getPlayerByPhone,
  createPlayer,
  createPlayerSession,
  updatePlayer,
  getAllPlayers
};
