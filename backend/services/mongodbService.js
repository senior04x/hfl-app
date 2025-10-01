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
      const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/hfl_football_league';
      
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
      const otps = this.getCollection('otps');
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
      const otps = this.getCollection('otps');
      const otp = await otps.findOne({ phone: phone });
      return otp;
    } catch (error) {
      console.error('❌ Error getting OTP:', error);
      return null;
    }
  }

  async deleteOtp(phone) {
    try {
      const otps = this.getCollection('otps');
      await otps.deleteOne({ phone: phone });
      return true;
    } catch (error) {
      console.error('❌ Error deleting OTP:', error);
      return false;
    }
  }
}

// Export singleton instance
const mongoService = new MongoDBService();
module.exports = mongoService;
