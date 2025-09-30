import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/player-verify - Verify player code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, playerId } = body;

    if (!phone || !code) {
      return NextResponse.json({ 
        error: 'Phone number and verification code are required' 
      }, { status: 400 });
    }

    console.log('Player verification request:', { phone, code, playerId });

    // In production, verify the code from SMS service
    // For now, we'll accept any 6-digit code for testing
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ 
        error: 'Tasdiqlash kodi 6 ta raqamdan iborat bo\'lishi kerak' 
      }, { status: 400 });
    }

    // Check if player exists
    const playersQuery = query(collection(db, 'players'), where('phone', '==', phone));
    const playersSnapshot = await getDocs(playersQuery);

    if (playersSnapshot.empty) {
      console.log('Player not found for phone:', phone);
      return NextResponse.json({ 
        error: 'Bu telefon raqami bilan ro\'yxatdan o\'tilgan o\'yinchi topilmadi' 
      }, { status: 404 });
    }

    const playerDoc = playersSnapshot.docs[0];
    const playerData = playerDoc.data();
    
    console.log('Player verification successful:', playerData);

    return NextResponse.json({ 
      success: true,
      message: 'Tasdiqlash muvaffaqiyatli',
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
    });

  } catch (error) {
    console.error('Error in player verification:', error);
    return NextResponse.json({ 
      error: 'Player verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
