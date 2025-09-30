import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/players/[id] - Get a single player by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    console.log('Fetching player with ID:', id);

    // Get player document from Firebase
    const playerDoc = await getDoc(doc(db, 'players', id));
    
    if (!playerDoc.exists()) {
      console.log('Player not found for ID:', id);
      return NextResponse.json({ 
        error: 'Player not found' 
      }, { status: 404 });
    }

    const playerData = playerDoc.data();
    console.log('Player data found:', playerData);

    // Safely handle timestamp conversion
    const safeToDate = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      return new Date();
    };

    const player = {
      id: playerDoc.id,
      firstName: playerData.firstName || '',
      lastName: playerData.lastName || '',
      phone: playerData.phone || '',
      password: playerData.password || '',
      email: playerData.email || '',
      photo: playerData.photo || '',
      teamId: playerData.teamId || '',
      teamName: playerData.teamName || '',
      position: playerData.position || '',
      number: playerData.number || 0,
      goals: playerData.goals || 0,
      assists: playerData.assists || 0,
      yellowCards: playerData.yellowCards || 0,
      redCards: playerData.redCards || 0,
      matchesPlayed: playerData.matchesPlayed || 0,
      status: playerData.status || 'active',
      createdAt: safeToDate(playerData.createdAt),
      updatedAt: safeToDate(playerData.updatedAt),
    };

    console.log('Processed player data:', player);
    return NextResponse.json(player);

  } catch (error) {
    console.error('Error getting player:', error);
    return NextResponse.json({ 
      error: 'Failed to get player',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
