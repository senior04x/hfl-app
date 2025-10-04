const { MongoClient } = require('mongodb');
const DATABASE_CONFIG = require('../config/database');

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://hfl_user:HFL2023secure@cluster0.sqbtxra.mongodb.net/hfl_football_league?retryWrites=true&w=majority&appName=Cluster0';
      
      this.client = new MongoClient(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await this.client.connect();
      this.db = this.client.db(DATABASE_CONFIG.DATABASE_NAME);
      this.isConnected = true;
      
      // Create indexes for better performance
      await this.createIndexes();
      
      console.log('🗄️ MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async createIndexes() {
    try {
      // Create indexes for better performance
      for (const [collectionName, indexes] of Object.entries(DATABASE_CONFIG.INDEXES)) {
        const collection = this.db.collection(collectionName);
        for (const index of indexes) {
          await collection.createIndex(index);
        }
      }
      console.log('📊 Database indexes created');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        console.log('🗄️ MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ MongoDB disconnect error:', error);
    }
  }

  getCollection(collectionName) {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db.collection(collectionName);
  }

  // Player operations
  async getPlayerByPhone(phone) {
    try {
      const players = this.getCollection('players');
      const player = await players.findOne({ phone: phone });
      return player;
    } catch (error) {
      console.error('❌ Error getting player by phone:', error);
      return null;
    }
  }

  async createPlayer(playerData) {
    try {
      const players = this.getCollection('players');
      const result = await players.insertOne({
        ...playerData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: result.insertedId,
        ...playerData
      };
    } catch (error) {
      console.error('❌ Error creating player:', error);
      throw error;
    }
  }

  async updatePlayer(playerId, updateData) {
    try {
      const players = this.getCollection('players');
      const result = await players.updateOne(
        { _id: playerId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('❌ Error updating player:', error);
      return false;
    }
  }

  async getAllPlayers() {
    try {
      const players = this.getCollection('players');
      const result = await players.find({}).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting all players:', error);
      return [];
    }
  }

  // OTP operations
  async storeOtp(phone, otpData) {
    try {
      const otps = this.getCollection('otpSessions');
      await otps.replaceOne(
        { phone: phone },
        { phone, ...otpData },
        { upsert: true }
      );
      return true;
    } catch (error) {
      console.error('❌ Error storing OTP:', error);
      return false;
    }
  }

  async getOtp(phone) {
    try {
      const otps = this.getCollection('otpSessions');
      const otp = await otps.findOne({ phone: phone });
      return otp;
    } catch (error) {
      console.error('❌ Error getting OTP:', error);
      return null;
    }
  }

  async deleteOtp(phone) {
    try {
      const otps = this.getCollection('otpSessions');
      await otps.deleteOne({ phone: phone });
      return true;
    } catch (error) {
      console.error('❌ Error deleting OTP:', error);
      return false;
    }
  }

  // Team operations
  async getAllTeams() {
    try {
      const teams = this.getCollection('teams');
      const result = await teams.find({}).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting all teams:', error);
      return [];
    }
  }

  async getTeamById(teamId) {
    try {
      const teams = this.getCollection('teams');
      const team = await teams.findOne({ _id: teamId });
      return team;
    } catch (error) {
      console.error('❌ Error getting team by ID:', error);
      return null;
    }
  }

  // Match operations
  async getAllMatches() {
    try {
      const matches = this.getCollection('matches');
      const result = await matches.find({}).sort({ date: 1 }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting all matches:', error);
      return [];
    }
  }

  async getMatchesByStatus(status) {
    try {
      const matches = this.getCollection('matches');
      const result = await matches.find({ status: status }).sort({ date: 1 }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting matches by status:', error);
      return [];
    }
  }

  // Application operations
  async createApplication(applicationData) {
    try {
      const applications = this.getCollection('applications');
      const result = await applications.insertOne({
        ...applicationData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: result.insertedId,
        ...applicationData
      };
    } catch (error) {
      console.error('❌ Error creating application:', error);
      throw error;
    }
  }

  async getApplicationsByPhone(phone) {
    try {
      const applications = this.getCollection('applications');
      const result = await applications.find({ phone: phone }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting applications by phone:', error);
      return [];
    }
  }

  // Standings operations
  async getStandings() {
    try {
      const standings = this.getCollection('standings');
      const result = await standings.find({}).sort({ position: 1 }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting standings:', error);
      return [];
    }
  }

  // League operations
  async getAllLeagues() {
    try {
      const leagues = this.getCollection('leagues');
      const result = await leagues.find({}).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting all leagues:', error);
      return [];
    }
  }

  // Tournament operations
  async getAllTournaments() {
    try {
      const tournaments = this.getCollection('tournaments');
      const result = await tournaments.find({}).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting all tournaments:', error);
      return [];
    }
  }

  // Transfer methods
  async createPlayerTransfer(transferData) {
    try {
      const transfers = this.getCollection('playerTransfers');
      const result = await transfers.insertOne(transferData);
      return { success: true, data: { id: result.insertedId, ...transferData } };
    } catch (error) {
      console.error('❌ Error creating player transfer:', error);
      return { success: false, error: error.message };
    }
  }

  async createTeamTransfer(transferData) {
    try {
      const transfers = this.getCollection('teamTransfers');
      const result = await transfers.insertOne(transferData);
      return { success: true, data: { id: result.insertedId, ...transferData } };
    } catch (error) {
      console.error('❌ Error creating team transfer:', error);
      return { success: false, error: error.message };
    }
  }

  async getPlayerTransfers(playerId) {
    try {
      const transfers = this.getCollection('playerTransfers');
      const result = await transfers.find({ playerId }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting player transfers:', error);
      return [];
    }
  }

  async getTeamTransfers(teamId) {
    try {
      const transfers = this.getCollection('teamTransfers');
      const result = await transfers.find({ teamId }).toArray();
      return result;
    } catch (error) {
      console.error('❌ Error getting team transfers:', error);
      return [];
    }
  }

  async getAllTransfers() {
    try {
      const playerTransfers = this.getCollection('playerTransfers');
      const teamTransfers = this.getCollection('teamTransfers');
      
      const playerResults = await playerTransfers.find({}).toArray();
      const teamResults = await teamTransfers.find({}).toArray();
      
      return [...playerResults, ...teamResults];
    } catch (error) {
      console.error('❌ Error getting all transfers:', error);
      return [];
    }
  }

  async updateTransferStatus(transferId, status, adminNotes) {
    try {
      const { ObjectId } = require('mongodb');
      
      // Try player transfers first
      let transfers = this.getCollection('playerTransfers');
      let result = await transfers.updateOne(
        { _id: new ObjectId(transferId) },
        { $set: { status, adminNotes, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        // Try team transfers
        transfers = this.getCollection('teamTransfers');
        result = await transfers.updateOne(
          { _id: new ObjectId(transferId) },
          { $set: { status, adminNotes, updatedAt: new Date() } }
        );
      }

      if (result.matchedCount === 0) {
        return { success: false, error: 'Transfer not found' };
      }

      return { success: true, data: { transferId, status, adminNotes } };
    } catch (error) {
      console.error('❌ Error updating transfer status:', error);
      return { success: false, error: error.message };
    }
  }

  async cancelTransfer(transferId) {
    try {
      const { ObjectId } = require('mongodb');
      
      // Try player transfers first
      let transfers = this.getCollection('playerTransfers');
      let result = await transfers.deleteOne({ _id: new ObjectId(transferId) });

      if (result.deletedCount === 0) {
        // Try team transfers
        transfers = this.getCollection('teamTransfers');
        result = await transfers.deleteOne({ _id: new ObjectId(transferId) });
      }

      if (result.deletedCount === 0) {
        return { success: false, error: 'Transfer not found' };
      }

      return { success: true, data: { transferId } };
    } catch (error) {
      console.error('❌ Error canceling transfer:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const mongoService = new MongoDBService();
module.exports = mongoService;
