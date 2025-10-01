// Test Player Data for Firestore
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const seedTestPlayer = async () => {
  try {
    console.log('Seeding test player data...');
    
    const testPlayer = {
      firstName: "John",
      lastName: "Doe",
      phone: "+998933786886",
      teamName: "Real Madrid",
      teamId: "team_123",
      position: "Forward",
      number: 10,
      goals: 15,
      assists: 8,
      yellowCards: 2,
      redCards: 0,
      matchesPlayed: 20,
      status: "active",
      password: "123456", // Simple password for testing
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add test player to Firestore
    const docRef = await addDoc(collection(db, 'players'), testPlayer);
    console.log('Test player added with ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...testPlayer
    };
    
  } catch (error) {
    console.error('Error seeding test player:', error);
    throw error;
  }
};

// Usage:
// Call this function to add test player to Firestore
// seedTestPlayer().then(player => console.log('Test player created:', player));

