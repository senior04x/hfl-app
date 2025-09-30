import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/teams - Get all teams
export async function GET() {
  try {
    console.log('Fetching teams from Firebase...');
    
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    console.log('Teams snapshot size:', teamsSnapshot.size);
    
    if (teamsSnapshot.empty) {
      console.log('No teams found in Firebase');
      return NextResponse.json([]);
    }
    
    const teams = await Promise.all(teamsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      console.log('Team data:', doc.id, data);
      
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
      
      // Get players for this team
      const playersQuery = query(collection(db, 'players'), where('teamId', '==', doc.id));
      const playersSnapshot = await getDocs(playersQuery);
      const players = playersSnapshot.docs.map(playerDoc => ({
        id: playerDoc.id,
        ...playerDoc.data(),
        createdAt: safeToDate(playerDoc.data().createdAt),
        updatedAt: safeToDate(playerDoc.data().updatedAt),
      }));
      
      return {
        id: doc.id,
        ...data,
        players,
        createdAt: safeToDate(data.createdAt),
        updatedAt: safeToDate(data.updatedAt),
      };
    }));

    console.log('Teams fetched successfully:', teams.length);
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    console.error('Error details:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch teams',
      details: error.message 
    }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, foundedDate, logo, color } = body;

    if (!name || !foundedDate || !color) {
      return NextResponse.json({ error: 'Name, founded date and color are required' }, { status: 400 });
    }

    const teamData = {
      name,
      foundedDate,
      logo: logo || '',
      color,
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'teams'), teamData);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...teamData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}

// PUT /api/teams - Update a team
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, foundedDate, logo, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const updateData = {
      name,
      foundedDate,
      logo: logo || '',
      color,
      updatedAt: new Date(),
    };

    await updateDoc(doc(db, 'teams', id), updateData);
    
    return NextResponse.json({ 
      id, 
      ...updateData 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

// DELETE /api/teams - Delete a team
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'teams', id));
    
    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}