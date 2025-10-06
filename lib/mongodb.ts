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
        this.client = null;
        this.db = null;
        this.isConnected = false;
        console.log('🔌 MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting MongoDB:', error);
    }
  }

  // Teams methods
  async getTeams() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('teams').find({}).toArray();
  }

  async getTeamById(id: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('teams').findOne({ _id: id });
  }

  async createTeam(teamData: any) {
    if (!this.db) throw new Error('Database not connected');
    const result = await this.db.collection('teams').insertOne({
      ...teamData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { ...teamData, _id: result.insertedId };
  }

  async updateTeam(id: string, updateData: any) {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection('teams').updateOne(
      { _id: id },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return await this.getTeamById(id);
  }

  async deleteTeam(id: string) {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection('teams').deleteOne({ _id: id });
    return true;
  }

  // Players methods
  async getPlayers() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('players').find({}).toArray();
  }

  async getPlayerById(id: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('players').findOne({ _id: id });
  }

  async createPlayer(playerData: any) {
    if (!this.db) throw new Error('Database not connected');
    const result = await this.db.collection('players').insertOne({
      ...playerData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { ...playerData, _id: result.insertedId };
  }

  async updatePlayer(id: string, updateData: any) {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection('players').updateOne(
      { _id: id },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return await this.getPlayerById(id);
  }

  async deletePlayer(id: string) {
    if (!this.db) throw new Error('Database not connected');
    await this.db.collection('players').deleteOne({ _id: id });
    return true;
  }

  // Matches methods
  async getMatches() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('matches').find({}).toArray();
  }

  async getMatchesByStatus(status: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('matches').find({ status }).toArray();
  }

  // Standings methods
  async getStandings() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('standings').find({}).toArray();
  }

  // Applications methods
  async createApplication(applicationData: any) {
    if (!this.db) throw new Error('Database not connected');
    const result = await this.db.collection('leagueApplications').insertOne({
      ...applicationData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { ...applicationData, _id: result.insertedId };
  }

  async getApplicationsByPhone(phone: string) {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('leagueApplications').find({ contactPhone: phone }).toArray();
  }

  // Leagues methods
  async getLeagues() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('leagues').find({}).toArray();
  }

  // Tournaments methods
  async getTournaments() {
    if (!this.db) throw new Error('Database not connected');
    return await this.db.collection('tournaments').find({}).toArray();
  }
}

const mongoService = new MongoDBService();
export default mongoService;