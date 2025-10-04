import { NextRequest, NextResponse } from 'next/server';
import mongoService from '@/lib/mongodb';

// GET /api/teams/[id] - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Fetching team by ID from MongoDB:', id);
    
    await mongoService.connect();
    const team = await mongoService.getTeamById(id);
    
    if (!team) {
      return NextResponse.json({ 
        error: 'Team not found' 
      }, { status: 404 });
    }
    
    console.log('Team fetched successfully:', team);
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    console.error('Error details:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch team',
      details: error.message 
    }, { status: 500 });
  } finally {
    await mongoService.disconnect();
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('Updating team:', id, body);
    
    await mongoService.connect();
    const result = await mongoService.updateTeam(id, body);
    
    console.log('Team updated successfully:', result);
    return NextResponse.json({ 
      success: true,
      message: 'Team updated successfully' 
    });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ 
      error: 'Failed to update team',
      details: error.message 
    }, { status: 500 });
  } finally {
    await mongoService.disconnect();
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('Deleting team:', id);
    
    await mongoService.connect();
    const result = await mongoService.deleteTeam(id);
    
    console.log('Team deleted successfully:', result);
    return NextResponse.json({ 
      success: true,
      message: 'Team deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ 
      error: 'Failed to delete team',
      details: error.message 
    }, { status: 500 });
  } finally {
    await mongoService.disconnect();
  }
}
