import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/league-applications - Get all league applications
export async function GET() {
  try {
    const applicationsSnapshot = await getDocs(collection(db, 'leagueApplications'));
    const applications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching league applications:', error);
    return NextResponse.json({ error: 'Failed to fetch league applications' }, { status: 500 });
  }
}

// POST /api/league-applications - Create a new league application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, phone, teamId, teamName, photo, status = 'pending' } = body;

    if (!firstName || !lastName || !phone || !teamId || !teamName) {
      return NextResponse.json({ 
        error: 'firstName, lastName, phone, teamId, and teamName are required' 
      }, { status: 400 });
    }

    const applicationData = {
      firstName,
      lastName,
      phone,
      teamId,
      teamName,
      photo: photo || '',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'leagueApplications'), applicationData);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...applicationData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating league application:', error);
    return NextResponse.json({ error: 'Failed to create league application' }, { status: 500 });
  }
}

// PUT /api/league-applications - Update a league application
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, firstName, lastName, phone, teamId, teamName, photo, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const updateData = {
      firstName,
      lastName,
      phone,
      teamId,
      teamName,
      photo,
      status,
      updatedAt: new Date(),
    };

    await updateDoc(doc(db, 'leagueApplications', id), updateData);
    
    return NextResponse.json({ 
      id, 
      ...updateData 
    });
  } catch (error) {
    console.error('Error updating league application:', error);
    return NextResponse.json({ error: 'Failed to update league application' }, { status: 500 });
  }
}

// DELETE /api/league-applications - Delete a league application
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    await deleteDoc(doc(db, 'leagueApplications', id));
    
    return NextResponse.json({ message: 'League application deleted successfully' });
  } catch (error) {
    console.error('Error deleting league application:', error);
    return NextResponse.json({ error: 'Failed to delete league application' }, { status: 500 });
  }
}
