const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://hfl_user:HFL2023secure@cluster0.sqbtxra.mongodb.net/hfl_football_league?retryWrites=true&w=majority&appName=Cluster0';

const seedData = async () => {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hfl_football_league');
    
    console.log('🌱 Seeding test data...');

    // Test Teams
    const teams = [
      {
        name: 'Real Madrid',
        logo: 'https://example.com/real-madrid.png',
        league: 'La Liga',
        founded: 1902,
        city: 'Madrid',
        country: 'Spain'
      },
      {
        name: 'Barcelona',
        logo: 'https://example.com/barcelona.png',
        league: 'La Liga',
        founded: 1899,
        city: 'Barcelona',
        country: 'Spain'
      },
      {
        name: 'Manchester United',
        logo: 'https://example.com/manchester-united.png',
        league: 'Premier League',
        founded: 1878,
        city: 'Manchester',
        country: 'England'
      }
    ];

    // Test Matches
    const matches = [
      {
        team1: 'Real Madrid',
        team2: 'Barcelona',
        date: new Date('2024-01-15T15:00:00Z'),
        status: 'upcoming',
        league: 'La Liga',
        venue: 'Santiago Bernabeu'
      },
      {
        team1: 'Manchester United',
        team2: 'Liverpool',
        date: new Date('2024-01-20T17:30:00Z'),
        status: 'live',
        league: 'Premier League',
        venue: 'Old Trafford'
      },
      {
        team1: 'Real Madrid',
        team2: 'Atletico Madrid',
        date: new Date('2024-01-10T20:00:00Z'),
        status: 'finished',
        league: 'La Liga',
        venue: 'Santiago Bernabeu',
        score1: 2,
        score2: 1
      }
    ];

    // Test Players
    const players = [
      {
        name: 'Cristiano Ronaldo',
        phone: '+998901234567',
        position: 'Forward',
        team: 'Real Madrid',
        age: 38,
        nationality: 'Portugal'
      },
      {
        name: 'Lionel Messi',
        phone: '+998901234568',
        position: 'Forward',
        team: 'Barcelona',
        age: 36,
        nationality: 'Argentina'
      },
      {
        name: 'Bruno Fernandes',
        phone: '+998901234569',
        position: 'Midfielder',
        team: 'Manchester United',
        age: 29,
        nationality: 'Portugal'
      }
    ];

    // Test Leagues
    const leagues = [
      {
        name: 'La Liga',
        country: 'Spain',
        season: '2023-24',
        teams: 20
      },
      {
        name: 'Premier League',
        country: 'England',
        season: '2023-24',
        teams: 20
      }
    ];

    // Test Tournaments
    const tournaments = [
      {
        name: 'Champions League',
        season: '2023-24',
        startDate: new Date('2023-09-01'),
        endDate: new Date('2024-06-01'),
        teams: 32
      },
      {
        name: 'Europa League',
        season: '2023-24',
        startDate: new Date('2023-09-01'),
        endDate: new Date('2024-05-01'),
        teams: 48
      }
    ];

    // Insert data
    console.log('📝 Inserting teams...');
    for (const team of teams) {
      await db.collection('teams').insertOne({
        ...team,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('📝 Inserting matches...');
    for (const match of matches) {
      await db.collection('matches').insertOne({
        ...match,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('📝 Inserting players...');
    for (const player of players) {
      await db.collection('players').insertOne({
        ...player,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('📝 Inserting leagues...');
    for (const league of leagues) {
      await db.collection('leagues').insertOne({
        ...league,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('📝 Inserting tournaments...');
    for (const tournament of tournaments) {
      await db.collection('tournaments').insertOne({
        ...tournament,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    console.log('✅ Test data seeded successfully!');
    console.log(`📊 Teams: ${teams.length}`);
    console.log(`📊 Matches: ${matches.length}`);
    console.log(`📊 Players: ${players.length}`);
    console.log(`📊 Leagues: ${leagues.length}`);
    console.log(`📊 Tournaments: ${tournaments.length}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.close();
  }
};

// Run if called directly
if (require.main === module) {
  seedData().then(() => {
    console.log('🎉 Seeding completed!');
    process.exit(0);
  });
}

module.exports = seedData;
