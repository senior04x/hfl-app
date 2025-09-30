import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/test-setup - Create test data
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test data yaratilmoqda...');

    // Test team yaratish
    const teamData = {
      name: "Barcelona",
      color: "#0000FF",
      description: "Spanish football club",
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const teamRef = await addDoc(collection(db, 'teams'), teamData);
    console.log('✅ Test team yaratildi:', teamRef.id);

    // Test player yaratish
    const playerData = {
      firstName: "Ahmad",
      lastName: "Karimov",
      phone: "+998901234567",
      email: "ahmad@example.com",
      photo: "",
      teamId: teamRef.id,
      teamName: "Barcelona",
      position: "ST",
      number: 10,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchesPlayed: 0,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const playerRef = await addDoc(collection(db, 'players'), playerData);
    console.log('✅ Test player yaratildi:', playerRef.id);

    return NextResponse.json({ 
      success: true,
      message: 'Test data yaratildi',
      teamId: teamRef.id,
      playerId: playerRef.id,
      testPhone: "+998901234567"
    });

  } catch (error) {
    console.error('❌ Test data yaratishda xatolik:', error);
    return NextResponse.json({ 
      error: 'Test data yaratishda xatolik',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
