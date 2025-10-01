import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST /api/player-login - Player login with phone and password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json({ 
        error: 'Phone number and password are required' 
      }, { status: 400, headers: corsHeaders });
    }

    console.log('Player login request:', { phone, password });

    // Check if player exists in players collection
    const playersQuery = query(collection(db, 'players'), where('phone', '==', phone));
    const playersSnapshot = await getDocs(playersQuery);

    if (playersSnapshot.empty) {
      console.log('Player not found for phone:', phone);
      return NextResponse.json({ 
        error: 'Bu telefon raqami bilan ro\'yxatdan o\'tilgan o\'yinchi topilmadi' 
      }, { status: 404, headers: corsHeaders });
    }

    const playerDoc = playersSnapshot.docs[0];
    const playerData = playerDoc.data();
    
    console.log('Player found:', playerData);

    // Check password (simple check for now)
    if (playerData.password !== password) {
      console.log('Invalid password for player:', phone);
      return NextResponse.json({ 
        error: 'Noto\'g\'ri parol' 
      }, { status: 401, headers: corsHeaders });
    }

    console.log('Login successful for player:', playerData.firstName, playerData.lastName);
    
    return NextResponse.json({ 
      success: true,
      message: 'Login successful',
      playerId: playerDoc.id,
      player: {
        id: playerDoc.id,
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        phone: playerData.phone,
        teamName: playerData.teamName,
        status: playerData.status,
        position: playerData.position,
        number: playerData.number
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in player login:', error);
    return NextResponse.json({ 
      error: 'Player login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
}