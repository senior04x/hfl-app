import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating test player...');

    const testPlayerData = {
      firstName: 'Ahmad',
      lastName: 'Karimov',
      phone: '+998901234567',
      password: '123456',
      email: 'ahmad@example.com',
      photo: '',
      teamId: 'test-team-1',
      teamName: 'Barcelona',
      position: 'FWD',
      number: 10,
      goals: 5,
      assists: 3,
      yellowCards: 1,
      redCards: 0,
      matchesPlayed: 8,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'players'), testPlayerData);
    
    console.log('Test player created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      message: 'Test player created successfully',
      player: testPlayerData
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating test player:', error);
    return NextResponse.json({ error: 'Failed to create test player' }, { status: 500 });
  }
}
