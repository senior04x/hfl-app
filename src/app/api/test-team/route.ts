import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating test team...');

    const testTeamData = {
      name: 'Barcelona',
      foundedDate: '1899-11-29',
      logo: '',
      color: '#A50044',
      description: 'Futbol Club Barcelona',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'teams'), testTeamData);
    
    console.log('Test team created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      message: 'Test team created successfully',
      team: testTeamData
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating test team:', error);
    return NextResponse.json({ error: 'Failed to create test team' }, { status: 500 });
  }
}
