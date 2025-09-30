import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/players - Get all players
export async function GET() {
  try {
    console.log('Fetching players from Firebase...');
    
    const playersSnapshot = await getDocs(collection(db, 'players'));
    console.log('Players snapshot size:', playersSnapshot.size);
    
    if (playersSnapshot.empty) {
      console.log('No players found in Firebase');
      return NextResponse.json([]);
    }
    
    const players = playersSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Player data:', doc.id, data);
      
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
      
      return {
        id: doc.id,
        ...data,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      };
    });

    console.log('Players fetched successfully:', players.length);
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    console.error('Error details:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch players',
      details: error.message 
    }, { status: 500 });
  }
}

// POST /api/players - Create a new player
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      phone, 
      photo, 
      teamId, 
      teamName,
      position,
      number,
      status = 'active'
    } = body;

    if (!firstName || !lastName || !phone || !teamId) {
      return NextResponse.json({ 
        error: 'First name, last name, phone and team ID are required' 
      }, { status: 400 });
    }

    const playerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      photo: photo || '',
      teamId,
      teamName: teamName || '',
      position: position || '',
      number: number || 0,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'players'), playerData);
    
    console.log('Player created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...playerData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}

// PUT /api/players - Update player
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      firstName, 
      lastName, 
      phone, 
      photo, 
      teamId, 
      teamName,
      position,
      number,
      status
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    const updateData = {
      ...(firstName && { firstName: firstName.trim() }),
      ...(lastName && { lastName: lastName.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(photo !== undefined && { photo }),
      ...(teamId && { teamId }),
      ...(teamName && { teamName }),
      ...(position !== undefined && { position }),
      ...(number !== undefined && { number }),
      ...(status && { status }),
      updatedAt: new Date(),
    };

    await updateDoc(doc(db, 'players', id), updateData);
    
    return NextResponse.json({ 
      id, 
      ...updateData 
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}

// DELETE /api/players - Delete player
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'players', id));
    
    return NextResponse.json({ 
      message: 'Player deleted successfully',
      id 
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}