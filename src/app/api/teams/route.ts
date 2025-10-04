import { NextRequest, NextResponse } from 'next/server';
import mongoService from '@/lib/mongodb';

// GET /api/teams - Get all teams
export async function GET() {
  try {
    console.log('Fetching teams from MongoDB...');
    
    await mongoService.connect();
    const teams = await mongoService.getTeams();
    
    console.log('Teams fetched successfully:', teams.length);
    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    console.error('Error details:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch teams',
      details: error.message 
    }, { status: 500 });
  } finally {
    await mongoService.disconnect();
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