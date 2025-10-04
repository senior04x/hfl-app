const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://hfl_user:HFL2023secure@cluster0.sqbtxra.mongodb.net/hfl_football_league?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔗 Testing MongoDB connection...');
console.log('URI:', uri);

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ MongoDB connected successfully!');
    
    // Test database
    const db = client.db('hfl_football_league');
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    // Test insert
    const testCollection = db.collection('test');
    const result = await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Test insert successful:', result.insertedId);
    
    // Clean up
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

testConnection();
