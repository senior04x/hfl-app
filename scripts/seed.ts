#!/usr/bin/env tsx

import { seedDatabase, getMockData } from '../src/utils/seedData';

async function main() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check if Firebase is configured
    const hasFirebaseConfig = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID && 
                             process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== 'your_project_id';
    
    if (!hasFirebaseConfig) {
      console.log('⚠️  Firebase not configured. Using mock data for development.');
      const mockData = getMockData();
      console.log('📊 Mock data generated:');
      console.log(`   - ${mockData.teams.length} teams`);
      console.log(`   - ${mockData.matches.length} matches`);
      console.log('✅ Mock data is ready for development!');
      return;
    }
    
    await seedDatabase();
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
