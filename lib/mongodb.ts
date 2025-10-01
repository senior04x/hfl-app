// HFL Admin MongoDB Service
// Bitta MongoDB database, turli collections

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hfl_user:HFL2023secure@cluster0.sqbtxra.mongodb.net/hfl_football_league?retryWrites=true&w=majority&appName=Cluster0';
const DATABASE_NAME = 'hfl_football_league';

class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db(DATABASE_NAME);
      this.isConnected = true;
      
      console.log('🗄️ HFL Admin MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error('❌ HFL Admin MongoDB connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        console.log('🗄️ HFL Admin MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting MongoDB:', error);
    }
  }

  getCollection(name: string) {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db.collection(name);
  }

  // Player operations
  async getPlayers() {
    const playersCollection = this.getCollection('players');
    return playersCollection.find({}).toArray();
  }

  async getPlayerById(id: string) {
    const playersCollection = this.getCollection('players');
    return playersCollection.findOne({ _id: id });
  }

  async createPlayer(playerData: any) {
    const playersCollection = this.getCollection('players');
    const result = await playersCollection.insertOne({
      ...playerData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...playerData };
  }

  async updatePlayer(id: string, playerData: any) {
    const playersCollection = this.getCollection('players');
    const result = await playersCollection.updateOne(
      { _id: id },
      { $set: { ...playerData, updatedAt: new Date() } }
    );
    return result;
  }

  async deletePlayer(id: string) {
    const playersCollection = this.getCollection('players');
    return playersCollection.deleteOne({ _id: id });
  }

  // Team operations
  async getTeams() {
    const teamsCollection = this.getCollection('teams');
    return teamsCollection.find({}).toArray();
  }

  async getTeamById(id: string) {
    const teamsCollection = this.getCollection('teams');
    return teamsCollection.findOne({ _id: id });
  }

  async createTeam(teamData: any) {
    const teamsCollection = this.getCollection('teams');
    const result = await teamsCollection.insertOne({
      ...teamData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...teamData };
  }

  async updateTeam(id: string, teamData: any) {
    const teamsCollection = this.getCollection('teams');
    const result = await teamsCollection.updateOne(
      { _id: id },
      { $set: { ...teamData, updatedAt: new Date() } }
    );
    return result;
  }

  async deleteTeam(id: string) {
    const teamsCollection = this.getCollection('teams');
    return teamsCollection.deleteOne({ _id: id });
  }

  // Match operations
  async getMatches() {
    const matchesCollection = this.getCollection('matches');
    return matchesCollection.find({}).toArray();
  }

  async getMatchById(id: string) {
    const matchesCollection = this.getCollection('matches');
    return matchesCollection.findOne({ _id: id });
  }

  async createMatch(matchData: any) {
    const matchesCollection = this.getCollection('matches');
    const result = await matchesCollection.insertOne({
      ...matchData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...matchData };
  }

  async updateMatch(id: string, matchData: any) {
    const matchesCollection = this.getCollection('matches');
    const result = await matchesCollection.updateOne(
      { _id: id },
      { $set: { ...matchData, updatedAt: new Date() } }
    );
    return result;
  }

  async deleteMatch(id: string) {
    const matchesCollection = this.getCollection('matches');
    return matchesCollection.deleteOne({ _id: id });
  }

  // Season operations
  async getSeasons() {
    const seasonsCollection = this.getCollection('seasons');
    return seasonsCollection.find({}).toArray();
  }

  async getSeasonById(id: string) {
    const seasonsCollection = this.getCollection('seasons');
    return seasonsCollection.findOne({ _id: id });
  }

  async createSeason(seasonData: any) {
    const seasonsCollection = this.getCollection('seasons');
    const result = await seasonsCollection.insertOne({
      ...seasonData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...seasonData };
  }

  async updateSeason(id: string, seasonData: any) {
    const seasonsCollection = this.getCollection('seasons');
    const result = await seasonsCollection.updateOne(
      { _id: id },
      { $set: { ...seasonData, updatedAt: new Date() } }
    );
    return result;
  }

  async deleteSeason(id: string) {
    const seasonsCollection = this.getCollection('seasons');
    return seasonsCollection.deleteOne({ _id: id });
  }

  // Application operations
  async getApplications() {
    const applicationsCollection = this.getCollection('leagueApplications');
    return applicationsCollection.find({}).toArray();
  }

  async getApplicationById(id: string) {
    const applicationsCollection = this.getCollection('leagueApplications');
    return applicationsCollection.findOne({ _id: id });
  }

  async createApplication(applicationData: any) {
    const applicationsCollection = this.getCollection('leagueApplications');
    const result = await applicationsCollection.insertOne({
      ...applicationData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { _id: result.insertedId, ...applicationData };
  }

  async updateApplication(id: string, applicationData: any) {
    const applicationsCollection = this.getCollection('leagueApplications');
    const result = await applicationsCollection.updateOne(
      { _id: id },
      { $set: { ...applicationData, updatedAt: new Date() } }
    );
    return result;
  }

  async deleteApplication(id: string) {
    const applicationsCollection = this.getCollection('leagueApplications');
    return applicationsCollection.deleteOne({ _id: id });
  }
}

export const mongoService = new MongoDBService();
export default mongoService;
